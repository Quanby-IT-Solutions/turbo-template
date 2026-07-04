# Sample Project — Development Tickets

A small, self-contained sample for testing `tickets-to-issues.mjs`. Four tickets across two epics, in the exact format the script parses. Put this at `docs/TICKETS.md` and run a dry run.

---

## 1. Epic map

| Epic key | Label | Note |
|---|---|---|
| `foundation` | Foundation & Auth | Walking skeleton + one enforced permission check. |
| `notes` | Notes Feature | Create, view, and delete personal notes. |

---

## 2. Build order

**Release 1 — walking skeleton**
1. **F1** — Walking skeleton: login → authenticated shell → audit
2. **F2** — Role & permission model + one enforced check

**Release 2 — the feature**
3. **NOTE-1** — Create and view a note
4. **NOTE-2** — Delete a note

---

## 3. Full tickets

### Epic: `foundation`

---

**Title:** [F1] Walking skeleton — authenticated shell with audit
**Epic:** `foundation`
**Problem / context:** Release 1. Before any feature we prove the stack end to end: the app talks to the database, a user can log in, and an audit row is written. Thinnest slice that exercises all of it.
**User story:** As a registered user, I want to log in and reach an authenticated home page so that I know the app, database, and audit trail are wired correctly.
**Acceptance criteria:**
- *Given* valid credentials, *when* the user submits login, *then* a session is established and they land on an authenticated shell showing their name.
- *Given* invalid credentials, *when* they submit, *then* login is rejected with a generic error and no session is created.
- *Given* a successful login, *when* the session starts, *then* an audit record (user id, action `login`, timestamp) is written.
**In scope:** Login/logout, session handling, one authenticated route, a `user` and `audit_log` table, a reusable `writeAudit()` helper.
**Out of scope:** Roles/permissions (F2); any feature work (NOTE-1, NOTE-2).
**Technical notes:** Hash passwords; parameterized queries only. The `writeAudit()` helper here is reused by every later ticket.
**Definition of done:** Code + tests merged · acceptance criteria pass · audit row verified · PR reviewed · docs updated.
**Dependencies:** none.

---

**Title:** [F2] Role & permission model with one enforced check
**Epic:** `foundation`
**Problem / context:** Release 1. Establishes the permission model and proves enforcement on exactly one route.
**User story:** As a user with `roles.manage` permission, I want to assign roles and have them enforced on a protected action so that access control is real from day one.
**Acceptance criteria:**
- *Given* the schema, *when* an admin assigns a role, *then* the user's permissions reflect the role's grants.
- *Given* a user lacking `roles.manage`, *when* they call the role-admin route, *then* it is denied with 403 and the denial is audited.
- *Given* a user with `roles.manage`, *when* they call it, *then* it succeeds.
**In scope:** `role`, `permission`, `role_permissions`, `user_roles` tables; permission-check middleware; enforcement on one route; audit of denials.
**Out of scope:** A full permission-admin UI; feature work.
**Technical notes:** Permission keys `module.submodule.action`. Reuse F1 `writeAudit()`.
**Definition of done:** Code + tests merged · acceptance criteria pass · audit/permission checks verified · PR reviewed · docs updated.
**Dependencies:** F1.

---

### Epic: `notes`

---

**Title:** [NOTE-1] Create and view a personal note
**Epic:** `notes`
**Problem / context:** Release 2. The feature's walking skeleton: a signed-in user creates a note and sees it in a list. One vertical slice through data → API → UI.
**User story:** As a user with `notes.create` permission, I want to create a note and see it in my list so that I can capture and review my notes.
**Acceptance criteria:**
- *Given* the create form, *when* a permitted user submits a title and body, *then* the note is saved and appears in their list.
- *Given* a missing title, *when* they submit, *then* save is blocked with a validation message.
- *Given* a user lacking `notes.create`, *when* they submit, *then* it is denied with 403 and audited.
- *Given* a note is created, *when* it saves, *then* the action is audited.
**In scope:** `note` table (title, body, owner); create form; list view scoped to the current user.
**Out of scope:** Editing; deleting (NOTE-2); sharing.
**Technical notes:** Reuse F1 audit + F2 permission check. List query filtered to the owner.
**Definition of done:** Code + tests merged · acceptance criteria pass · audit/permission checks verified · PR reviewed · docs updated.
**Dependencies:** F1, F2.

---

**Title:** [NOTE-2] Delete a personal note
**Epic:** `notes`
**Problem / context:** Release 2. Lets a user remove a note they own.
**User story:** As a user with `notes.delete` permission, I want to delete one of my notes so that I can remove things I no longer need.
**Acceptance criteria:**
- *Given* a note I own, *when* I delete it, *then* it is removed from my list and the deletion is audited.
- *Given* a note I do not own, *when* I attempt to delete it, *then* it is denied with 403 and audited.
- *Given* a user lacking `notes.delete`, *when* they attempt it, *then* it is denied with 403 and audited.
**In scope:** Delete action; ownership check; audit of deletions.
**Out of scope:** Soft-delete / trash; bulk delete.
**Technical notes:** Ownership enforced server-side. Reuse F2 permission check + F1 audit.
**Definition of done:** Code + tests merged · acceptance criteria pass · audit/permission checks verified · PR reviewed · docs updated.
**Dependencies:** NOTE-1.
