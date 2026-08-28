/**
 * Ownership and nutrition-goal route tests.
 *
 * These tests use the same lightweight DB and Clerk boundary mocks as the
 * existing access-control suite while keeping this coverage in a separate
 * file. The DB mock's queue represents the ordered results a route would
 * receive from its queries.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

const { mockClerkState, dbQueue } = vi.hoisted(() => ({
  mockClerkState: { userId: null as string | null },
  dbQueue: [] as unknown[],
}));

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(() => ({ userId: mockClerkState.userId })),
  clerkMiddleware:
    () => (_req: Request, _res: Response, next: NextFunction) =>
      next(),
}));

vi.mock("drizzle-orm", () => {
  const noop = (..._args: unknown[]) => null;
  const sqlTag: unknown = new Proxy(
    function sqlTag() {
      return sqlTag;
    } as unknown as object,
    {
      get(_target, property) {
        if (property === "then") return undefined;
        return (..._args: unknown[]) => sqlTag;
      },
      apply() {
        return sqlTag;
      },
    },
  );
  return {
    and: noop,
    desc: noop,
    eq: noop,
    inArray: noop,
    or: noop,
    sql: sqlTag,
  };
});

vi.mock("@workspace/db", () => {
  const chain: unknown = new Proxy(
    function chain() {
      return chain;
    } as unknown as object,
    {
      get(_target, property) {
        if (property === "then") {
          return (resolve: (value: unknown) => void, reject: (error: unknown) => void) =>
            Promise.resolve(dbQueue.shift() ?? []).then(resolve, reject);
        }
        return (..._args: unknown[]) => chain;
      },
      apply() {
        return chain;
      },
    },
  );

  const table = () =>
    new Proxy(
      {},
      { get: (_target, property) => (typeof property === "string" ? property : undefined) },
    );

  const alwaysValidSchema = {
    safeParse: (data: unknown) => ({ success: true, data }),
  };

  return {
    db: chain,
    users: table(),
    workoutSessions: table(),
    runSessions: table(),
    routines: table(),
    personalRecords: table(),
    sessionPrs: table(),
    insertWorkoutSessionSchema: alwaysValidSchema,
    insertRunSessionSchema: alwaysValidSchema,
    insertUserSchema: alwaysValidSchema,
    profilePatchSchema: alwaysValidSchema,
  };
});

import usersRouter from "../routes/users.js";
import sessionsRouter from "../routes/sessions.js";
import routinesRouter from "../routes/routines.js";
import prsRouter from "../routes/prs.js";

const OWNER_ID = "user-owner";
const OTHER_ID = "user-other";
const OWNER_CLERK = "clerk-owner";
const OTHER_CLERK = "clerk-other";

function createApp() {
  const app = express();
  app.use(express.json());
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
  app.use("/api", routinesRouter);
  app.use("/api", prsRouter);
  return app;
}

const app = createApp();

function setOtherToken() {
  mockClerkState.userId = OTHER_CLERK;
}

function setOwnerToken() {
  mockClerkState.userId = OWNER_CLERK;
}

function setNutritionOwnerToken() {
  mockClerkState.userId = "clerk-nutrition-owner";
}

function enqueueAuthUser(id: string) {
  dbQueue.push([{ id }]);
}

function enqueueRow(row: Record<string, unknown>) {
  dbQueue.push([row]);
}

beforeEach(() => {
  mockClerkState.userId = null;
  dbQueue.length = 0;
});

describe("ownership rejection", () => {
  it("rejects user A from reading user B's workout sessions", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);

    const response = await request(app).get(`/api/sessions/workout/${OWNER_ID}`);

    expect(response.status).toBe(403);
  });

  it("rejects user A from editing user B's workout session", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);
    enqueueRow({ id: "workout-b", userId: OWNER_ID });

    const response = await request(app)
      .patch("/api/sessions/workout/id/workout-b")
      .send({ exerciseLogJson: { squat: [{ weight: 100, reps: 5 }] } });

    expect(response.status).toBe(403);
  });

  it("rejects user A from reading user B's routines", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);

    const response = await request(app).get(`/api/routines/${OWNER_ID}`);

    expect(response.status).toBe(403);
  });

  it("rejects user A from reading user B's personal records", async () => {
    setOtherToken();
    enqueueAuthUser(OTHER_ID);

    const response = await request(app).get(`/api/prs/${OWNER_ID}`);

    expect(response.status).toBe(403);
  });

  it("scopes session PR history to the authenticated user", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueRow({ id: "pr-a", userId: OWNER_ID, sessionId: "workout-b" });

    const response = await request(app).get("/api/prs/session/workout-b");

    expect(response.status).toBe(200);
    expect(response.body.prs).toEqual([
      { id: "pr-a", userId: OWNER_ID, sessionId: "workout-b" },
    ]);
  });
});

describe("POST /api/users/:id/nutrition-goals", () => {
  const validPayload = {
    biologicalSex: "male",
    age: 30,
    activityLevel: "moderate",
    primaryGoal: "maintain",
    weeklyPaceLbs: 0.5,
    heightFt: 5,
    heightIn: 10,
    weightLbs: 180,
    activities: ["Strength Training"],
    availability: ["Weekday Evenings"],
  };

  it("calculates and stores goals for a valid imperial payload", async () => {
    setNutritionOwnerToken();
    enqueueAuthUser(OWNER_ID);
    enqueueRow({ id: OWNER_ID, calorieGoal: 2500 });

    const response = await request(app)
      .post(`/api/users/${OWNER_ID}/nutrition-goals`)
      .send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body.dailyCalories).toBeGreaterThan(0);
    expect(response.body.proteinG).toBeGreaterThan(0);
    expect(response.body.carbsG).toBeGreaterThan(0);
    expect(response.body.fatG).toBeGreaterThan(0);
    expect(response.body.user).toEqual({ id: OWNER_ID, calorieGoal: 2500 });
  });

  it("rejects a payload without complete measurements", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);

    const response = await request(app)
      .post(`/api/users/${OWNER_ID}/nutrition-goals`)
      .send({
        biologicalSex: "male",
        age: 30,
        activityLevel: "moderate",
        primaryGoal: "maintain",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(Array));
  });

  it("rejects an invalid age", async () => {
    setOwnerToken();
    enqueueAuthUser(OWNER_ID);

    const response = await request(app)
      .post(`/api/users/${OWNER_ID}/nutrition-goals`)
      .send({ ...validPayload, age: 9 });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(Array));
  });
});