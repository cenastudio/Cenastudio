import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/app.js";

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  const apiPath = req.query._apiPath;
  if (apiPath) {
    const normalizedPath = Array.isArray(apiPath) ? apiPath.join("/") : apiPath;
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query)) {
      if (key === "_apiPath" || value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, item));
      } else {
        searchParams.set(key, value);
      }
    }

    const query = searchParams.toString();
    req.url = `/api/${normalizedPath}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
}
