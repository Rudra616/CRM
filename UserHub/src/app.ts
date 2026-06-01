import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./modules/user/user.routes";
import adminRoutes from "./modules/admin/admin.routes";
import cookieParser from "cookie-parser";
import { UPLOADS_ROOT } from "./config/uploads";
import ticketRoutes from "./modules/ticket/ticket.route";
import broadcastPublicRoutes from "./modules/broadcast/broadcast.public.routes";
import bulkImportRoutes from "./modules/bulk_import/bulk_import.route";
dotenv.config();

const app = express();

app.use(cors({
  origin:process.env.FRONTEND_URL, 
  credentials: true
}));
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS_ROOT));
app.use(cookieParser());

app.use("/api/admin", adminRoutes);
app.use("/api/broadcast", broadcastPublicRoutes);
app.use("/api", userRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/bulkimport", bulkImportRoutes);

export default app;

