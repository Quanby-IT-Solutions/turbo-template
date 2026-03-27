---
description: Always utilize project custom agents and skills for implementation tasks
globs: ["**/*"]
alwaysApply: true
---

# Agent & Skill Utilization Rule

## Rule: Always Use Matching Agents and Skills

Before starting any implementation, debugging, or review task, you MUST check and utilize the project's custom agents and skills.

### Skills (`.claude/skills/`)

When a task matches a skill's trigger description, **load that skill first** for specialized context before writing code:

| Skill | Trigger |
|-------|---------|
| `drizzle-postgres` | Database schema, migrations, queries, relations |
| `orpc-contracts` | API endpoints, Zod schemas, contract definitions |
| `nestjs-framework` | NestJS modules, controllers, services, guards |
| `better-auth` | Authentication, sessions, OAuth, auth guards |
| `nextjs-app-router` | Pages, layouts, route handlers, RSC |
| `tailwind-shadcn` | Styling, UI components, themes |
| `tanstack-query-orpc` | Data fetching hooks, cache, prefetching |
| `turborepo-monorepo` | Workspace config, package management |
| `docker-deployment` | Dockerfiles, docker-compose, images |
| `ci-cd-pipelines` | GitHub Actions, deployment pipelines |
| `aws-infrastructure` | Terraform, ECS, ALB, CloudWatch |
| `testing-strategies` | Unit tests, E2E tests, mocking |
| `error-handling-logging` | Exception filters, logging, observability |
| `security-hardening` | Auth, CORS, input validation, secrets |
| `vercel-react-best-practices` | React/Next.js performance patterns |
| `web-design-guidelines` | UI review, accessibility, UX audit |

### Agents (`.claude/agents/`)

For substantial implementation tasks, **delegate to the matching agent**:

| Agent | Use For |
|-------|---------|
| `backend-developer` | NestJS backend work, oRPC endpoints, Drizzle schema |
| `web-frontend-developer` | Next.js frontend, React components, TanStack Query |
| `fullstack-developer` | Cross-layer tasks spanning backend + frontend |
| `flutter-expert` | Flutter mobile app development |
| `code-reviewer` | Code reviews and quality checks |
| `devops-infra` | Infrastructure, deployment, CI/CD |

### What NOT To Do

- Do NOT fix backend TypeScript errors without loading `nestjs-framework` or `orpc-contracts` skills
- Do NOT modify database schemas without loading `drizzle-postgres` skill
- Do NOT implement frontend features without loading `nextjs-app-router` and `tailwind-shadcn` skills
- Do NOT do everything in the main conversation when a specialized agent exists for the task
