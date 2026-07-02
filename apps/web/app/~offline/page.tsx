import type { Metadata } from "next"

import { OfflineView } from "@/features/pwa/components/offline-view"

export const metadata: Metadata = {
	title: "You're offline",
}

export default function OfflinePage() {
	return <OfflineView />
}
