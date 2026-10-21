import path from "path"

export const AUTH_FILE = path.join(__dirname, ".auth/session.json")

/**
 * A second stored session, for the seeded admin (HY-1 / F-54).
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
export const ADMIN_AUTH_FILE = path.join(__dirname, ".auth/admin-session.json")

/**
 * userB's session, saved once by the setup project.
 *
 * Tests that only need to be "not userA" reuse this file. Tests that sign out
 * must not: logout revokes the session server-side, and this file's token is
 * shared.
 */
export const USER_B_AUTH_FILE = path.join(__dirname, ".auth/user-b-session.json")

/**
 * Epoch milliseconds when the previous run finished.
 * The next run uses it to leave the auth limiter idle. Git ignores this directory.
 */
export const LAST_RUN_AT_FILE = path.join(__dirname, ".auth/last-run-at")
