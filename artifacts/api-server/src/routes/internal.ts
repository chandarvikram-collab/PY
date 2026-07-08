import { Router } from "express";
import { runChallengeDeadlineCheck } from "../lib/challengeDeadlineJob";
import { logger } from "../lib/logger";

const router = Router();

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

router.post("/internal/challenge-deadline-check", async (req, res) => {
  // Require a shared secret so this endpoint is not publicly callable
  const provided = req.headers["x-internal-secret"];
  if (!INTERNAL_SECRET || provided !== INTERNAL_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    await runChallengeDeadlineCheck();
    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "Internal deadline check route error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
