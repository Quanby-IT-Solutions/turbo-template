import type { Metadata } from "next"

import { PrivacyPolicy } from "@/features/legal/privacy-policy"

/**
 * Public, unauthenticated, and indexable. Store reviewers open this URL
 * directly from the listing metadata, so it must render without a session —
 * which is why it sits in `(site)` rather than under `(protected)`.
 */
export const metadata: Metadata = {
	title: "Privacy Policy",
	description: "What we collect, why, who processes it, and how to delete your account.",
}

export default function PrivacyPage() {
	return <PrivacyPolicy />
}
