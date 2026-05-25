import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./modules/user/user.routes";
import adminRoutes from "./modules/admin/admin.routes";
import cookieParser from "cookie-parser";
import { UPLOADS_ROOT } from "./config/uploads";
import ticketRoutes from "./modules/ticket/ticket.route";
import broadcastPublicRoutes from "./modules/broadcast/broadcast.public.routes";

// Load environment variables from .env file
dotenv.config();

/**
 * Express application instance.
 * Handles API routing, middleware, and static file serving.
 */
const app = express();

/**
 * Enable Cross-Origin Resource Sharing (CORS) for the frontend.
 * Allows credentials (cookies, authorization headers) to be sent.
 */
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

/**
 * Parse incoming JSON requests.
 * `strict: false` allows non-object JSON values (like arrays) in the body.
 */
app.use(express.json({ strict: false }));

/**
 * Parse URL-encoded request bodies (HTML form submissions).
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Serve static files from the uploads directory.
 * All files in `UPLOADS_ROOT` will be accessible under `/uploads`.
 */
app.use("/uploads", express.static(UPLOADS_ROOT));

/**
 * Parse cookies attached to client requests.
 */
app.use(cookieParser());

/**
 * API route handlers.
 */
app.use("/api/admin", adminRoutes); // Admin-specific routes
app.use("/api/broadcast", broadcastPublicRoutes); // Public broadcast routes
app.use("/api", userRoutes); // General user routes
app.use("/api/ticket", ticketRoutes); // Ticket management routes

export default app;