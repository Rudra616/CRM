import { Router } from "express";
import { uploadImportSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate, requireMainAdmin } from "../../common/middleware/authMiddleware";
import { confirmBulkImport, validateBulkImport } from "./bulk_import.controller";

const router = Router();

/** All bulk import routes require an authenticated main admin. */
router.use(authenticate, requireMainAdmin);

/** POST /api/bulkimport/validate — upload CSV/Excel, return errors + valid rows (no DB writes). */
router.post("/validate", uploadImportSingle("file"), validateBulkImport);

/** POST /api/bulkimport/confirm — start background insert/update from validated rows. */
router.post("/confirm", confirmBulkImport);

export default router;
