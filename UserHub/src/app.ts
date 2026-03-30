import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes  from "./modules/user/user.routes";
import adminRoutes from "./modules/admin/admin.routes";
import cookieParser from "cookie-parser";
import { UPLOADS_ROOT } from "./config/uploads";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173", // your React
  credentials: true
}));
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS_ROOT));
app.use(cookieParser());


app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));

app.use("/api/admin", adminRoutes);
app.use("/api",       userRoutes);

export default app;