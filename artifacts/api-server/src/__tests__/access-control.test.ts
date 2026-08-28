/**
 * Access-control integration tests.
 *
 * Protected read/update/delete routes are exercised with three token scenarios:
 *   - no token         → 401
 *   - mismatched token → 403
 *   - matching token   → 2xx
 *
 * Create routes that support pre-sign-in device logging accept anonymous
 * requests, while still rejecting authenticated requests for another owner.
 *
 * Public GET routes (leaderboard, user profile) are exercised without a token
 * and must return 200.
 *
 * @workspace/db is replaced with a Proxy-based chainable mock that resolves
 * awaited calls by dequeuing from `dbQueue`.  Push responses in call order
 * before each test that reaches the route handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Hoisted shared state (must live outside vi.mock factories)
// ---------------------------------------------------------------------------
const { mockClerkState, dbQueue } = vi.hoisted(() => {
  const mockClerkState = { userId: null as string | null };
  const dbQueue: unknown[] = [];
  return { mockClerkState, dbQueue };
});

// ---------------------------------------------------------------------------
// Mock @clerk/express
// ---------------------------------------------------------------------------
vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(() => ({ userId: mockClerkState.userId })),
  clerkMiddleware:
    () => (_req: Request, _res: Response, next: NextFunction) =>
      next(),
}));

// ---------------------------------------------------------------------------
// Mock drizzle-orm operators – used as arguments to the chain; values are
// ignored by the proxy so any non-throwing return value works.
// ---------------------------------------------------------------------------
vi.mock("drizzle-orm", () => {
  const noop = (..._args: unknown[]) => null;
  // sql is used as a tagged-template tag AND has chained methods (.as)
  const sqlTag: unknown = new Proxy(
    function sqlTag() {
      return sqlTag;
    } as unknown as object,
    {
      get(_t, prop) {
        if (prop === "then") return undefined;
        return (..._a: unknown[]) => sqlTag;
      },
      apply() {
        return sqlTag;
      },
    },
  );
  return { eq: noop, and: noop, desc: noop, or: noop, inArray: noop, sql: sqlTag };
});

// ---------------------------------------------------------------------------
// Mock @workspace/db – chainable Proxy that dequeues from dbQueue on await
// ---------------------------------------------------------------------------
vi.mock("@workspace/db", () => {
  // Every method on the chain returns the chain itself.
  // Awaiting the chain pops the next value from dbQueue.
  const chain: unknown = new Proxy(
    function chain() {
      return chain;
    } as unknown as object,
    {
      get(_t, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(dbQueue.shift() ?? []).then(resolve, reject);
        }
        return (..._a: unknown[]) => chain;
      },
      apply() {
        return chain;
      },
    },
  );

  // Table stubs — property access returns the property name so drizzle
  // column references (e.g. users.clerkId) resolve to a string rather
  // than undefined, preventing crashes in operators like eq().
  const tbl = () =>
    new Proxy(
      {},
      { get: (_t, p) => (typeof p === "string" ? p : undefined) },
    );

  return {
    db: chain,
    users: tbl(),
    workoutSessions: tbl(),
    runSessions: tbl(),
    foodEntries: tbl(),
    posts: tbl(),
    follows: tbl(),
    likes: tbl(),
    challenges: tbl(),
    challengeParticipants: tbl(),
    insertWorkoutSessionSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
    insertRunSessionSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
    insertFoodEntrySchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
    insertUserSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
    profilePatchSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  };
});

// ---------------------------------------------------------------------------
// Build a minimal test app — no pino, no clerkMiddleware boilerplate
// ---------------------------------------------------------------------------
import usersRouter from "../routes/users.js";
import sessionsRouter from "../routes/sessions.js";
import nutritionRouter from "../routes/nutrition.js";

function createApp() {
  const app = express();
  app.use(express.json());
  // Provide a req.log stub so route handlers that call req.log.info() don't crash
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).log = {
      info: () => {},
      error: () => {},
      warn: () => {},
      fatal: () => {},
      debug: () => {},
      trace: () => {},
      silent: () => {},
      level: "info",
      child: () => ({}) as any,
    };
    next();
  });
  app.use("/api", usersRouter);
  app.use("/api", sessionsRouter);
  app.use("/api", nutritionRouter);
  return app;
}

const app = createApp();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const OWNER_ID = "user-owner";
const OTHER_ID = "user-other";
const OWNER_CLERK = "clerk_owner";
const OTHER_CLERK = "clerk_other";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setNoToken() {
  mockClerkState.userId = null;
}
function setOwnerToken() {
  mockClerkState.userId = OWNER_CLERK;
}
function setOtherToken() {
  mockClerkState.userId = OTHER_CLERK;
}

/** Push the user record that requireAuth resolves for the current Clerk user. */
function enqueueAuthUser(id: string) {
  dbQueue.push([{ id }]);
}
/** Push an empty result for a subsequent DB call in the route handler. */
function enqueueEmpty() {
  dbQueue.push([]);
}
/** Push a data row for a route handler that needs a non-empty result. */
function enqueueRow(row: Record<string, unknown>) {
  dbQueue.push([row]);
}

// ---------------------------------------------------------------------------
// Reset state between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockClerkState.userId = null;
  dbQueue.length = 0;
});

// ===========================================================================
// Protected routes
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /api/sessions/workout
// ---------------------------------------------------------------------------
describe("POST /api/sessions/workout", () => {
  const validBody = {
    userId: OWNER_ID,
    date: "2026-07-01",
    duration: 30,
    exercises: [],
    pointsEarned: 10,
  };

  it("accepts pre-sign-in logging with no token", async () => {
    setNoToken();
    const res = await request(app).post("/api/sessions/workout").send(validBody);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).post("/api/sessions/workout").send(validBody);
    expect(res.status).toBe(403);
  });

  it("returns 2xx with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueEmpty(); // insert.returning() → [] → duplicate branch → 200
    const res = await request(app).post("/api/sessions/workout").send(validBody);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});

// ---------------------------------------------------------------------------
// GET /api/sessions/workout/:userId
// ---------------------------------------------------------------------------
describe("GET /api/sessions/workout/:userId", () => {
  const url = `/api/sessions/workout/${OWNER_ID}`;

  it("returns 401 with no token", async () => {
    setNoToken();
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).get(url);
    expect(res.status).toBe(403);
  });

  it("returns 200 with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueEmpty(); // select rows
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/sessions/run
// ---------------------------------------------------------------------------
describe("POST /api/sessions/run", () => {
  const validBody = {
    userId: OWNER_ID,
    date: "2026-07-01",
    distance: 5,
    duration: 25,
    pointsEarned: 15,
  };

  it("accepts pre-sign-in logging with no token", async () => {
    setNoToken();
    const res = await request(app).post("/api/sessions/run").send(validBody);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).post("/api/sessions/run").send(validBody);
    expect(res.status).toBe(403);
  });

  it("returns 2xx with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueEmpty(); // insert.returning() → [] → duplicate branch → 200
    const res = await request(app).post("/api/sessions/run").send(validBody);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});

// ---------------------------------------------------------------------------
// GET /api/sessions/run/:userId
// ---------------------------------------------------------------------------
describe("GET /api/sessions/run/:userId", () => {
  const url = `/api/sessions/run/${OWNER_ID}`;

  it("returns 401 with no token", async () => {
    setNoToken();
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).get(url);
    expect(res.status).toBe(403);
  });

  it("returns 200 with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueEmpty(); // select rows
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/sessions/:userId  (combined workout + run history)
// ---------------------------------------------------------------------------
describe("GET /api/sessions/:userId", () => {
  const url = `/api/sessions/${OWNER_ID}`;

  it("returns 401 with no token", async () => {
    setNoToken();
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).get(url);
    expect(res.status).toBe(403);
  });

  it("returns 200 with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    // Route handler runs Promise.all with two concurrent queries; each
    // resolves by dequeuing once.
    enqueueEmpty(); // workoutSessions query
    enqueueEmpty(); // runSessions query
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/food-log/:userId
// ---------------------------------------------------------------------------
describe("POST /api/food-log/:userId", () => {
  const url = `/api/food-log/${OWNER_ID}`;
  const validBody = { name: "Apple", calories: 95, date: "2026-07-01" };

  it("accepts pre-sign-in logging with no token", async () => {
    setNoToken();
    const res = await request(app).post(url).send(validBody);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).post(`/api/food-log/${OWNER_ID}`).send(validBody);
    expect(res.status).toBe(403);
  });

  it("returns 2xx with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueEmpty(); // insert.returning() → [] → duplicate branch → 200
    const res = await request(app).post(url).send(validBody);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});

// ---------------------------------------------------------------------------
// GET /api/food-log/:userId/:date
// ---------------------------------------------------------------------------
describe("GET /api/food-log/:userId/:date", () => {
  const url = `/api/food-log/${OWNER_ID}/2026-07-01`;

  it("returns 401 with no token", async () => {
    setNoToken();
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).get(url);
    expect(res.status).toBe(403);
  });

  it("returns 200 with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueEmpty(); // select rows
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/food-log/:userId/:entryId
// ---------------------------------------------------------------------------
describe("DELETE /api/food-log/:userId/:entryId", () => {
  const url = `/api/food-log/${OWNER_ID}/entry-123`;

  it("returns 401 with no token", async () => {
    setNoToken();
    const res = await request(app).delete(url);
    expect(res.status).toBe(401);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).delete(url);
    expect(res.status).toBe(403);
  });

  it("returns 204 with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueEmpty(); // delete.where() resolves
    const res = await request(app).delete(url);
    expect(res.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/users/:id
// ---------------------------------------------------------------------------
describe("PATCH /api/users/:id", () => {
  const url = `/api/users/${OWNER_ID}`;
  const validBody = { name: "Updated Name" };

  it("returns 401 with no token", async () => {
    setNoToken();
    const res = await request(app).patch(url).send(validBody);
    expect(res.status).toBe(401);
  });

  it("returns 403 with a mismatched token", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    const res = await request(app).patch(`/api/users/${OWNER_ID}`).send(validBody);
    expect(res.status).toBe(403);
  });

  it("returns 200 with a matching token", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    // update.returning() must return a non-empty row or the route returns 404
    enqueueRow({ id: OWNER_ID, name: "Updated Name" });
    const res = await request(app).patch(url).send(validBody);
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// Public routes — must return 200 with no token
// ===========================================================================

describe("Public routes", () => {
  it("GET /api/leaderboard returns 200 without a token", async () => {
    setNoToken();
    enqueueEmpty(); // leaderboard query result
    const res = await request(app).get("/api/leaderboard");
    expect(res.status).toBe(200);
  });

  it("GET /api/users/:id returns 200 without a token", async () => {
    setNoToken();
    // select.from.where.limit returns the user row → no 404
    enqueueRow({ id: OWNER_ID, name: "Test User" });
    const res = await request(app).get(`/api/users/${OWNER_ID}`);
    expect(res.status).toBe(200);
  });
});
