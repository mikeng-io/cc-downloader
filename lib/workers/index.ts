// Load environment variables first
require("dotenv").config();

const { createWorker } = require("../queue");

console.log("Starting download worker...");

const worker = createWorker();

console.log("Worker ready, waiting for jobs...");

// Handle shutdown
async function shutdown() {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
