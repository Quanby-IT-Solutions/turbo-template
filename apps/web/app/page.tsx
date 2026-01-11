import Link from "next/link"
import Image from "next/image"
import {
	IconUsers,
	IconShield,
	IconClock,
	IconVideo,
	IconFileText,
	IconArrowRight,
	IconCheck,
	IconStethoscope,
	IconChartBar,
	IconLock,
	IconDeviceMobile,
	IconStar,
	IconMail,
	IconPhone,
	IconMapPin,
} from "@tabler/icons-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"

import { env } from "@/env"

// TODO: Migrate SubscriptionInquiryForm component
// import { SubscriptionInquiryForm } from "@/features/subscriptions/components/subscription-inquiry-form"

export default function LandingPage() {
	const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"
	const contactEndpoint = `${apiBaseUrl}/v1/email/send`
	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Navigation */}
			<nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<Link href="/" className="flex items-center gap-2">
						<Image
							src="/new-logo.png"
							alt="QHealth Logo"
							width={40}
							height={40}
							className="h-10 w-auto object-contain"
							priority
						/>
						<span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
							QHealth
						</span>
					</Link>
					<div className="flex items-center gap-4">
						<Link
							href="/login"
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Sign In
						</Link>
						<Button asChild size="sm">
							<Link href="/signup">Get Started</Link>
						</Button>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
				<div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
				<div className="container relative mx-auto flex flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
					<div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm shadow-sm backdrop-blur-sm">
						<IconShield className="size-4 text-primary" />
						<span className="font-medium">HIPAA-Compliant & Secure</span>
					</div>
					<h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
						Your Path to Smarter
						<br />
						<span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
							Wellness Starts Here
						</span>
					</h1>
					<p className="mb-10 max-w-3xl text-lg text-muted-foreground sm:text-xl">
						Deliver secure, AI-assisted care for your patients—whether you run a hospital network, clinic, or
						private practice. Streamline visits, capture insights, and keep care teams aligned.
					</p>
					<div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
						<Button size="lg" className="group" asChild>
							<Link href="/signup">
								Get Started Free
								<IconArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
							</Link>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<Link href="/login">Sign In</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* AI-Powered Face Scanning Section */}
			<section className="border-y bg-gradient-to-b from-background via-muted/20 to-background py-20 sm:py-24">
				<div className="container mx-auto px-4">
					<div className="grid gap-12 lg:grid-cols-2 lg:items-center">
						<div className="order-2 lg:order-1">
							<div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
								<IconShield className="size-4" />
								AI-Powered Technology
							</div>
							<h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
								AI-Powered Health Technology
							</h2>
							<p className="mb-6 text-lg text-muted-foreground">
								Our AI analyzes subtle facial biomarkers to give clinicians a clear view of patient wellness.
								It&apos;s non-invasive, fast, and secure—built for care teams in hospitals, clinics, and private
								practices.
							</p>
							<div className="space-y-6">
								<div className="flex items-start gap-4">
									<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
										<span className="text-xl font-bold text-primary">1</span>
									</div>
									<div>
										<h3 className="mb-2 text-lg font-semibold">Face Scanning</h3>
										<p className="text-muted-foreground">
											Use your camera for a quick AI-powered face scan to analyze your health indicators.
										</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
										<span className="text-xl font-bold text-primary">2</span>
									</div>
									<div>
										<h3 className="mb-2 text-lg font-semibold">Get Instant Wellness Insights</h3>
										<p className="text-muted-foreground">
											Our AI analyzes your data to reveal trends and patterns in your wellbeing.
										</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
										<span className="text-xl font-bold text-primary">3</span>
									</div>
									<div>
										<h3 className="mb-2 text-lg font-semibold">Personalized Recommendations</h3>
										<p className="text-muted-foreground">
											Receive actionable tips and track your progress towards your health goals.
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="order-1 lg:order-2 flex items-center justify-center">
							<div className="relative w-full max-w-lg">
								<div className="relative rounded-2xl border-2 border-primary/20 bg-muted/50 p-8 shadow-2xl">
									<Image
										src="/face1.gif"
										alt="AI Face Scanning Technology"
										width={600}
										height={400}
										className="w-full h-auto rounded-lg object-contain"
										unoptimized
									/>
								</div>
								<div className="absolute -inset-4 -z-10 rounded-2xl bg-primary/5 blur-2xl"></div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section id="features" className="py-20 sm:py-24">
				<div className="container mx-auto px-4">
					<div className="mb-16 text-center">
						<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
							Everything You Need to Manage Healthcare
						</h2>
						<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
							Comprehensive tools designed for healthcare professionals to deliver exceptional patient care
						</p>
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						<Card className="group border-2 transition-all hover:border-primary/50 hover:shadow-lg">
							<CardHeader>
								<div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
									<IconUsers className="size-7 text-primary" />
								</div>
								<CardTitle className="text-xl">Patient Management</CardTitle>
								<CardDescription className="text-base">
									Comprehensive patient records, medical history tracking, and seamless appointment scheduling
								</CardDescription>
							</CardHeader>
						</Card>
						<Card className="group border-2 transition-all hover:border-primary/50 hover:shadow-lg">
							<CardHeader>
								<div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
									<IconVideo className="size-7 text-primary" />
								</div>
								<CardTitle className="text-xl">Telemedicine</CardTitle>
								<CardDescription className="text-base">
									Conduct secure virtual consultations with high-quality video conferencing and real-time
									collaboration
								</CardDescription>
							</CardHeader>
						</Card>
						<Card className="group border-2 transition-all hover:border-primary/50 hover:shadow-lg">
							<CardHeader>
								<div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
									<IconFileText className="size-7 text-primary" />
								</div>
								<CardTitle className="text-xl">Medical Records</CardTitle>
								<CardDescription className="text-base">
									Digital storage and management of all medical documents, lab results, and patient files
								</CardDescription>
							</CardHeader>
						</Card>
						<Card className="group border-2 transition-all hover:border-primary/50 hover:shadow-lg">
							<CardHeader>
								<div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
									<IconClock className="size-7 text-primary" />
								</div>
								<CardTitle className="text-xl">Smart Scheduling</CardTitle>
								<CardDescription className="text-base">
									Intelligent appointment scheduling system with automated reminders and calendar integration
								</CardDescription>
							</CardHeader>
						</Card>
						<Card className="group border-2 transition-all hover:border-primary/50 hover:shadow-lg">
							<CardHeader>
								<div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
									<IconShield className="size-7 text-primary" />
								</div>
								<CardTitle className="text-xl">Enterprise Security</CardTitle>
								<CardDescription className="text-base">
									HIPAA-compliant platform with bank-level encryption and comprehensive audit trails
								</CardDescription>
							</CardHeader>
						</Card>
						<Card className="group border-2 transition-all hover:border-primary/50 hover:shadow-lg">
							<CardHeader>
								<div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
									<IconStethoscope className="size-7 text-primary" />
								</div>
								<CardTitle className="text-xl">Lab Management</CardTitle>
								<CardDescription className="text-base">
									Streamlined workflow for lab test requests, results tracking, and automated notifications
								</CardDescription>
							</CardHeader>
						</Card>
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="border-y bg-muted/30 py-20 sm:py-24">
				<div className="container mx-auto px-4">
					<div className="grid gap-12 lg:grid-cols-2 lg:items-center">
						<div>
							<div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
								<IconChartBar className="size-4" />
								Built for Healthcare Professionals
							</div>
							<h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
								Scale Your Practice with Confidence
							</h2>
							<p className="mb-8 text-lg text-muted-foreground">
								QHealth provides a comprehensive solution for healthcare organizations of all sizes. From small
								clinics to large hospital networks, our platform scales seamlessly with your growing needs.
							</p>
							<ul className="space-y-4">
								{[
									"Role-based access control for doctors, admins, and patients",
									"Real-time appointment scheduling and automated notifications",
									"Secure document storage with encrypted file sharing",
									"Integrated lab request and result management system",
									"Comprehensive audit logs and compliance reporting",
									"Mobile-responsive design for access anywhere, anytime",
								].map((feature, index) => (
									<li key={index} className="flex items-start gap-3">
										<div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
											<IconCheck className="size-4 text-primary" />
										</div>
										<span className="text-base">{feature}</span>
									</li>
								))}
							</ul>
						</div>
						<div className="grid gap-6">
							<Card className="border-2">
								<CardContent className="flex items-center gap-4 p-6">
									<div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
										<IconUsers className="size-7 text-primary" />
									</div>
									<div>
										<h3 className="mb-1 text-lg font-semibold">Multi-User Support</h3>
										<p className="text-sm text-muted-foreground">
											Advanced role management with granular permissions and access controls
										</p>
									</div>
								</CardContent>
							</Card>
							<Card className="border-2">
								<CardContent className="flex items-center gap-4 p-6">
									<div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
										<IconLock className="size-7 text-primary" />
									</div>
									<div>
										<h3 className="mb-1 text-lg font-semibold">Enterprise Security</h3>
										<p className="text-sm text-muted-foreground">
											Bank-level encryption, two-factor authentication, and compliance certifications
										</p>
									</div>
								</CardContent>
							</Card>
							<Card className="border-2">
								<CardContent className="flex items-center gap-4 p-6">
									<div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
										<IconDeviceMobile className="size-7 text-primary" />
									</div>
									<div>
										<h3 className="mb-1 text-lg font-semibold">Mobile Access</h3>
										<p className="text-sm text-muted-foreground">
											Responsive design optimized for tablets and mobile devices
										</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>

			{/* Subscription Inquiry Contact Section */}
			<section className="border-y bg-muted/20 py-20 sm:py-24">
				<div className="container mx-auto px-4">
					<div className="mb-10 text-center">
						<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
							<IconMail className="size-4" />
							<span>Subscription Inquiry</span>
						</div>
						<h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Talk with us about plans</h2>
						<p className="mt-3 text-lg text-muted-foreground">
							Get pricing, rollout guidance, or custom requirements for your organization.
						</p>
					</div>
					<div className="mx-auto w-full max-w-6xl">
						<Card className="border-2 shadow-sm">
							<CardHeader>
								<CardTitle>Send us your subscription needs</CardTitle>
								<CardDescription>Share your organization details and we&apos;ll respond quickly.</CardDescription>
							</CardHeader>
							<CardContent>
								{/* TODO: Add SubscriptionInquiryForm component */}
								<p className="text-muted-foreground">Subscription inquiry form coming soon...</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Testimonials Section */}
			<section className="py-20 sm:py-24">
				<div className="container mx-auto px-4">
					<div className="mb-12 text-center">
						<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
							Trusted by Healthcare Professionals
						</h2>
						<p className="text-lg text-muted-foreground">See what our users are saying about QHealth</p>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						<Card className="border-2">
							<CardContent className="p-6">
								<div className="mb-4 flex gap-1">
									{[...Array(5)].map((_, i) => (
										<IconStar key={i} className="size-5 fill-yellow-400 text-yellow-400" />
									))}
								</div>
								<p className="mb-4 text-muted-foreground">
									&ldquo;QHealth has transformed how we manage our clinic. The appointment scheduling system
									alone has saved us hours every week.&rdquo;
								</p>
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
										<IconUsers className="size-5 text-primary" />
									</div>
									<div>
										<div className="font-semibold">Dr. Sarah Johnson</div>
										<div className="text-sm text-muted-foreground">Cardiologist</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card className="border-2">
							<CardContent className="p-6">
								<div className="mb-4 flex gap-1">
									{[...Array(5)].map((_, i) => (
										<IconStar key={i} className="size-5 fill-yellow-400 text-yellow-400" />
									))}
								</div>
								<p className="mb-4 text-muted-foreground">
									&ldquo;The security features give us peace of mind, and the patient portal has significantly
									improved our patient engagement.&rdquo;
								</p>
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
										<IconUsers className="size-5 text-primary" />
									</div>
									<div>
										<div className="font-semibold">Michael Chen</div>
										<div className="text-sm text-muted-foreground">Clinic Administrator</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card className="border-2">
							<CardContent className="p-6">
								<div className="mb-4 flex gap-1">
									{[...Array(5)].map((_, i) => (
										<IconStar key={i} className="size-5 fill-yellow-400 text-yellow-400" />
									))}
								</div>
								<p className="mb-4 text-muted-foreground">
									&ldquo;As a patient, I love being able to access my medical records and schedule appointments
									online. It&apos;s so convenient!&rdquo;
								</p>
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
										<IconUsers className="size-5 text-primary" />
									</div>
									<div>
										<div className="font-semibold">Emily Rodriguez</div>
										<div className="text-sm text-muted-foreground">Patient</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="relative overflow-hidden border-y bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground">
				<div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
				<div className="container relative mx-auto px-4 py-20 sm:py-24">
					<div className="mx-auto max-w-3xl text-center">
						<h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
							Ready to Transform Your Healthcare Practice?
						</h2>
						<p className="mb-8 text-lg text-primary-foreground/90">
							Join thousands of healthcare professionals using QHealth to streamline their operations and provide
							exceptional patient care.
						</p>
						<div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
							<Button size="lg" variant="secondary" className="group" asChild>
								<Link href="/signup">
									Start Free Trial
									<IconArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="bg-background/10 text-primary-foreground border-primary-foreground/20 hover:bg-background/20"
								asChild
							>
								<Link href="/login">Sign In</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t bg-muted/30">
				<div className="container mx-auto px-4 py-12">
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
						<div className="lg:col-span-2">
							<div className="mb-4 flex items-center gap-2">
								<Image
									src="/new-logo.png"
									alt="QHealth Logo"
									width={40}
									height={40}
									className="h-10 w-auto object-contain"
								/>
								<span className="text-xl font-bold">QHealth</span>
							</div>
							<p className="mb-4 max-w-sm text-sm text-muted-foreground">
								Comprehensive healthcare management platform designed for modern medical practices. Secure,
								scalable, and built for healthcare professionals.
							</p>
							<div className="flex flex-col gap-2 text-sm text-muted-foreground">
								<div className="flex items-center gap-2">
									<IconMail className="size-4" />
									<span>support@qhealth.com</span>
								</div>
								<div className="flex items-center gap-2">
									<IconPhone className="size-4" />
									<span>+1 (555) 123-4567</span>
								</div>
								<div className="flex items-center gap-2">
									<IconMapPin className="size-4" />
									<span>123 Healthcare Ave, Medical District</span>
								</div>
							</div>
						</div>
						<div>
							<h3 className="mb-4 font-semibold">Product</h3>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link href="#features" className="hover:text-foreground transition-colors">
										Features
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Pricing
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Security
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Integrations
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="mb-4 font-semibold">Company</h3>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										About Us
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Contact
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Privacy Policy
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Terms of Service
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="mb-4 font-semibold">Resources</h3>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Documentation
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Support Center
									</Link>
								</li>
								<li>
									<Link href="/login" className="hover:text-foreground transition-colors">
										Sign In
									</Link>
								</li>
								<li>
									<Link href="/signup" className="hover:text-foreground transition-colors">
										Get Started
									</Link>
								</li>
							</ul>
						</div>
					</div>
					<div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
						<p>&copy; {new Date().getFullYear()} QHealth. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	)
}
