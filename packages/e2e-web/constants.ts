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
