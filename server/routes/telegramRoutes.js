import { Router } from "express";
import { handleTelegramWebhook } from "../controllers/telegramWebhookController.js";

const router = Router();

router.post("/webhook", handleTelegramWebhook);

export default router;
