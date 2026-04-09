// Load environment variables first
require("dotenv").config();

const { createWorker } = require("../queue");
const { createThumbnailWorker } = require("./thumbnail-worker");

console.log("Starting workers...");

const downloadWorker = createWorker();
const thumbnailWorker = createThumbnailWorker();

console.log("Workers ready, waiting for jobs...");

// Handle shutdown
async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all([downloadWorker.close(), thumbnailWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
