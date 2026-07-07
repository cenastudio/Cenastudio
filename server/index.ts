import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

// Force rebuild: 2026-07-04 15:25 - Fix getWidgetData deployed
const port = process.env.PORT || 5000;
const app = createApp();

// Export for Vercel serverless
export default app;

// Start server only if not in serverless environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const server = createServer(app);
  server.listen(port, () => {
    logger.info({ port }, "Server started");
  });
}
// Force rebuild Tue Jul  7 01:25:06 -03 2026
