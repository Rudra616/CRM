
export type RoleString = "admin" | "subadmin" | "user";

export const roleIdToRole = (roleOrId: number | string | undefined): RoleString => {
  if (roleOrId === "admin" || roleOrId === "subadmin" || roleOrId === "user") {
    return roleOrId;
  }
  if (roleOrId === 1) return "admin";
  if (roleOrId === 2) return "subadmin";
  if (roleOrId === 3) return "user";
  return "user";
};
