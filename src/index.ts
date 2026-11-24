import dotenv from "dotenv";
import express from "express";
import webhookRouter from "./routes/webhook.routes.js";

const app = express();
dotenv.config({ path: ".env" }); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("WhatsApp AI Bot server is running!");
});

app.use("/webhook", webhookRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});