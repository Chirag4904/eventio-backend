import { Router } from "express";

const router = Router();

// GET /api/health
router.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

export default router;