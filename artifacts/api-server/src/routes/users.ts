import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, users, insertUserSchema, updateUserSchema } from "@workspace/db";

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
  const [row] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(row);
});

router.patch("/users/:id", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(row);
});

router.get("/leaderboard", async (req, res) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      totalPoints: users.totalPoints,
      streak: users.streak,
      totalWorkouts: users.totalWorkouts,
    })
    .from(users)
    .orderBy(users.totalPoints);
  res.json(rows.reverse());
});

export default router;
