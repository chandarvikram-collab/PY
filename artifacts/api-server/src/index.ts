import app from "./app";
import { logger } from "./lib/logger";
import { runChallengeDeadlineCheck } from "./lib/challengeDeadlineJob";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run challenge deadline checks every hour
  const ONE_HOUR_MS = 60 * 60 * 1000;
  runChallengeDeadlineCheck().catch(() => {});
  setInterval(() => {
    runChallengeDeadlineCheck().catch(() => {});
  }, ONE_HOUR_MS);
});
