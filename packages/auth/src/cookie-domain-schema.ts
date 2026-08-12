import { z } from "zod"

/**
 * Validation for `BETTER_AUTH_COOKIE_DOMAIN` (AC-3 / F-33).
 *
 * Any non-empty value used to switch on cross-subdomain cookies, so a typo, a
 * stray quote, or a pasted URL silently widened the session cookie's scope to
 * whatever string was supplied. Cookie scope is a security boundary; it should
 * not be settable by accident.
 *
 * Unset is the default and means "host-only cookie" — the narrowest option.
 * Set it only when subdomains genuinely need to share a session.
 */

/**
 * A bare hostname, optionally leading-dotted (`.example.com`), which is the
 * form the Domain attribute takes. Deliberately rejects schemes, ports, paths
 * and whitespace: every one of those is a mistake rather than an intent.
 */
const HOSTNAME = /^\.?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i

/** `localhost`, with or without a leading dot, for local multi-subdomain work. */
const LOCALHOST = /^\.?localhost$/i

export function isValidCookieDomain(value: string): boolean {
	const trimmed = value.trim()
	if (!trimmed) return false
	if (trimmed !== value) return false // stray whitespace is a paste error
	return HOSTNAME.test(trimmed) || LOCALHOST.test(trimmed)
}

export const cookieDomainSchema = z
	.string()
	.refine(isValidCookieDomain, {
		message:
			"BETTER_AUTH_COOKIE_DOMAIN must be a bare hostname such as `.example.com` — no scheme, port, path or whitespace. " +
			"Leave it unset unless subdomains must share a session; unset means a host-only cookie, which is narrower.",
	})
	.optional()
