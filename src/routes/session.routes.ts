import { Router } from "express";
import { SessionController } from "../controllers/session.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { SessionRepository } from "../repositories/session.repository.js";

const sessionController = new SessionController(new SessionRepository());
const router = Router();

router.get("/", requireAuth, requireAdmin, (req, res) => sessionController.list(req, res));
router.get("/:id", requireAuth, requireAdmin, (req, res) => sessionController.getById(req, res));
router.post("/", requireAuth, requireAdmin, (req, res) => sessionController.create(req, res));
router.put("/:id", requireAuth, requireAdmin, (req, res) => sessionController.update(req, res));
router.delete("/:id", requireAuth, requireAdmin, (req, res) => sessionController.cancel(req, res));

export default router;
