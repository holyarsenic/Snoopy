import express from "express";
import "dotenv/config";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { generateAIResponse } from "./services/ai.service.js";

const { Client, LocalAuth } = pkg;
const app = express();
const port = process.env.PORT || 3000;

// Toggle state for auto-reply
let isBotEnabled = true;

// Load allowed phone numbers
const allowedNumbers = (process.env.ALLOWED_PHONE_NUMBERS || "").split(",").map((n) => n.trim()).filter(Boolean);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ON/OFF Control
app.get("/", (_req, res) => {
  res.send(`WhatsApp AI Bot is ${isBotEnabled ? "ON" : "OFF"}`);
});

app.get("/on", (_req, res) => {
  isBotEnabled = true;
  console.log("Bot auto-reply turned ON");
  res.send("Bot auto-reply is now ON");
});

app.get("/off", (_req, res) => {
  isBotEnabled = false;
  console.log("Bot auto-reply turned OFF");
  res.send("Bot auto-reply is now OFF");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// WhatsApp Web Client

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.DATA_PATH || ".wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  },
});

client.on("qr", (qr) => {
  console.log("\nScan this QR code in WhatsApp (Settings > Linked Devices):\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("\nPersonal AI Bot is ONLINE!");
  console.log(`Allowed numbers: ${allowedNumbers.join(", ") || "All"}\n`);
});

client.on("message", async (msg) => {
  try {
    // Skip if bot is OFF, message is from you, empty, or from a group
    if (!isBotEnabled || msg.fromMe || !msg.body) return;

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    let sender = msg.from.replace("@c.us", "");

    if (msg.from.endsWith("@lid")) {
      const [resolved] = await client.getContactLidAndPhone([msg.from]);
      if (resolved?.pn) {
        sender = resolved.pn.replace("@c.us", "");
      } else {
        const contact = await msg.getContact();
        sender = contact.number || msg.from;
      }
    }

    // Only reply to whitelisted numbers
    if (allowedNumbers.length > 0 && !allowedNumbers.includes(sender)) {
      console.log(`Ignored message from: ${sender}`);
      return;
    }

    console.log(`[${sender}]: "${msg.body}"`);

    await chat.sendStateTyping();
    await sleep(2500);

    const reply = await generateAIResponse(sender, msg.body);
    await msg.reply(reply);

    console.log(`[Replied to ${sender}]: "${reply}"`);
  } catch (error) {
    console.error("Failed to handle message:", error);
  }
});

client.initialize();