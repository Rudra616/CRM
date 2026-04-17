# RBAC Role + Permission Flow (Detailed)

This document explains exactly how your backend role/permission system works:

- How `admin` and `subadmin` are identified
- How `role_id` is assigned during subadmin creation
- How permissions are checked automatically per module/action
- Why API fails when permission is missing
- Which controller/service/middleware files handle each part

---

## 1) Main idea of your system

Your backend uses **2 layers**:

1. **Account role (session role)**
   - `admin`
   - `subadmin`
   - normal `user` session (not admin panel RBAC)

2. **Permission role (RBAC role table)**
   - Stored as `role_id` in `admin` table for subadmins
   - Maps to `role_permission` rows
   - Permission flags:
     - `can_view`
     - `can_add`
     - `can_edit`
     - `can_delete`

So a subadmin is first allowed by account role, then restricted by module permissions.

---

## 2) Where each piece of code is

### A) Auth + role mapping
- `UserHub/src/common/middleware/authMiddleware.ts`
- `UserHub/src/common/types/AuthRequest.ts`
- `UserHub/src/common/types/role.ts`

### B) Permission enforcement middleware
- `UserHub/src/common/middleware/permission.middleware.ts`
- `UserHub/src/common/permission.service.ts`

### C) Role/module/permission management (RBAC CRUD)
- `UserHub/src/modules/admin/service/rbac.service.ts`
- `UserHub/src/modules/admin/controller/rbac.controller.ts`
- `UserHub/src/modules/admin/admin.routes.ts`

### D) Subadmin creation + role assignment
- `UserHub/src/modules/admin/controller/subadmin.controller.ts`
- `UserHub/src/modules/admin/service/subadmin.service.ts`

---

## 3) Login and request identity flow

### Step 1: Login creates token session

- Admin login: `POST /api/admin/login`
  - `UserHub/src/modules/admin/controller/admin.controller.ts`
- Subadmin login: `POST /api/subadmin/login`
  - `UserHub/src/modules/admin/controller/subadmin.self.controller.ts`

Both store token in `admin_token` table via:
- `UserHub/src/modules/token.service.ts` -> `upsertAdminToken(...)`

### Step 2: `authenticate` middleware rebuilds user context

`authenticate` reads cookie token, verifies JWT, verifies token row in DB, then loads admin row and writes `req.user`.

Code block:

```ts
const numericRole = adminRoleToNumeric(adminRow.role);
authReq.user = {
  id: Number(decoded.id),
  role: numericRole,
  role_id: adminRow.role_id ?? undefined,
  adminRole: adminRow.role,
};
```

Line-by-line meaning:

1. `adminRoleToNumeric(adminRow.role)`:
   - Converts DB string role to numeric enum:
   - `"admin"` -> `Role.ADMIN` (`1`)
   - `"subadmin"` -> `Role.SUBADMIN` (`2`)
2. `id`:
   - Current logged-in admin/subadmin id.
3. `role`:
   - Used by `allowRoles(...)` middleware.
4. `role_id`:
   - RBAC permission role id from DB.
   - Critical for module permission checks.
5. `adminRole`:
   - String role for convenience (`admin`/`subadmin`).

If this middleware is not run first, permission checks cannot work because `req.user` is missing.

---

## 4) Automatic permission check flow (why it "works automatically")

In routes, middlewares run in order. Example from `admin.routes.ts`:

```ts
router.get(
  "/users",
  authenticate,
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("user", "can_view"),
  getUsers,
);
```

Execution order:

1. `authenticate`:
   - Build `req.user` from token.
2. `allowRoles(Role.ADMIN, Role.SUBADMIN)`:
   - Only admin/subadmin allowed.
   - If normal user session -> `403 Forbidden`.
3. `checkPermission("user", "can_view")`:
   - For admin: bypass success.
   - For subadmin: query DB permission row.
4. Controller executes only if all checks pass.

This is why it looks automatic: route middleware chain enforces every request before controller logic.

---

## 5) What happens when permission is missing

File: `UserHub/src/common/middleware/permission.middleware.ts`

Core logic:

```ts
if (!user) {
  return res.status(401).json({ message: "Unauthorized" });
}

if (user.role === Role.ADMIN) {
  return next();
}

if (!user.role_id) {
  return res.status(403).json({ message: "No role assigned" });
}

const permission = await getPermissionByRoleAndModule(user.role_id, moduleName);
if (!permission) {
  return res.status(403).json({ message: "No permission setup" });
}

if (permission[action] !== 1) {
  return res.status(403).json({ message: "Permission denied" });
}

next();
```

Line-by-line behavior:

1. `!user`:
   - No authenticated user in request.
   - Return `401`.
2. `user.role === Role.ADMIN`:
   - Admin bypasses per-module flags.
   - Continue immediately.
3. `!user.role_id`:
   - Subadmin has no permission role assigned.
   - Return `403 No role assigned`.
4. `getPermissionByRoleAndModule(...)`:
   - Read one row from DB for this role + module name.
5. `!permission`:
   - No row exists in `role_permission`.
   - Return `403 No permission setup`.
6. `permission[action] !== 1`:
   - Row exists but specific action flag is off (0).
   - Return `403 Permission denied`.
7. `next()`:
   - Permission valid, controller continues.

So when you "do not give permission", request is rejected in middleware before controller.

---

## 6) DB lookup used by permission middleware

File: `UserHub/src/common/permission.service.ts`

```ts
SELECT rp.*
FROM role_permission rp
INNER JOIN module m ON m.id = rp.module_id
WHERE rp.role_id = ?
  AND m.name = ?
  AND m.is_delete = 0
LIMIT 1
```

Meaning:

1. Find permission row by role id.
2. Match module by exact module name string (`m.name = ?`).
3. Ignore soft-deleted modules (`is_delete = 0`).
4. Return at most one row.

Important:
- The module name in `checkPermission("user", ...)` must exactly match `module.name` in DB.

---

## 7) How subadmin gets permission role automatically

File: `UserHub/src/modules/admin/controller/subadmin.controller.ts`

Create flow:

1. Read `role_id` from request body.
2. Validate integer and positive.
3. Validate role exists with `findRoleById(roleId)`.
4. Insert subadmin with that `role_id`.

Insert is done here:
- `UserHub/src/modules/admin/service/subadmin.service.ts` -> `insertSubadmin(...)`

Insert query stores:

```sql
role = 'subadmin',
role_id = ?
```

After this, every future request by that subadmin carries `role_id` through `authenticate`, so permission middleware can check module flags.

---

## 8) RBAC management endpoints (admin side)

All in `UserHub/src/modules/admin/admin.routes.ts`:

- `GET /api/admin/modules`
- `POST /api/admin/modules`
- `GET /api/admin/roles`
- `POST /api/admin/roles`
- `GET /api/admin/roles/:roleId/permissions`
- `PUT /api/admin/roles/:roleId/permissions`

Service behavior:
- `replaceRolePermissions(...)` in `rbac.service.ts`:
  - Start transaction
  - `DELETE` old permissions for role
  - `INSERT` normalized rows for selected modules
  - Commit transaction

This ensures role permissions are replaced cleanly and stay consistent.

---

## 9) Why some routes use `checkPermission` and others do not

In `admin.routes.ts`, user management list/update/delete has permission checks for module `"user"`.

Examples:
- Users list -> `checkPermission("user", "can_view")`
- User status edit -> `checkPermission("user", "can_edit")`
- User delete -> `checkPermission("user", "can_delete")`

If you add new feature modules (example `"ticket"`), you should protect routes same way:

```ts
checkPermission("ticket", "can_view")
checkPermission("ticket", "can_add")
checkPermission("ticket", "can_edit")
checkPermission("ticket", "can_delete")
```

Then assign that module permissions in role editor.

---

## 10) Full request lifecycle example

Example: subadmin calls `GET /api/admin/users`

1. Browser sends cookie token.
2. `authenticate` validates token and DB session.
3. `authenticate` loads admin row and attaches:
   - `req.user.role = SUBADMIN`
   - `req.user.role_id = <assigned role id>`
4. `allowRoles(ADMIN, SUBADMIN)` passes.
5. `checkPermission("user", "can_view")` queries `role_permission`.
6. If `can_view = 1`, controller `getUsers` runs.
7. If missing/0, middleware returns `403`, controller never runs.

---

## 11) Common failure reasons and where to check

1. `403 No role assigned`
   - Subadmin record has `role_id` null.
   - Check `admin` table row.

2. `403 No permission setup`
   - No row in `role_permission` for `role_id + module_id`.
   - Check role permission mapping.

3. `403 Permission denied`
   - Row exists but requested action flag is 0.

4. Permission never matches
   - `checkPermission("...")` module name differs from DB `module.name`.

5. Route still accessible unexpectedly
   - Route missing `checkPermission(...)`.
   - Admin will always bypass by design.

---

## 12) Recommended coding pattern for new modules

When adding a new backend module:

1. Add module name in DB (`module` table), e.g. `ticket`.
2. Add routes with middleware chain:
   - `authenticate`
   - `allowRoles(...)`
   - `checkPermission("ticket", "<action>")`
3. Configure role permissions for module in admin panel.
4. Assign proper `role_id` to subadmin accounts.

If all 4 are done, permission handling works automatically.

---

## 13) Quick map of key files

- Auth identity builder: `UserHub/src/common/middleware/authMiddleware.ts`
- Role enums/types: `UserHub/src/common/types/role.ts`
- Request user shape: `UserHub/src/common/types/AuthRequest.ts`
- Permission guard: `UserHub/src/common/middleware/permission.middleware.ts`
- Permission DB query: `UserHub/src/common/permission.service.ts`
- RBAC service: `UserHub/src/modules/admin/service/rbac.service.ts`
- RBAC controller: `UserHub/src/modules/admin/controller/rbac.controller.ts`
- Admin RBAC routes: `UserHub/src/modules/admin/admin.routes.ts`
- Subadmin create/update: `UserHub/src/modules/admin/controller/subadmin.controller.ts`
- Subadmin insert/update queries: `UserHub/src/modules/admin/service/subadmin.service.ts`

---

This is your current backend behavior: **admin is global allow**, **subadmin is role-based allow/deny per module action**, and denial happens in middleware before business controller logic.
