export const PERMISSION_MODULE_KEYS = {
  USER: 'user',
  TICKET: 'ticket',
  MESSAGE: 'message',
  MODULE: 'module',
  /** Subadmin accounts CRUD — must match `module.name` in DB (e.g. seed `subadmin`). */
  SUBADMIN: 'subadmin',
} as const;

export type PermissionModuleKey =
  (typeof PERMISSION_MODULE_KEYS)[keyof typeof PERMISSION_MODULE_KEYS];
