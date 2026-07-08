import { Router } from "express";
import { runChallengeDeadlineCheck } from "../lib/challengeDeadlineJob";
import { logger } from "../lib/logger";

const router = Router();

router.post("/api/internal/challenge-deadline-check", async (req, res) => {
  try {
    await runChallengeDeadlineCheck();
    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "Internal deadline check route error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
