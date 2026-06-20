import { Router } from "express";
import { uploadImportValidationSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate, requireMainAdmin } from "../../common/middleware/authMiddleware";
import {
  confirmBulkImportById,
  downloadBulkImportFile,
  downloadBulkImportValidationFile,
  listBulkImports,
  openBulkImportFile,
  openBulkImportValidationFile,
  validateBulkImport,
} from "./bulk_import.controller";

const router = Router();

/** All bulk import routes require an authenticated main admin. */
router.use(authenticate, requireMainAdmin);

router.get("/", listBulkImports);

router.post("/validate", uploadImportValidationSingle("file"), validateBulkImport);

router.post("/:id/confirm", confirmBulkImportById);

router.get("/:id/file", openBulkImportFile);
router.get("/:id/file/download", downloadBulkImportFile);
router.get("/:id/validation", openBulkImportValidationFile);
router.get("/:id/validation/download", downloadBulkImportValidationFile);

export default router;
