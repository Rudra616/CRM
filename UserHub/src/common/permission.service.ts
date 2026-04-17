import db from "../config/db";
export const getPermissionByRoleAndModule = async (
  roleId: number,
  moduleName: string
) => {
  const [rows]: any = await db.query(
    `
    SELECT rp.*
    FROM role_permission rp
    INNER JOIN module m ON m.id = rp.module_id
    WHERE rp.role_id = ?
      AND m.name = ?
      AND m.is_delete = 0
    LIMIT 1
    `,
    [roleId, moduleName]
  );

  return rows[0] || null;
};