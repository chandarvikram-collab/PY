import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, foodEntries, insertFoodEntrySchema } from "@workspace/db";
import { requireAuth, requireOwner, optionalAuth, requireOwnerIfAuthenticated } from "../middlewares/requireAuth";

const router = Router();

router.post("/food-log/:userId", optionalAuth, requireOwnerIfAuthenticated((req) => req.params.userId), async (req, res) => {
  const userId = req.params.userId as string;
  const parsed = insertFoodEntrySchema.safeParse({
    ...req.body,
    userId,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const rows = await db
    .insert(foodEntries)
    .values(parsed.data)
    .onConflictDoNothing({ target: foodEntries.id })
    .returning();

  if (!rows.length) {
    res.status(200).json({ duplicate: true });
    return;
  }

  req.log.info({ entryId: rows[0].id }, "food entry saved");
  res.status(201).json(rows[0]);
});

router.get("/food-log/:userId/:date", requireAuth, requireOwner((req) => req.params.userId), async (req, res) => {
  const userId = req.params.userId as string;
  const date = req.params.date as string;
  const rows = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, userId),
        eq(foodEntries.date, date),
      ),
    )
    .orderBy(desc(foodEntries.loggedAt));
  res.json(rows);
});

router.delete("/food-log/:userId/:entryId", requireAuth, requireOwner((req) => req.params.userId), async (req, res) => {
  const userId = req.params.userId as string;
  const entryId = req.params.entryId as string;
  await db
    .delete(foodEntries)
    .where(
      and(
        eq(foodEntries.id, entryId),
        eq(foodEntries.userId, userId),
      ),
    );
  res.status(204).send();
});

export default router;
