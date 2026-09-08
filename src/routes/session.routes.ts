import { Router } from "express";
import { SessionController } from "../controllers/session.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { SessionRepository } from "../repositories/session.repository.js";

const sessionController = new SessionController(new SessionRepository());
const router = Router();

router.get("/", optionalAuth, (req, res) => sessionController.list(req, res));
export default router;
