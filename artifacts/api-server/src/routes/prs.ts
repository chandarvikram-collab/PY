import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, personalRecords } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ─── GET /api/prs ─────────────────────────────────────────────────────────────
// Returns the authenticated user's personal records (one per exercise).

router.get("/prs", requireAuth, async (req: Request, res: Response) => {
  const userId = req.localUserId!;
  try {
    const records = await db
      .select()
      .from(personalRecords)
      .where(eq(personalRecords.userId, userId));
    res.json({ records });
  } catch (err) {
    req.log.error({ err }, "Error fetching personal records");
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

export default router;
