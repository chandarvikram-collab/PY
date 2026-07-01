import { getAuth } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      localUserId?: string;
    }
  }
}

// ---------------------------------------------------------------------------
// In-process clerkId → localUserId cache
//
// Avoids a DB round-trip on every authenticated request.  A burst of requests
// carrying the same Clerk userId — whether valid or invalid — will hit the DB
// at most once per TTL window.
//
// Positive hits (found user): cached for 5 minutes.
// Negative hits (no matching local user): cached for 60 seconds.
//   A shorter TTL for negatives limits exposure if an account is created
//   shortly after a failed lookup (e.g. race between signup and first request).
// ---------------------------------------------------------------------------

const POSITIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const NEGATIVE_TTL_MS = 60 * 1000; // 60 seconds

interface CacheEntry {
  /** localUserId on a positive hit, null on a negative hit. */
  localUserId: string | null;
  expiresAt: number;
}

const userIdCache = new Map<string, CacheEntry>();

/**
 * Returns:
 *  - `{ hit: true, localUserId: string }` — cached positive result
 *  - `{ hit: true, localUserId: null }`   — cached negative result
 *  - `{ hit: false }`                     — not in cache (or expired)
 */
function getCached(
  clerkUserId: string,
): { hit: true; localUserId: string | null } | { hit: false } {
  const entry = userIdCache.get(clerkUserId);
  if (!entry) return { hit: false };
  if (Date.now() > entry.expiresAt) {
    userIdCache.delete(clerkUserId);
    return { hit: false };
  }
  return { hit: true, localUserId: entry.localUserId };
}

function setCached(clerkUserId: string, localUserId: string | null): void {
  userIdCache.set(clerkUserId, {
    localUserId,
    expiresAt: Date.now() + (localUserId ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
  });
}

/**
 * Remove a clerkId from the cache immediately.
 * Call this when a user record is deleted so the next request re-checks the DB.
 */
export function invalidateUserCache(clerkUserId: string): void {
  userIdCache.delete(clerkUserId);
}

// ---------------------------------------------------------------------------
// Shared resolver — DB hit only on cache miss
// ---------------------------------------------------------------------------

/**
 * Resolves a Clerk userId to the local user UUID.
 * Returns `undefined` when no matching local user exists.
 * Both positive and negative results are cached to protect the DB from floods
 * of repeated lookups for the same (valid or invalid) Clerk userId.
 */
async function resolveLocalUserId(
  clerkUserId: string,
): Promise<string | undefined> {
  const cached = getCached(clerkUserId);
  if (cached.hit) return cached.localUserId ?? undefined;

  const [localUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  const localUserId = localUser?.id ?? null;
  setCached(clerkUserId, localUserId);
  return localUserId ?? undefined;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Verifies the request carries a valid Clerk JWT and resolves the caller's
 * local user UUID.  On success, `req.localUserId` is set and `next()` is
 * called.  Returns 401 when unauthenticated or when the Clerk ID has no
 * matching local user record.
 *
 * The clerkId → localUserId mapping is served from an in-process cache
 * (5 min TTL) to eliminate per-request DB round-trips on the hot path.
 * Unauthenticated requests (no Clerk userId) are rejected immediately
 * without touching the database.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const localUserId = await resolveLocalUserId(clerkUserId);

  if (!localUserId) {
    res.status(401).json({ error: "User account not found" });
    return;
  }

  req.localUserId = localUserId;
  next();
}

/**
 * Like `requireAuth` but does not block unauthenticated requests.
 *
 * When a valid Clerk JWT is present, resolves the caller's local user UUID
 * and sets `req.localUserId`.  When no JWT is present, calls `next()` without
 * setting `req.localUserId` so that downstream middleware can distinguish
 * anonymous callers from authenticated ones.
 *
 * Returns 401 only when a JWT is present but maps to no known local user
 * (indicates a corrupted account state, not a missing credential).
 *
 * SECURITY NOTE: Routes using `optionalAuth` must pair it with
 * `requireOwnerIfAuthenticated` (not `requireOwner`) and should only be
 * used for create-only paths where anonymous access is an intentional policy
 * decision (e.g. logging data before account creation).  Read and delete
 * routes must use `requireAuth + requireOwner` to prevent data leakage and
 * unauthorized deletion.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    next();
    return;
  }

  const localUserId = await resolveLocalUserId(clerkUserId);

  if (!localUserId) {
    res.status(401).json({ error: "User account not found" });
    return;
  }

  req.localUserId = localUserId;
  next();
}

/**
 * Middleware factory that asserts the authenticated user owns the resource
 * identified by `getTargetId`.  Must be used after `requireAuth`.
 * Returns 403 when the resource belongs to a different user.
 * Accepts `string | string[]` so it can be used directly with Express 5
 * `req.params` values without extra casting.
 */
export function requireOwner(
  getTargetId: (req: Request) => string | string[] | undefined,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = getTargetId(req);
    const targetId = Array.isArray(raw) ? raw[0] : raw;
    if (!targetId || targetId !== req.localUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * Middleware factory for create routes that intentionally accept anonymous
 * requests (paired with `optionalAuth`).
 *
 * When the caller is authenticated (`req.localUserId` is set), enforces that
 * the JWT-resolved user matches the resource owner identified by `getTargetId`,
 * returning 403 on mismatch.
 *
 * When the caller is anonymous (`req.localUserId` is absent), skips
 * enforcement — the device UUID in the request path or body acts as the
 * implicit credential.  This is a deliberate policy choice for pre-sign-in
 * data capture; the trade-off (a UUID-knowing attacker could write for another
 * user) is accepted because UUIDs are not guessable in practice.
 *
 * Must be used after `optionalAuth`.  Do NOT use on read or delete routes.
 */
export function requireOwnerIfAuthenticated(
  getTargetId: (req: Request) => string | string[] | undefined,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.localUserId) {
      next();
      return;
    }
    const raw = getTargetId(req);
    const targetId = Array.isArray(raw) ? raw[0] : raw;
    if (!targetId || targetId !== req.localUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
