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
  const [row] = await db.insert(foodEntries).values(parsed.data).returning();
  req.log.info({ entryId: row.id }, "food entry saved");
  res.status(201).json(row);
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

router.delete("/nutrition/:entryId", async (req, res) => {
  await db.delete(foodEntries).where(eq(foodEntries.id, req.params.entryId));
  res.status(204).send();
});

export default router;
