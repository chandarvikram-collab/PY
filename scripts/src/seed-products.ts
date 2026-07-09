import { getUncachableStripeClient } from "./stripeClient";

/**
 * Idempotent script: creates the IronPace Premium monthly subscription
 * product/price in Stripe (test mode) if it doesn't already exist.
 *
 * Run with: pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 */
async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("Creating IronPace Premium product in Stripe...");

  const existing = await stripe.products.search({
    query: "name:'IronPace Premium' AND active:'true'",
  });

  if (existing.data.length > 0) {
    console.log("IronPace Premium already exists:", existing.data[0].id);
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    if (prices.data.length > 0) {
      console.log("Existing price:", prices.data[0].id, `$${(prices.data[0].unit_amount ?? 0) / 100}/mo`);
      console.log("\nSet this as STRIPE_PREMIUM_PRICE_ID:", prices.data[0].id);
    }
    return;
  }

  const product = await stripe.products.create({
    name: "IronPace Premium",
    description: "Unlocks advanced AI training plans, unlimited challenges, and detailed analytics.",
  });
  console.log("Created product:", product.id);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 799, // $7.99/month
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log("Created monthly price: $7.99/month", price.id);

  console.log("\nSet this as STRIPE_PREMIUM_PRICE_ID:", price.id);
}

createProducts().catch((err) => {
  console.error("Error creating products:", err);
  process.exit(1);
});
