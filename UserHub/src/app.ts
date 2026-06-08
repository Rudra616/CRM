/**
 * Express application setup: CORS, body parsers, static uploads, and API route mounts.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./modules/user/user.routes";
import adminRoutes from "./modules/admin/admin.routes";
import cookieParser from "cookie-parser";
import { UPLOADS_ROOT } from "./config/uploads";
import { BULK_IMPORT_MAX_FILE_BYTES } from "./common/helpers/constant";
import ticketRoutes from "./modules/ticket/ticket.route";
import broadcastPublicRoutes from "./modules/broadcast/broadcast.public.routes";
import bulkImportRoutes from "./modules/bulk_import/bulk_import.route";
dotenv.config(); // Load environment variables

const app = express(); // Create Express application instance

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
})); // Enable CORS for frontend requests

app.use(express.json({ strict: false, limit: BULK_IMPORT_MAX_FILE_BYTES })); // Parse JSON request bodies

app.use(express.urlencoded({ extended: true, limit: BULK_IMPORT_MAX_FILE_BYTES })); // Parse URL-encoded request bodies

app.use("/uploads", express.static(UPLOADS_ROOT)); // Serve uploaded files

app.use(cookieParser()); // Parse request cookies

app.use("/api/admin", adminRoutes); // Register admin routes
app.use("/api/broadcast", broadcastPublicRoutes); // Register public broadcast routes
app.use("/api", userRoutes); // Register user routes
app.use("/api/ticket", ticketRoutes); // Register ticket routes
app.use("/api/bulkimport", bulkImportRoutes); // Register bulk import routes

export default app; // Export configured Express app