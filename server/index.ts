import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const port = process.env.PORT || 5000;
const app = createApp();
const server = createServer(app);

server.listen(port, () => {
  logger.info({ port }, "Server started");
});
