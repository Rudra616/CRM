import app from "./app";
import testDB from "./config/testDb";
import { createServer } from "http";
import { initSocketServer } from "./realtime/socket";
import { validateEnvVariables } from "./common/helpers/validateEnv";

const PORT = process.env.PORT;

testDB(); // Check and initialize database connection
validateEnvVariables(); // Ensure all required environment variables are set
const server = createServer(app); // Create an HTTP server using the Express app
initSocketServer(server); // Initialize Socket.IO for realtime communication

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("❌ Server failed to start:", err.message); // Log server start errors
});