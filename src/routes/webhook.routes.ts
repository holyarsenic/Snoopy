import { Router } from "express";
import type { Request, Response } from "express";
import { generateAIResponse } from "../services/ai.service.js";
import { sendWhatsAppMessage, markMessageAsRead } from "../services/whatsapp.service.js";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Webhook verified successfully by Meta.");
    res.status(200).send(challenge);
  } else {
    console.warn("Webhook verification failed. Invalid verify token.");
    res.sendStatus(403);
  }
});

router.post("/", async (req: Request, res: Response) => {
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;

    const senderPhoneNumber = message.from;
    const messageId = message.id;

    const allowedNumbers = (process.env.ALLOWED_PHONE_NUMBERS || "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    if (allowedNumbers.length > 0 && !allowedNumbers.includes(senderPhoneNumber)) {
      console.log(`Dropped message from non-whitelisted sender: ${senderPhoneNumber}`);
      return; 
    }

    await markMessageAsRead(messageId);

    if (message.type === "text") {
      const userText = message.text.body;
      console.log(`Message from ${senderPhoneNumber}: "${userText}"`);

      const reply = await generateAIResponse(senderPhoneNumber, userText);
      await sendWhatsAppMessage(senderPhoneNumber, reply);
      console.log(`Sent reply to ${senderPhoneNumber}`);
    }
  } catch (error) {
    console.error("Error processing webhook message:", error);
  }
});

export default router;