import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (!req.body) {
    return;
  }
  const bodyText = await req.text();
  const body = JSON.parse(bodyText || "{}");

  return new Response("Hello, world!");
};
