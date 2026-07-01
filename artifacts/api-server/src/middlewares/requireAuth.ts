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
