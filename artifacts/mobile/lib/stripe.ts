import * as WebBrowser from "expo-web-browser";
import { socialFetch } from "../context/AppContext";

const RETURN_URL = "mobile://upgrade";

export type CheckoutResult =
  | { outcome: "success" }
  | { outcome: "cancelled" }
  | { outcome: "error"; message: string };

export async function startPremiumCheckout(): Promise<CheckoutResult> {
  let checkoutUrl: string;
  try {
    const r = await socialFetch("/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({
        successUrl: `${RETURN_URL}?checkout=success`,
        cancelUrl: `${RETURN_URL}?checkout=cancel`,
      }),
    });
    if (!r.ok) {
      return { outcome: "error", message: "Could not start checkout. Please try again." };
    }
    const json = (await r.json()) as { url?: string };
    if (!json.url) {
      return { outcome: "error", message: "Checkout is not available right now." };
    }
    checkoutUrl = json.url;
  } catch {
    return { outcome: "error", message: "No connection. Check your internet and try again." };
  }

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_URL);

  if (result.type !== "success") {
    return { outcome: "cancelled" };
  }

  const url = result.url ?? "";
  if (url.includes("checkout=cancel")) {
    return { outcome: "cancelled" };
  }

  try {
    const linkResp = await socialFetch("/stripe/checkout/link-subscription", { method: "POST" });
    if (linkResp.ok) {
      const linked = (await linkResp.json()) as { isPremium: boolean };
      return linked.isPremium ? { outcome: "success" } : { outcome: "cancelled" };
    }
  } catch {}

  return { outcome: "success" };
}
