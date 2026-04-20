-- Optional: meta-modules for RBAC UI + permission checks (module.name must match middleware keys).
-- Run once on your DB if these rows are missing. Adjust table/column names if your schema differs.

INSERT INTO module (name, status)
SELECT 'module', 'active'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM module WHERE name = 'module' AND COALESCE(is_delete, 0) = 0);

INSERT INTO module (name, status)
SELECT 'role', 'active'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM module WHERE name = 'role' AND COALESCE(is_delete, 0) = 0);

INSERT INTO module (name, status)
SELECT 'role_permission', 'active'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM module WHERE name = 'role_permission' AND COALESCE(is_delete, 0) = 0);
