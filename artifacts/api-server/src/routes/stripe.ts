import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, users } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router = Router();

const PREMIUM_ENTITLEMENT_STATUSES = new Set(["active", "trialing"]);

/**
 * Returns whether the given user currently has an active premium subscription.
 * Reads status live from the `stripe.subscriptions` table (synced by webhooks),
 * rather than storing a duplicate status flag that could go stale.
 */
async function getPremiumStatus(stripeSubscriptionId: string | null): Promise<boolean> {
  if (!stripeSubscriptionId) return false;
  const result = await db.execute(
    sql`SELECT status FROM stripe.subscriptions WHERE id = ${stripeSubscriptionId} LIMIT 1`,
  );
  const row = result.rows[0] as { status?: string } | undefined;
  return !!row?.status && PREMIUM_ENTITLEMENT_STATUSES.has(row.status);
}

router.get("/subscription-status/:userId", requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.localUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  // All features are free — every user is treated as premium.
  res.json({ isPremium: true });
});

const checkoutSchema = z.object({
  successUrl: z.string().min(1),
  cancelUrl: z.string().min(1),
});

router.post("/checkout", requireAuth, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const userId = req.localUserId!;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    req.log.error("STRIPE_PREMIUM_PRICE_ID is not configured");
    res.status(500).json({ error: "Premium plan is not configured yet." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: parsed.data.successUrl,
      cancel_url: parsed.data.cancelUrl,
      subscription_data: { metadata: { userId: user.id } },
      metadata: { userId: user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "failed to create checkout session");
    res.status(502).json({ error: "Could not start checkout right now." });
  }
});

router.post("/checkout/link-subscription", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.stripeCustomerId) {
    res.status(404).json({ error: "No Stripe customer on file" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 1,
    });
    const subscription = subscriptions.data[0];
    if (subscription) {
      await db.update(users).set({ stripeSubscriptionId: subscription.id }).where(eq(users.id, userId));
    }
    const isPremium = subscription ? PREMIUM_ENTITLEMENT_STATUSES.has(subscription.status) : false;
    res.json({ isPremium });
  } catch (err) {
    req.log.error({ err }, "failed to link subscription after checkout");
    res.status(502).json({ error: "Could not confirm subscription right now." });
  }
});

export default router;
