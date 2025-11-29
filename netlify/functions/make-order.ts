import type { Context } from "@netlify/functions";
import * as process from "node:process";

const CAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const CAPTCHA_TOKEN = process.env.CAPTCHA_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const getMessage = (name: string, phone: string, isLowRating: boolean = false) => {
  return `New site order: \n👤 Name: ${name ?? "-"} \n📧 Phone: ${phone ?? "-"} \n ${isLowRating ? "low order rating" : ""}`.trim();
};

export default async (req: Request, context: Context) => {
  try {
    if (!req.body) return;

    const bodyText = await req.text();
    const body = JSON.parse(bodyText || "{}");

    const googleRes = await fetch(CAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: CAPTCHA_TOKEN,
        response: body.token
      })
    });

    const data = await googleRes.json();
    if (data?.success !== true) throw new Error("Captcha error");

    const tgResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: getMessage(body.name, body.phone, data.score <= 0.4),
          parse_mode: "HTML"
        })
      }
    );

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    console.error(e);
    return new Response(e.message, { status: 500 });
  }
};
