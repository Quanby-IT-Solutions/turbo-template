---
description: Prohibition of barrel files (index.ts/js files that re-export)
globs: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]
alwaysApply: true
---

# No Barrel Files Rule

## Rule: Prohibit Barrel Files in Applications

**Guideline:** Do NOT create barrel files (index.ts/js files that only re-export from other files) within application code.

**Scope:** This rule primarily applies to code in `apps/`. Package entrypoints are an allowed exception.

### What are Barrel Files?

Barrel files are `index.ts` or `index.js` files that only contain re-export statements like:

```typescript
// ❌ BAD - Barrel file in apps/
export { ComponentA } from "./component-a"
export { ComponentB } from "./component-b"
export { ComponentC } from "./component-c"
```

### Why Avoid Barrel Files?

1. **Bundle Size**: They can increase bundle size due to tree-shaking issues
2. **Performance**: Can cause unnecessary module loading
3. **Complexity**: Add an extra layer of indirection
4. **Debugging**: Make it harder to trace imports and dependencies
5. **Maintenance**: Require constant updates when adding/removing exports

### Acceptable Alternatives

**✅ GOOD - Direct imports:**

```typescript
import { ComponentA } from "./components/component-a"
import { ComponentB } from "./components/component-b"
import { ComponentC } from "./components/component-c"
```

**✅ GOOD - Named imports from specific files:**

```typescript
import { ComponentA, ComponentB } from "./components/shared-components"
```

### Exceptions

#### Allowed `index.ts` Files

**Framework-required entrypoints:**
- Next.js: `app/page.tsx`, `app/layout.tsx`, `app/api/*/route.ts`
- NestJS: `main.ts` (not index, but similar role)

**Package entrypoints (required for workspace imports):**
- `packages/*/src/index.ts` - Package public API exports
- `packages/db/src/schema/index.ts` - Schema re-exports for `@repo/db/schema`
- `packages/contracts/src/index.ts` - Contract re-exports for `@repo/contracts`

**Configuration files with logic:**
- Files that contain actual configuration logic, not just re-exports

### Why Packages are Different

Packages need `index.ts` entrypoints to:
1. Define a clear public API boundary
2. Enable workspace imports (`import { x } from "@repo/pkg"`)
3. Hide internal implementation details
4. Support TypeScript path mapping

```typescript
// ✅ GOOD - Package entrypoint (packages/contracts/src/index.ts)
export * from "./modules/v1/examples/todos.contract.js"
export * from "./common/common.contract.js"
export * from "./utils/dto-generator.js"
```

### Enforcement (within apps)

- No `index.ts` or `index.js` files in component directories
- No `index.ts` or `index.js` files in utility directories
- No `index.ts` or `index.js` files in feature directories
- Import directly from the specific files you need

### Enforcement (within packages)

- One `index.ts` at the package root (`packages/*/src/index.ts`) is required
- Sub-directory barrels allowed only for sub-path exports (e.g., `schema/index.ts` for `@repo/db/schema`)
- Keep internal modules unexported from the public API

---

**Remember:** Direct imports are clearer, more performant, and easier to maintain. Package entrypoints are the exception because they define API boundaries for workspace consumption.
