import { Router } from "express";
import { uploadImportFile } from "../../common/middleware/uploadImageMiddleware";
import { bulkimport } from "./bulk_import.controller";
import { requireMainAdmin } from "../../common/middleware/authMiddleware";

const router = Router();

router.post("/import", uploadImportFile.single("file"),  bulkimport);

export default router;
