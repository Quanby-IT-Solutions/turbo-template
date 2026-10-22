import { getSession, SessionUnavailableError } from "@/services/better-auth/auth-server"
import { HomeCtaButton } from "@/features/home/home-cta-button"
import { NavigationLinks } from "@/features/home/navigation-links"

export default async function Home() {
	let session: Awaited<ReturnType<typeof getSession>> = null
	try {
		session = await getSession()
	} catch (error) {
		if (!(error instanceof SessionUnavailableError)) throw error
	}
	const isLoggedIn = session !== null

	return (
		<div className="flex w-full flex-col items-center gap-12 pt-24 text-center">
			<div className="flex flex-col items-center gap-3">
				<p className="text-lg text-zinc-700 md:text-xl dark:text-zinc-300">
					{session ? (
						<>
							Hello <span className="font-semibold">{session.user.name}</span>
						</>
					) : (
						<>
							Welcome <span className="font-semibold">Everyone!</span>
						</>
					)}
				</p>
				<h1 className="text-6xl font-bold tracking-tight text-black md:text-7xl dark:text-zinc-50">
					TURBO TEMPLATE.
				</h1>
				<p className="max-w-2xl text-lg leading-8 text-zinc-600 md:text-2xl dark:text-zinc-400">
					A full-stack monorepo template with Next.js, NestJS, and Flutter. Built for rapid
					development with shared packages, type-safe APIs, and modern tooling.
				</p>
			</div>

			<NavigationLinks />

			<HomeCtaButton href={isLoggedIn ? "/dashboard" : "/login"} isLoggedIn={isLoggedIn} />
		</div>
	)
}
