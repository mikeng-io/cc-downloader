import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createWorker } from './queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create and start the BullMQ worker
const worker = createWorker();

console.log("Download worker started");
console.log("Processing downloads from queue...");

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down worker...");
  await worker.close();
  process.exit(0);
});
