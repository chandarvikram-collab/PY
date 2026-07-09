import type { Request } from "express";

/**
 * Builds the public-facing origin for a request, preferring the forwarded
 * proto/host set by the shared reverse proxy over req.protocol/req.get("host"),
 * which only reflect the service's internal bind address and are not
 * reachable from client devices.
 */
export function getPublicOrigin(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers["host"] as string) ||
    req.get("host") ||
    "localhost";
  return `${proto}://${host}`;
}
