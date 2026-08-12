import { chromium, request } from "@playwright/test"

const AUTH_API = "http://localhost:3000/api/v1/auth/"
const WEB = "http://localhost:3001"

const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

const msgs = []
page.on("console", m => msgs.push(`[${m.type()}] ${m.text()}`))
page.on("pageerror", e => msgs.push(`[pageerror] ${String(e).slice(0, 200)}`))
page.on("requestfailed", r => msgs.push(`[reqfail] ${r.url().slice(0, 90)} ${r.failure()?.errorText}`))

const api = await request.newContext({
	baseURL: AUTH_API,
	extraHTTPHeaders: { "Content-Type": "application/json", Origin: WEB },
})
const res = await api.post("sign-in/email", {
	data: { email: "test@gmail.com", password: "Password123" },
})
console.log("signin:", res.status())
await context.addCookies((await api.storageState()).cookies)
await api.dispose()

await page.goto(`${WEB}/`, { waitUntil: "networkidle" })
console.log("logout button present:", await page.getByRole("button", { name: /logout/i }).count())

msgs.length = 0
await page.getByRole("button", { name: /logout/i }).click()
await page.waitForTimeout(6000)

console.log("URL after logout:", page.url())
console.log("login link present:", await page.getByRole("link", { name: /^login$/i }).count())
console.log("logout button still present:", await page.getByRole("button", { name: /logout/i }).count())
console.log("--- messages during logout ---")
for (const m of msgs.filter(m => !m.includes("gstatic"))) console.log(" ", m)

await browser.close()
