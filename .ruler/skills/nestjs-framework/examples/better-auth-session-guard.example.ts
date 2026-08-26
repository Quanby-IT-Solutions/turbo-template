/**
 * EXAMPLE: Authentication & authorization in this repo.
 *
 * There is NO JWT, NO Passport, NO AuthGuard('jwt'). Auth is Better Auth cookie
 * sessions. This file shows the three real mechanisms:
 *   1. @AllowAnonymous() / @Session() in a controller
 *   2. A custom guard that resolves the session itself (order-independent)
 *   3. @RequirePermissions() enforced by the global RbacGuard
 *
 * Real sources: apps/backend/src/shared/guards/rbac.guard.ts,
 * apps/backend/src/modules/v1/examples/todos/todos.controller.ts
 */
import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common"
import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { fromNodeHeaders } from "better-auth/node"
import type { IncomingHttpHeaders } from "http"
import { AllowAnonymous, Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { getAuth } from "@repo/auth"
import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

// ── 1. Controller: public vs authenticated ─────────────────────────────────
@Controller()
export class ProfileController {
  // Public: no session required. Without @AllowAnonymous the library's global
  // AuthGuard rejects requests that carry no valid session cookie.
  @AllowAnonymous()
  @Implement(v1.health.check)
  async publicRoute() {
    return implement(v1.health.check).handler(async () => ({ ok: true }))
  }

  // Authenticated: @Session() yields the verified user. authorId ALWAYS comes
  // from the session, never from client input.
  @RequirePermissions("me:read")
  @Implement(v1.me.get)
  async me(@Session() session: UserSession) {
    return implement(v1.me.get).handler(async () => ({ id: session.user.id }))
  }
}

// ── 2. A custom guard that does NOT depend on global-guard order ────────────
// The library attaches request.session in its OWN guard, but global guard order
// is not guaranteed — a custom guard may run first and see undefined. So resolve
// the session directly from the request headers (the same mechanism the library
// uses), attach it for downstream @Session() consumers, then fail closed.
@Injectable()
export class RequireSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: IncomingHttpHeaders
      session?: { user?: { id?: string } }
      user?: { id?: string }
    }>()

    let userId = request.session?.user?.id ?? request.user?.id
    if (!userId) {
      const session = await getAuth().api.getSession({ headers: fromNodeHeaders(request.headers) })
      if (session) {
        request.session = session
        request.user = session.user
        userId = session.user?.id
      }
    }
    if (!userId) throw new UnauthorizedException("Authentication required")
    return true
  }
}

// ── 3. Permission enforcement ───────────────────────────────────────────────
// @RequirePermissions(...names) is read by the GLOBAL RbacGuard (APP_GUARD in
// app.module.ts) with AND semantics — the caller must hold every listed
// permission. RbacService fails closed on unknown/misspelled names, and the
// Admin role short-circuits to allow. You do NOT add the guard per-controller;
// it is global and inert until the decorator appears.
//
//   @RequirePermissions("posts:create")        // single
//   @RequirePermissions("posts:edit", "posts:publish") // must hold BOTH
//
// Sessions are pinned: 7-day absolute lifetime, 1-day sliding renewal, cookie
// cache OFF (a signed-cookie cache would outlive revocation). Cookies are
// httpOnly + sameSite=lax + secure-in-prod. See the better-auth skill.
