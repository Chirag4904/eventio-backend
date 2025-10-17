import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import eventRoutes from "./routes/event.routes.ts";
import healthRoutes from "./routes/health.routes.ts";
import authRoutes from "./routes/auth.routes.ts";
import { authenticate } from "./middlewares/authenticate.ts";
import userRoutes from "./routes/user.routes.ts";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

// Routes
app.use("/api/health", healthRoutes);
// mount user routes without global auth, route-level middleware will protect '/me'
app.use("/api/user", authenticate,userRoutes);
app.use("/api/events", authenticate, eventRoutes);

export default app;
