// TEMPLATE: jest spec for this repo. Mocks the schema/oRPC/auth/db boundaries,
// then exercises the real controller + service in a TestingModule.
// Placeholders: {{EntityName}} Pascal, {{entityName}} camel, {{table-name}} table.
// Model: apps/backend/src/modules/v1/examples/todos/todos.controller.spec.ts
import { Test, type TestingModule } from "@nestjs/testing"

import type { V1Outputs } from "@/config/contract-types"

import { {{EntityName}}Controller } from "./{{entity-name}}.controller"
import { {{EntityName}}Service } from "./{{entity-name}}.service"

type {{EntityName}} = V1Outputs["{{entityName}}"]["get"]

// Drizzle table: only the columns the service touches need to exist as strings.
jest.mock("@repo/db/schema", () => ({
  {{table-name}}: { id: "id", authorId: "authorId", createdAt: "createdAt", updatedAt: "updatedAt" },
}))

// oRPC: @Implement is a no-op decorator; implement().handler(fn) returns fn so we
// can call the business logic directly.
jest.mock("@orpc/nest", () => ({ Implement: () => () => undefined }))
jest.mock("@orpc/server", () => ({
  implement: jest.fn(() => ({ handler: jest.fn((fn: unknown) => fn) })),
}))

jest.mock("@/config/api-versions.config", () => ({
  v1: { {{entityName}}: { list: {}, get: {}, create: {}, update: {}, delete: {} } },
}))

jest.mock("@thallesp/nestjs-better-auth", () => ({
  AllowAnonymous: () => () => undefined,
  Session: () => () => ({ user: { id: "template-user-id" } }),
}))

jest.mock("@/common/database/database.client", () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
}))

const USER_ID = "template-user-id"
const now = new Date()

describe("{{EntityName}}Controller (v1)", () => {
  let app: TestingModule
  let controller: {{EntityName}}Controller
  let service: {{EntityName}}Service
  let mockDb: { select: jest.Mock; insert: jest.Mock; update: jest.Mock; delete: jest.Mock }

  const make = (o?: Partial<{{EntityName}}>): {{EntityName}} =>
    ({ id: 1, authorId: USER_ID, createdAt: now, updatedAt: now, ...o }) as {{EntityName}}

  beforeEach(async () => {
    mockDb = require("@/common/database/database.client").db
    app = await Test.createTestingModule({
      controllers: [{{EntityName}}Controller],
      providers: [{{EntityName}}Service],
    }).compile()
    controller = app.get({{EntityName}}Controller)
    service = app.get({{EntityName}}Service)
  })

  it("is defined", () => expect(controller).toBeDefined())

  it("findAll returns rows", async () => {
    const rows = [make({ id: 1 }), make({ id: 2 })]
    mockDb.select.mockReturnValueOnce({
      from: jest.fn(() => ({ orderBy: jest.fn(() => Promise.resolve(rows)) })),
    })
    expect(await service.findAll()).toHaveLength(2)
  })

  it("create returns the new row", async () => {
    const row = make({ id: 3 })
    mockDb.insert.mockReturnValueOnce({
      values: jest.fn(() => ({ returning: jest.fn(async () => [row]) })),
    })
    const result = await service.create({ payload: {} as never, authorId: USER_ID })
    expect(result).toMatchObject({ id: 3 })
  })
})
