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

/**
 * Verifies the request carries a valid Clerk JWT and resolves the caller's
 * local user UUID.  On success, `req.localUserId` is set and `next()` is
 * called.  Returns 401 when unauthenticated or when the Clerk ID has no
 * matching local user record.
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

  const [localUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!localUser) {
    res.status(401).json({ error: "User account not found" });
    return;
  }

  req.localUserId = localUser.id;
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

  const [localUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!localUser) {
    res.status(401).json({ error: "User account not found" });
    return;
  }

  req.localUserId = localUser.id;
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
