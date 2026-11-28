import OpenAI from "openai";
import { MY_PERSONA } from "../config/persona.js";

const openai = new OpenAI({
  apiKey: process.env.Snoopy_Bot,
  baseURL: "https://api.x.ai/v1",
});

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
const conversationHistory = new Map<string, ChatMessage[]>();

export async function generateAIResponse(
  phoneNumber: string,
  userMessage: string
): Promise<string> {
  try {
    let history = conversationHistory.get(phoneNumber);
    if (!history) {
      history = [{ role: "system", content: MY_PERSONA }];
      conversationHistory.set(phoneNumber, history);
    }

    history.push({ role: "user", content: userMessage });

    if (history.length > 12) {
      history = [history[0]!, ...history.slice(-11)];
      conversationHistory.set(phoneNumber, history);
    }

    const completion = await openai.chat.completions.create({
      model: "grok-3-mini",
      messages: history,
      temperature: 0.8,
      max_tokens: 300,
    });

    const reply =
      completion.choices[0]?.message?.content || "got caught up, text you in a bit";

    history.push({ role: "assistant", content: reply });
    return reply;
  } catch (error) {
    console.error("Grok API Error:", error);
    return "hey, phone is glitching a bit, will text you later!";
  }
}