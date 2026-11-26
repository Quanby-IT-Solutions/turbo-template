/**
 * The app's privacy policy.
 *
 * Required, not decorative. App Store Connect will not accept a submission
 * without a reachable policy URL, the Play listing requires one, and both
 * stores cross-check it against the data declarations — the iOS privacy
 * manifest at `apps/mobile/ios/Runner/PrivacyInfo.xcprivacy` and the Play Data
 * Safety form. A policy that claims less than those declare is a review
 * finding even when each is individually defensible.
 *
 * Everything below is derived from what the code actually does. If you change
 * what the app collects, this page, the manifest and the store questionnaires
 * all move together. The `mobile-store-release` skill lists the triggers.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BEFORE LAUNCH: every [BRACKETED] value is a placeholder that must be filled
 * in, and the result must be read by whoever owns legal for the product. The
 * brackets are deliberately conspicuous so this page cannot ship half-done.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Keep in step with substantive edits — both stores expect a visible date. */
const LAST_UPDATED = "25 November 2026"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
				{title}
			</h2>
			<div className="flex flex-col gap-3 text-zinc-600 dark:text-zinc-400">{children}</div>
		</section>
	)
}

function Table({
	caption,
	rows,
}: {
	caption: string
	rows: readonly { data: string; why: string; shared: string }[]
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-left text-sm">
				<caption className="sr-only">{caption}</caption>
				<thead>
					<tr className="border-b border-zinc-200 dark:border-zinc-800">
						<th scope="col" className="py-2 pr-4 font-semibold text-black dark:text-zinc-50">
							What
						</th>
						<th scope="col" className="py-2 pr-4 font-semibold text-black dark:text-zinc-50">
							Why
						</th>
						<th scope="col" className="py-2 font-semibold text-black dark:text-zinc-50">
							Who else sees it
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(row => (
						<tr key={row.data} className="border-b border-zinc-100 dark:border-zinc-900">
							<td className="py-2 pr-4 align-top">{row.data}</td>
							<td className="py-2 pr-4 align-top">{row.why}</td>
							<td className="py-2 align-top">{row.shared}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

const COLLECTED = [
	{
		data: "Email address and name",
		why: "To create and sign you in to your account",
		shared: "Nobody outside [COMPANY LEGAL NAME]",
	},
	{
		data: "Password",
		why: "To sign you in. Stored only as a salted hash, never in readable form",
		shared: "Nobody",
	},
	{
		data: "Content you create (todos, support tickets)",
		why: "To provide the service",
		shared: "Nobody outside [COMPANY LEGAL NAME]",
	},
	{
		data: "Your account identifier",
		why: "To link a crash report or a usage event back to your account",
		shared: "Sentry, PostHog",
	},
	{
		data: "Crash reports and performance diagnostics",
		why: "To find and fix faults, and to measure how often the app crashes",
		shared: "Sentry",
	},
	{
		data: "Screens visited and actions taken in the app",
		why: "To understand which features are used and to run feature flags",
		shared: "PostHog",
	},
	{
		data: "Device and app details (model, OS version, app version)",
		why: "To reproduce faults on the right hardware",
		shared: "Sentry",
	},
] as const

export function PrivacyPolicy() {
	return (
		<main className="container mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
			<header className="flex flex-col gap-3">
				<h1 className="text-4xl font-bold tracking-tight text-black md:text-5xl dark:text-zinc-50">
					Privacy Policy
				</h1>
				<p className="text-sm text-zinc-500 dark:text-zinc-500">Last updated {LAST_UPDATED}</p>
				<p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
					This policy explains what [COMPANY LEGAL NAME] (&ldquo;we&rdquo;) collects when you use
					[APP NAME], why we collect it, and what you can do about it.
				</p>
			</header>

			<Section title="What we collect">
				<Table
					caption="Data collected, the reason for it, and who it is shared with"
					rows={COLLECTED}
				/>
				<p>
					We collect nothing else. In particular we do not ask for your location, your contacts,
					your photos, your health data, or your payment details.
				</p>
			</Section>

			<Section title="What we deliberately do not do">
				<ul className="flex list-disc flex-col gap-2 pl-6">
					<li>
						<strong className="font-semibold text-black dark:text-zinc-50">
							We do not track you across other apps or websites
						</strong>{" "}
						and we do not share anything with advertisers or data brokers. The app contains no
						advertising or attribution software and never reads your device&rsquo;s advertising
						identifier.
					</li>
					<li>
						<strong className="font-semibold text-black dark:text-zinc-50">
							We do not record your screen.
						</strong>{" "}
						Session replay and crash screenshots are switched off, so no image or text from your
						screen ever leaves your device.
					</li>
					<li>
						<strong className="font-semibold text-black dark:text-zinc-50">
							We do not sell your personal data
						</strong>{" "}
						to anyone, for any purpose.
					</li>
					<li>
						Your email address, your password and your session tokens are stripped from diagnostic
						reports before they are sent, so they never reach Sentry or PostHog.
					</li>
				</ul>
			</Section>

			<Section title="Who processes data for us">
				<p>
					Two providers process data on our instructions and may not use it for their own purposes:
				</p>
				<ul className="flex list-disc flex-col gap-2 pl-6">
					<li>
						<strong className="font-semibold text-black dark:text-zinc-50">Sentry</strong> — crash
						and error reporting. Hosted in [SENTRY REGION].
					</li>
					<li>
						<strong className="font-semibold text-black dark:text-zinc-50">PostHog</strong> —
						product analytics and feature flags. Hosted in [POSTHOG REGION].
					</li>
				</ul>
				<p>
					Our own servers and database are hosted in [HOSTING REGION]. Where data leaves your
					country, we rely on [TRANSFER MECHANISM, e.g. Standard Contractual Clauses].
				</p>
			</Section>

			<Section title="Why we are allowed to collect it">
				<p>
					Where [APPLICABLE LAW, e.g. the UK GDPR] applies, we rely on the performance of our
					contract with you for your account and your content, and on our legitimate interest in a
					working, secure product for crash diagnostics and usage analytics. You can object to the
					latter at any time by writing to us.
				</p>
			</Section>

			<Section title="How long we keep it">
				<p>
					Account data and content are kept until you delete your account. Crash reports are kept
					for [SENTRY RETENTION] and usage events for [POSTHOG RETENTION], after which our providers
					delete them automatically.
				</p>
			</Section>

			<Section title="Deleting your account">
				<p>
					You can delete your account from inside the mobile app at any time:{" "}
					<strong className="font-semibold text-black dark:text-zinc-50">
						Profile → Danger Zone → Delete Account
					</strong>
					. If you use the web app, email us at the address below and we will delete it for you.
				</p>
				<p>
					Deletion is immediate and permanent. It removes your account, your content and your
					sessions on every device. Records we are required to keep — for example a support thread
					or a security audit entry — are retained but no longer linked to you. Backups are
					overwritten within [BACKUP RETENTION].
				</p>
				<p>
					If you cannot reach the app, write to{" "}
					<a
						className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
						href="mailto:[PRIVACY CONTACT EMAIL]"
					>
						[PRIVACY CONTACT EMAIL]
					</a>{" "}
					and we will delete the account for you.
				</p>
			</Section>

			<Section title="Your other rights">
				<p>
					You can ask us for a copy of your data, ask us to correct it, ask us to restrict how we
					use it, or complain to your data protection regulator ([REGULATOR NAME]). Write to us at
					[PRIVACY CONTACT EMAIL] and we will answer within [RESPONSE WINDOW, e.g. 30 days].
				</p>
			</Section>

			<Section title="Children">
				<p>
					[APP NAME] is not directed at children under [MINIMUM AGE] and we do not knowingly collect
					their data. If you believe a child has created an account, write to us and we will delete
					it.
				</p>
			</Section>

			<Section title="Changes and contact">
				<p>
					If we change what we collect, we will update this page and its date before the change
					takes effect. Questions go to{" "}
					<a
						className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
						href="mailto:[PRIVACY CONTACT EMAIL]"
					>
						[PRIVACY CONTACT EMAIL]
					</a>
					, or by post to [COMPANY LEGAL NAME], [REGISTERED ADDRESS].
				</p>
			</Section>
		</main>
	)
}
