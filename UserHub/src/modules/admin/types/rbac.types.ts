export type ModuleRow = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

export type ModuleTableRow = ModuleRow & {
  created_at?: Date;
  updated_at?: Date;
};

export type RoleRow = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

export type RoleTableRow = RoleRow & {
  created_at?: Date;
  updated_at?: Date;
};

export type RolePermissionRow = {
  module_id: number;
  can_view: 0 | 1;
  can_add: 0 | 1;
  can_edit: 0 | 1;
  can_delete: 0 | 1;
};

export type RolePermissionInput = {
  module_id: number;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

/** One row from getMyPermissionsByRoleId (API /me/permissions for delegated staff). */
export type MyPermissionRow = {
  module_name: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};
