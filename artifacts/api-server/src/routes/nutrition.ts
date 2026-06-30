import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, foodEntries, insertFoodEntrySchema } from "@workspace/db";

const router = Router();

router.post("/nutrition", async (req, res) => {
  const parsed = insertFoodEntrySchema.safeParse(req.body);
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

router.get("/nutrition/:userId/:date", async (req, res) => {
  const rows = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, req.params.userId),
        eq(foodEntries.date, req.params.date),
      ),
    )
    .orderBy(desc(foodEntries.loggedAt));
  res.json(rows);
});

router.delete("/nutrition/:userId/:entryId", async (req, res) => {
  await db
    .delete(foodEntries)
    .where(
      and(
        eq(foodEntries.id, req.params.entryId),
        eq(foodEntries.userId, req.params.userId),
      ),
    );
  res.status(204).send();
});

export default router;
