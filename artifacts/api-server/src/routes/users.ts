import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, users, workoutSessions, foodEntries, runSessions, insertUserSchema, profilePatchSchema } from "@workspace/db";
import { requireAuth, requireOwner } from "../middlewares/requireAuth";
import { calculateNutrition } from "@workspace/nutrition";

const router = Router();

router.post("/users", async (req, res) => {
  const parsed = insertUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const existing = await db.select().from(users).where(eq(users.id, data.id!)).limit(1);
  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }

  const [row] = await db.insert(users).values(data).returning();
  req.log.info({ userId: row.id }, "user created");
  res.status(201).json(row);
});

router.get("/users/:id", async (req, res) => {
  const id = req.params.id as string;
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(row);
});

router.patch("/users/:id", requireAuth, requireOwner((req) => req.params.id), async (req, res) => {
  const id = req.params.id as string;
  const parsed = profilePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(row);
});

router.post("/users/clerk-link", async (req, res) => {
  const { clerkId, localUuid, firstName, lastName, imageUrl } = req.body as {
    clerkId?: string;
    localUuid?: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  };
  if (!clerkId) {
    res.status(400).json({ error: "clerkId is required" });
    return;
  }

  const clerkName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  const existing = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (existing.length > 0) {
    const canonicalUser = existing[0];
    if (localUuid && localUuid !== canonicalUser.id) {
      const localUser = await db.select().from(users).where(eq(users.id, localUuid)).limit(1);
      if (localUser.length > 0) {
        await Promise.all([
          db.update(workoutSessions).set({ userId: canonicalUser.id }).where(eq(workoutSessions.userId, localUuid)),
          db.update(foodEntries).set({ userId: canonicalUser.id }).where(eq(foodEntries.userId, localUuid)),
          db.update(runSessions).set({ userId: canonicalUser.id }).where(eq(runSessions.userId, localUuid)),
        ]);
        await db.delete(users).where(eq(users.id, localUuid));
        req.log.info({ clerkId, localUuid, canonicalId: canonicalUser.id }, "migrated anonymous data to authenticated account");
      }
    }
    res.json({ user: canonicalUser, migrated: localUuid !== canonicalUser.id });
    return;
  }

  if (localUuid) {
    const localUser = await db.select().from(users).where(eq(users.id, localUuid)).limit(1);
    if (localUser.length > 0) {
      // This branch only runs on first Clerk link for this local user (clerkId was null).
      // Apply Clerk name whenever one is provided — the local name is either the DB default
      // ("Athlete") or the mobile seed value ("Alex Jordan"), both of which are uninitialized.
      // User-chosen names set during onboarding may be overwritten on first sign-in, which
      // is the expected behaviour: Google/Apple identity takes precedence on first link.
      const profileUpdates: Record<string, unknown> = { clerkId, updatedAt: new Date() };
      if (clerkName) {
        profileUpdates.name = clerkName;
      }
      if (imageUrl && !localUser[0].imageUrl) {
        profileUpdates.imageUrl = imageUrl;
      }
      const [updated] = await db
        .update(users)
        .set(profileUpdates)
        .where(eq(users.id, localUuid))
        .returning();
      req.log.info({ clerkId, userId: updated.id }, "linked clerk id to existing user");
      res.json({ user: updated, migrated: false });
      return;
    }
  }

  const [newUser] = await db
    .insert(users)
    .values({
      clerkId,
      name: clerkName ?? "Athlete",
      username: "athlete",
      imageUrl: imageUrl ?? null,
      joinDate: new Date().toISOString().slice(0, 10),
    })
    .returning();
  req.log.info({ clerkId, userId: newUser.id }, "created new user for clerk id");
  res.status(201).json({ user: newUser, migrated: false });
});

const nutritionGoalsSchema = z.object({
  biologicalSex: z.enum(["male", "female"]),
  heightCm: z.number().int().min(50).max(300),
  weightKg: z.number().int().min(20).max(300),
  age: z.number().int().min(10).max(120),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  primaryGoal: z.enum(["lose_fat", "maintain", "build_muscle", "improve_endurance"]),
  weeklyPaceLbs: z.number().int().min(0).max(5).optional(),
  equipment: z.array(z.string()).optional(),
});

router.post("/users/:id/nutrition-goals", requireAuth, requireOwner((req) => req.params.id), async (req, res) => {
  const id = req.params.id as string;
  const parsed = nutritionGoalsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const { dailyCalories, proteinG, carbsG, fatG } = calculateNutrition({
    biologicalSex: data.biologicalSex,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    age: data.age,
    activityLevel: data.activityLevel,
    primaryGoal: data.primaryGoal,
    weeklyPaceLbs: data.weeklyPaceLbs,
  });

  const updateData: Record<string, unknown> = {
    calorieGoal: dailyCalories,
    proteinGoal: proteinG,
    carbGoal: carbsG,
    fatGoal: fatG,
    biologicalSex: data.biologicalSex,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    activityLevel: data.activityLevel,
    primaryGoal: data.primaryGoal,
    weeklyPaceLbs: data.weeklyPaceLbs ?? null,
    updatedAt: new Date(),
  };
  if (data.equipment !== undefined && data.equipment.length > 0) {
    updateData.equipment = data.equipment;
  }

  const [row] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    user: row,
  });
});

router.get("/leaderboard", async (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const weeklySubquery = db
    .select({
      userId: workoutSessions.userId,
      weeklyWorkouts: sql<number>`cast(count(*) as int)`.as("weekly_workouts"),
    })
    .from(workoutSessions)
    .where(sql`${workoutSessions.date} >= ${cutoff}`)
    .groupBy(workoutSessions.userId)
    .as("weekly");

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      totalPoints: users.totalPoints,
      streak: users.streak,
      weeklyWorkouts: sql<number>`coalesce(${weeklySubquery.weeklyWorkouts}, 0)`,
    })
    .from(users)
    .leftJoin(weeklySubquery, eq(users.id, weeklySubquery.userId))
    .orderBy(desc(users.totalPoints))
    .limit(20);
  res.json(rows);
});

export default router;
