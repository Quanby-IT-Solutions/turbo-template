// TEMPLATE: Zod schema + oRPC contract (replaces the old class-validator DTO).
// Lives in packages/contracts/src/modules/v1/{{entity-name}}/.
// Placeholders: {{EntityName}} Pascal, {{entityName}} camel, {{endpoint-path}} route path.
// See the orpc-contracts skill for the full schema -> contract -> router flow.
//
// ── {{entity-name}}.schema.ts (NO @orpc import) ─────────────────────────────
import { z } from "zod"

export const {{EntityName}}Schema = z.object({
  id: z.number().int().positive(),
  // add domain fields here, always bounded:
  name: z.string().min(1, "Required").max(255, "Too long"),
  authorId: z.string(),
  createdAt: z.union([z.date(), z.string()]).transform(v => (typeof v === "string" ? new Date(v) : v)),
  updatedAt: z.union([z.date(), z.string()]).transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const Create{{EntityName}}Schema = {{EntityName}}Schema.pick({ name: true })
export const {{EntityName}}IdSchema = z.object({ id: z.coerce.number().int().positive() })
export const Update{{EntityName}}RequestSchema = {{EntityName}}IdSchema.extend(
  Create{{EntityName}}Schema.partial().shape
)

export type {{EntityName}} = z.infer<typeof {{EntityName}}Schema>
export type Create{{EntityName}}Input = z.infer<typeof Create{{EntityName}}Schema>
export type Update{{EntityName}}Request = z.infer<typeof Update{{EntityName}}RequestSchema>

// ── {{entity-name}}.contract.ts (imports schema via .js) ────────────────────
import { oc } from "@orpc/contract"
// import { Create{{EntityName}}Schema, {{EntityName}}IdSchema, {{EntityName}}Schema, Update{{EntityName}}RequestSchema } from "./{{entity-name}}.schema.js"

export const {{entityName}}Contract = {
  list: oc
    .route({ method: "GET", path: "/{{endpoint-path}}", summary: "List {{endpoint-path}}", tags: ["{{EntityName}}"] })
    .output(z.array({{EntityName}}Schema)),
  get: oc
    .route({ method: "GET", path: "/{{endpoint-path}}/{id}", summary: "Get {{entityName}}", tags: ["{{EntityName}}"] })
    .input({{EntityName}}IdSchema)
    .output({{EntityName}}Schema),
  create: oc
    .route({ method: "POST", path: "/{{endpoint-path}}", summary: "Create {{entityName}}", tags: ["{{EntityName}}"] })
    .input(Create{{EntityName}}Schema)
    .output({{EntityName}}Schema),
  update: oc
    .route({ method: "PUT", path: "/{{endpoint-path}}/{id}", summary: "Update {{entityName}}", tags: ["{{EntityName}}"] })
    .input(Update{{EntityName}}RequestSchema)
    .output({{EntityName}}Schema),
  delete: oc
    .route({ method: "DELETE", path: "/{{endpoint-path}}/{id}", summary: "Delete {{entityName}}", tags: ["{{EntityName}}"] })
    .input({{EntityName}}IdSchema)
    .output(z.object({ success: z.boolean(), id: z.number() })),
}
// Register {{entityName}}Contract in packages/contracts/src/modules/v1/v1.contract.ts.
