import db from "../config/db";

/**
 * Fetch permisson record for a specific role and module
 * Ensure then role and module are active and not soft delete
 * 
 * @param roleId ID of the role
 * @param moduleName - Name of the module
 * @returns Role permission record if found
 */
export const getPermissionByRoleAndModule = async (
  roleId: number,
  moduleName: string
) => {
  const [rows]: any = await db.query(
    `
    SELECT rp.*
    FROM role_permission rp
    INNER JOIN module m ON m.id = rp.module_id
    INNER JOIN role r ON r.id = rp.role_id
    WHERE rp.role_id = ?
      AND m.name = ?
      AND COALESCE(m.is_delete, 0) = 0
      AND COALESCE(r.is_delete, 0) = 0
      AND COALESCE(m.status, 'active') = 'active'
      AND COALESCE(r.status, 'active') = 'active'
    LIMIT 1
    `,
    [roleId, moduleName]
  );

  return rows[0] || null;
};