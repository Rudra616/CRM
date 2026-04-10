# UserHub Fullstack Learning Sheet

This sheet explains your project end-to-end in simple but deep terms:

- What each folder/layer does
- How backend request flow works
- How frontend route/state/API flow works
- How search + pagination works
- How auth/cookies/token tables work
- How role/module/role_permissions tables are used
- Why some data is updated (not inserted) on login

---

## 1) High-Level Architecture

Project has two main apps:

- `UserHub` -> Node.js + Express + MySQL backend API
- `react` -> React frontend (role-based dashboard UI)

Flow:

1. User interacts with React page.
2. React calls backend API using Axios (`withCredentials: true`).
3. Backend middleware validates auth + role + request body.
4. Controller handles HTTP concerns.
5. Service runs SQL against MySQL.
6. Controller sends standard JSON response.

---

## 2) Backend Structure (`UserHub/src`)

### Core entry

- `app.ts`
  - initializes Express
  - applies global middleware
  - mounts route groups:
    - `/api` -> user routes
    - `/api/admin` -> admin routes
    - `/api/subadmin` -> subadmin routes

### Common layer

- `common/middleware`
  - `authMiddleware.ts` -> authentication + role authorization
  - `joiValidationMiddleware.ts` -> Joi body validation
  - `uploadImageMiddleware.ts` -> multer uploads
  - `trimBodyMiddleware.ts` -> trims all string values in body

- `common/helpers`
  - `common.helper.ts` -> bcrypt, JWT, file helpers
  - `cookie.helper.ts` -> set/clear auth cookies
  - `user.helper.ts` -> password reset email
  - `serviceError.ts` -> uniform service error logs
  - `middleware.service.ts` -> re-export helper

- `common/utils`
  - `apiResponse.ts` -> `successResponse` and `errorResponse`

- `common/types`
  - `role.ts` -> `Role.ADMIN=1`, `Role.SUBADMIN=2`
  - `AuthRequest.ts` -> typed `req.user`
  - `user.ts` -> user/admin DTO interfaces

### Modules

- `modules/user`
  - public + user self APIs (register/login/profile/password reset)
- `modules/admin`
  - admin self APIs, subadmin management, user management, RBAC management
- `modules/subadmin`
  - subadmin self APIs (profile/password)
- `modules/token.service.ts`
  - DB-backed session token management (`user_token`, `admin_token`)

---

## 3) Backend Request Lifecycle (Very Important)

Example: `GET /api/admin/users?page=1&status=active&search=john`

1. Route match in `admin.routes.ts`
2. `authenticate` middleware runs
3. `allowRoles(Role.ADMIN, Role.SUBADMIN)` checks role
4. Controller `getUsers` parses query
5. Service `getUsersPaginated` builds SQL + count query
6. Controller returns:
   - `items`
   - `pagination: page, limit, total, totalPages`

This same pattern repeats across nearly all endpoints.

---

## 4) Authentication + Cookies + Token Tables

### Cookie model

Backend stores JWT in cookie `token` using `setAuthCookie`.

Cookie options include:

- `httpOnly: true` -> JavaScript cannot read token directly
- `sameSite: "lax"` -> CSRF mitigation
- `path: "/"`, `maxAge: 1 day`

Frontend does not decode token directly; backend verifies token and returns profile/session data via APIs.

### Why DB token tables (`user_token`, `admin_token`)?

`authenticate` checks both:

- JWT validity (`verifyToken`)
- DB row existence (`findUserToken` / `findAdminToken`)

This gives:

- server-side revocation (delete row -> force logout immediately)
- session control
- expiry checks at DB + JWT layers

### Why login does not insert multiple rows each time?

`upsertUserToken` / `upsertAdminToken` logic:

- if token row exists for account -> `UPDATE` existing row
- else -> `INSERT`

Purpose:

- one active row per account (clean)
- avoids token table growth
- easier force logout by user/admin id

---

## 5) Authorization Model

### Role gate

`allowRoles(...)` uses numeric role in `req.user.role`.

- Admin routes -> `Role.ADMIN`
- Subadmin routes -> `Role.SUBADMIN`
- Shared routes -> both

### RBAC data model

Tables used:

- `module` (feature units)
- `role` (named roles)
- `role_permissions` (role_id <-> module_id mapping)

Current project stores/edits RBAC mappings and uses role-based route guards. Module-level runtime gate middleware was intentionally removed in your recent changes.

---

## 6) Controllers vs Services (Purpose Split)

### Controller responsibilities

- parse request params/query/body
- call service methods
- choose HTTP response code/message
- convert to `successResponse` / `errorResponse`

### Service responsibilities

- SQL and DB transactions
- return data to controller
- log internal errors via `logServiceError`
- rethrow error to controller

This separation keeps HTTP and database logic clean.

---

## 7) Search + Pagination Deep Explanation

Main implementation: `modules/admin/service/user.service.ts -> getUsersPaginated`

Steps:

1. `offset = (page - 1) * limit`
2. Build base SQL from `user` table
3. Add `status` filter if provided
4. Add `search` filter with `LIKE` on:
   - `first_name`, `last_name`, `username`, `email`, `gender`
5. Add `ORDER BY id DESC LIMIT ? OFFSET ?`
6. Execute second count query with same filters
7. Return `{ items, total }`

Controller computes `totalPages = ceil(total / limit)` and sends pagination metadata.

---

## 8) Important Backend Modules

### User module

- Register -> creates user with `pending` status
- Login -> only `active` users can log in
- Profile get/update
- Forgot/reset password via email token
- Change password -> clears all user sessions

### Admin module

- Admin login/profile/change-password
- Dashboard summary counts
- Subadmin CRUD
- User management:
  - list users
  - update status
  - full update
  - admin-forced logout
  - soft delete
- RBAC module/role/permission management

### Subadmin module

- Subadmin login/profile/change-password
- Uses admin table row where role is `subadmin`

---

## 9) Upload/Image Path Strategy

From `config/uploads.ts` + upload middleware:

- role folder mapping:
  - admin -> `uploads/admin/{id}`
  - subadmin -> `uploads/subadmin/{id}`
  - user -> `uploads/user/{id}`

`buildStoredImagePath(...)` stores relative path in DB.
`buildImageUrl(req, filePath)` builds full URL in responses.

---

## 10) Frontend Structure (`react/src`)

### App boot

- `main.tsx` -> renders `App`
- `app/App.tsx`
  - wraps app in router
  - applies providers
  - renders navbar + routes + toast + server-down overlay

### Global providers

- `app/providers.tsx`
  - `AuthProvider`
  - `SidebarProvider`

### Routing

- `app/routes.tsx`
  - public routes: login/register/forgot/reset
  - protected dashboard routes under `ProtectedRoute + DashboardLayout`
  - role-specific route restrictions via `roles` prop

### Route protection

- `shared/components/ProtectedRoute.tsx`
  - checks auth loading
  - redirects unauthenticated users to correct login path
  - redirects wrong-role users to their own dashboard

---

## 11) Frontend Session & Auth Flow

### Axios config

- `shared/api/axiosClient.ts`
  - `withCredentials: true` (critical for cookies)
  - handles network down status
  - on 401:
    - clears client auth storage
    - redirects to login for non-auth pages
  - on 403:
    - does NOT wipe session (valid login but forbidden action)

### Request wrapper

- `shared/api/apiWrapper.ts`
  - common request function
  - standardized error extraction
  - logs request/response diagnostics in console

### Auth context

- `context/AuthContext.tsx`
  - stores `user`, `isAuthenticated`, `isLoading`
  - `login()` normalizes role and caches user in storage
  - bootstraps session from storage first, then profile API fallback
  - role-aware logout API calls (`/logout`, `/admin/logout`, `/subadmin/logout`)

---

## 12) Frontend Feature Modules

### Auth pages

- `Login`, `Register`, `ForgotPassword`, `ResetPassword`
- API hooks in `modules/auth/api/auth.api.ts`

### Admin pages

- `AdminDashboard` (summary cards from `/admin/dashboard-summary`)
- `ManageUsers` (search/filter/pagination/actions by role)
- `ManageSubadmins` (CRUD UI)
- `ManagePermissions` (module/role/role-permission UI)

### Subadmin pages

- `SubadminDashboard`
- subadmin user listing uses admin users endpoint but limited by role on backend

### User pages

- `Profile`
- `ChangePassword`
- `UserDashboard`

---

## 13) Where “what is used” in frontend

- API layer:
  - `modules/*/api/*.ts` -> request builders
- UI page:
  - page components call API functions and render table/forms/cards
- Shared UI:
  - `PageShell`, `EditUserModal`, `Sidebar`, `Navbar`
- Shared logic:
  - validation, role mapping, auth session utils

---

## 14) Common Mistakes to Avoid

1. Parsing body after using trim middleware (wrong order)
2. Using `allowRoles` without `authenticate`
3. Trusting JWT only without DB token row check
4. Not deleting sessions after password/status changes
5. Not mirroring query filters in count query (pagination mismatch)
6. Returning raw SQL/stack errors to client

---

## 15) Suggested Study Order

1. `UserHub/src/app.ts`
2. `common/middleware/authMiddleware.ts`
3. `modules/user` (routes -> controller -> service)
4. `modules/admin` (especially user + subadmin + RBAC flows)
5. `modules/token.service.ts`
6. React `app/routes.tsx`, `ProtectedRoute.tsx`, `AuthContext.tsx`
7. Admin pages `ManageUsers` and `ManagePermissions`

---

## 16) Inferred DB Schema Notes (from queries)

I could not find an SQL dump file in the workspace, so this model is inferred from service queries:

- `user`
  - id, username, password, first_name, last_name, phone, email, gender, image_url, status
- `admin`
  - id, username, password, first_name, last_name, phone, email, gender, image_url, role, status
- `user_token`
  - id, user_id, username, token, expires_at, updated_at
- `admin_token`
  - id, admin_id, username, token, expires_at, updated_at
- `module`
  - id, key, name, status
- `role`
  - id, name, status
- `role_permissions`
  - role_id, module_id

Recommended constraints:

- unique username/email where needed
- foreign keys:
  - `user_token.user_id -> user.id`
  - `admin_token.admin_id -> admin.id`
  - `role_permissions.role_id -> role.id`
  - `role_permissions.module_id -> module.id`
- unique (`role_id`, `module_id`)

---

## 17) Final Mental Model

Think of your app as:

- **Backend**: secure stateful auth + role-protected APIs + service-layer SQL
- **Frontend**: route/role-driven UI + context state + consistent API wrapper

If something breaks, debug in this order:

1. Network request path/method/body
2. Route middleware chain
3. Controller param/body parsing
4. Service SQL + DB rows
5. Response mapping back to frontend state

