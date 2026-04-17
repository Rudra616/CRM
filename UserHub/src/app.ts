import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./modules/user/user.routes";
import adminRoutes from "./modules/admin/admin.routes";
import subadminRoutes from "./modules/subadmin/subadmin.routes";
import cookieParser from "cookie-parser";
import { UPLOADS_ROOT } from "./config/uploads";
import { trimBodyStrings } from "./common/middleware/trimBodyMiddleware";
import tickitRoutes from "./modules/tickit/tickit.route";
dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173", // your React
  credentials: true
}));
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));
app.use(trimBodyStrings);
app.use("/uploads", express.static(UPLOADS_ROOT));
app.use(cookieParser());

app.use("/api/admin", adminRoutes);
app.use("/api/subadmin", subadminRoutes);
app.use("/api", userRoutes);
app.use("/api/tickit", tickitRoutes);
export default app;









//11/04/2026
// update pagination service add trim, dropdown add for page limit 5,10,50,100
// use reuseble code for quary 
// role_permission add coloum edit, delete,active ,inactive , delete coloum
// module table remove key use id 
// role table add delete coloum
// tickit ,message  table add and apply in dasboard page 