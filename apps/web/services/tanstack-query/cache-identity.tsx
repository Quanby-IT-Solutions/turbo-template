import { getSession } from "@/services/better-auth/auth-server"
import { CacheIdentityStamp } from "@/services/tanstack-query/provider"

/**
 * Binds the persisted query cache to the signed-in user (WC-1 / F-04).
 *
 * Render this once per authenticated subtree. It resolves the session on the
 * server and hands the id to the client stamp, which scopes every IndexedDB
 * bucket to that user.
 *
 * Deliberately *not* in the root layout: `getSession` reads cookies, so placing
 * it there opts every route into dynamic rendering — including `/login`,
 * `/register` and the PWA's `/~offline` fallback, which must stay
 * prerenderable. Every surface that mounts this is already dynamic because it
 * resolves a session of its own, and `getSession` is React-cached, so mounting
 * this costs those routes no extra request.
 *
 * Unauthenticated pages need no stamp: with no session there is no identity to
 * separate, and they read nothing that the dehydration allowlist lets persist.
 */
export async function CacheIdentity() {
	const session = await getSession()

	return <CacheIdentityStamp userId={session?.user?.id ?? null} />
}
