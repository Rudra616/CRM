export const PERMISSION_MODULE_KEYS = {
  USER: 'user',
  TICKET: 'ticket',
  MESSAGE: 'message',
  MODULE: 'module',
} as const;

export type PermissionModuleKey =
  (typeof PERMISSION_MODULE_KEYS)[keyof typeof PERMISSION_MODULE_KEYS];
