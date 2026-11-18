import path from "path"

/**
 * This module is loaded two ways: Playwright transpiles it to CJS, where
 * `__dirname` exists, and the plain-node unit tests load it as a real ES
 * module, where it does not. `typeof` keeps that second case from throwing at
 * import time — those tests only pull pure helpers through this module's
 * importers and never read the paths below, and node runs them from this
 * directory regardless.
 */
const HERE: string = typeof __dirname === "string" ? __dirname : process.cwd()

export const AUTH_FILE = path.join(HERE, ".auth/session.json")

/**
 * A second stored session, for the seeded admin.
 *
 * Tests that exercise a permission-gated screen need an identity that holds the
 * permission; `AUTH_FILE` belongs to userA, who holds no role. Signing in per
 * test would work but adds an auth request each time, and Better Auth
 * rate-limits per path — the suite already spends that budget on the fixtures.
 * One sign-in in the setup project, reused by every test that needs it, keeps
 * the cost flat no matter how many such tests are added.
 *
 * Written empty when no admin is seeded, so specs can skip rather than fail.
 */
export const ADMIN_AUTH_FILE = path.join(HERE, ".auth/admin-session.json")

/**
 * userB's session, saved once by the setup project.
 *
 * Tests that only need to be "not userA" reuse this file. Tests that sign out
 * must not: logout revokes the session server-side, and this file's token is
 * shared.
 */
export const USER_B_AUTH_FILE = path.join(HERE, ".auth/user-b-session.json")

/**
 * Epoch milliseconds when the previous run finished.
 * The next run uses it to leave the auth limiter idle. Git ignores this directory.
 */
export const LAST_RUN_AT_FILE = path.join(HERE, ".auth/last-run-at")

/**
 * Cross-worker coordination paths.
 *
 * Both live beside the stored sessions rather than in the OS temp dir. That
 * directory is world-writable, so any other local process could pre-create the
 * lock directory — parking every worker on a turn that is never released — or
 * plant a cooldown deadline the suite then waits out. `.auth/` is
 * checkout-local and git-ignored.
 */
export const SIGN_OUT_TURN = path.join(HERE, ".auth/signout-turn")

/** @see SIGN_OUT_TURN */
export const SESSION_READ_COOLDOWN = path.join(HERE, ".auth/session-cooldown")
