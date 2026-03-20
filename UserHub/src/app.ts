import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import path from "path";

dotenv.config();
const app = express();

app.use(cors());

// safer parsing
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api", authRoutes);

export default app;





