import type { Metadata } from "next"
import { AccountSetting01Icon } from "@hugeicons/core-free-icons"

import { ComingSoonPage } from "@/features/dashboard/components/coming-soon-page"

export const metadata: Metadata = {
	title: "Account",
}

export default function AccountPage() {
	return (
		<ComingSoonPage
			title="Account"
			description="Profile and account settings will be available here soon."
			icon={AccountSetting01Icon}
		/>
	)
}
