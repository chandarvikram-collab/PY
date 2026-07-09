import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { logger } from "./lib/logger";
import { runChallengeDeadlineCheck } from "./lib/challengeDeadlineJob";
import { getStripeSync } from "./lib/stripeClient";

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

async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the Stripe integration.");
  }

  try {
    await runMigrations({ databaseUrl });
    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);

    stripeSync.syncBackfill().catch((err) => {
      logger.error({ err }, "Stripe backfill sync failed");
    });
    logger.info("Stripe schema ready and webhook configured");
  } catch (err) {
    logger.error({ err }, "Failed to initialize Stripe -- premium checkout will be unavailable until this is resolved");
  }
}

await initStripe();

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
