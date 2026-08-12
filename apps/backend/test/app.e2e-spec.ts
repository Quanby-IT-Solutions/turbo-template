import { type INestApplication } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

import { createApplication } from "../src/bootstrap"
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"

describe("Examples API (e2e)", () => {
	let app: INestApplication<App>

	beforeEach(async () => {
		// The real production configuration — auth middleware, CORS, helmet, body
		// parsers, versioning — rather than a hand-rolled approximation of it.
		app = (await createApplication()) as INestApplication<App>
		await app.init()
	})

	it("/api/v1/example/todos (GET)", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/example/todos").expect(200)
		expect(Array.isArray(response.body)).toBe(true)
		expect(response.body.length).toBeGreaterThan(0)
		expect(response.body[0]).toEqual(
			expect.objectContaining({
				id: expect.any(Number),
				title: expect.any(String),
				completed: expect.any(Boolean),
			})
		)
	})

	it("/api/v1/example/todos is only served under the v1 prefix", async () => {
		// The old assertion expected an `apiVersion` field the payload has never
		// carried. What actually matters is that the route is version-scoped, so
		// assert that directly: v1 serves it, the unversioned path does not.
		await request(app.getHttpServer()).get("/api/v1/example/todos").expect(200)
		await request(app.getHttpServer()).get("/api/example/todos").expect(404)
	})

	it("/api/v1/example/todos (POST/PUT/PATCH/DELETE) full CRUD", async () => {
		const server = app.getHttpServer()

		// Mutations need both a session AND the permission for it — a fresh
		// self-registered account gets 403, which is the RBAC gate working. Sign in
		// as the seeded admin so the suite exercises the real guards rather than
		// bypassing them.
		//
		// Requires `pnpm seed` to have run with a known SEED_ADMIN_PASSWORD; the
		// seeder randomises it otherwise (AC-2).
		const signIn = await request(server)
			.post("/api/v1/auth/sign-in/email")
			.send({
				email: process.env.E2E_ADMIN_EMAIL ?? "admin@turbo-template.local",
				password: process.env.E2E_ADMIN_PASSWORD ?? "Password123",
			})
		expect(signIn.status).toBe(200)
		const cookie = ((signIn.headers["set-cookie"] ?? []) as string[]).join("; ")

		// Create
		const created = await request(server)
			.post("/api/v1/example/todos")
			.set("Cookie", cookie)
			.send({ title: "New todo", completed: false })
			.expect(200)
		expect(created.body).toEqual(expect.objectContaining({ title: "New todo", completed: false }))

		const id = created.body.id

		// Replace
		const replaced = await request(server)
			.put(`/api/v1/example/todos/${id}`)
			.set("Cookie", cookie)
			.send({ title: "Replaced todo", completed: true })
			.expect(200)
		expect(replaced.body).toEqual(
			expect.objectContaining({ id, title: "Replaced todo", completed: true })
		)

		// No PATCH: the contract declares GET, POST, PUT and DELETE only. The suite
		// used to exercise a PATCH route that has never existed — asserted here so
		// the absence is deliberate rather than forgotten.
		await request(server)
			.patch(`/api/v1/example/todos/${id}`)
			.set("Cookie", cookie)
			.send({ completed: false })
			.expect(404)

		// Delete
		await request(server).delete(`/api/v1/example/todos/${id}`)
			.set("Cookie", cookie).expect(200)
	})
})
