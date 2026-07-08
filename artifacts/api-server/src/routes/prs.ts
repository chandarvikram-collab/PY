import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, personalRecords, sessionPrs } from "@workspace/db";
import { requireAuth, requireOwner } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ─── GET /api/prs/session/:sessionId ─────────────────────────────────────────
// MUST be declared before /prs/:userId to avoid the wildcard matching "session".
// Returns PR events recorded for a specific session (append-only history table).
// Used by workout-detail to determine permanent historical PR badges.

router.get("/prs/session/:sessionId", requireAuth, async (req: Request, res: Response) => {
  const userId: string = req.localUserId!;
  const sessionId: string = req.params.sessionId as string;
  try {
    const prs = await db
      .select()
      .from(sessionPrs)
      .where(and(eq(sessionPrs.sessionId, sessionId), eq(sessionPrs.userId, userId)));
    res.json({ prs });
  } catch (err) {
    req.log.error({ err }, "Error fetching session PRs");
    res.status(500).json({ error: "Failed to fetch session PRs" });
  }
});

// ─── GET /api/prs/:userId ─────────────────────────────────────────────────────
// Current all-time best per exercise for the given user (one row per exercise).

router.get(
  "/prs/:userId",
  requireAuth,
  requireOwner((req) => req.params.userId),
  async (req: Request, res: Response) => {
    const userId: string = req.params.userId as string;
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
  },
);

export default router;
