import app from "./app";
import testDB from "./config/testDb";
import { createServer } from "http";
import { validateEnvVariables } from "./common/helpers/validateEnv";
import { initSocket } from "./socket";

const PORT = process.env.PORT;

/**
 * Initialize the test database connection.
 * This ensures that the database is ready before the server starts.
 */
testDB();

/**
 * Validate all required environment variables.
 * This prevents runtime errors due to missing configuration.
 */
validateEnvVariables();

/**
 * Create an HTTP server using the Express app.
 */
const server = createServer(app);

/**
 * Initialize Socket.IO on the HTTP server.
 * This sets up WebSocket connections for real-time features.
 */
initSocket(server);

/**
 * Start the HTTP server and listen on the specified port.
 */
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}).on("error", (err: NodeJS.ErrnoException) => {
  console.error("❌ Server failed to start:", err.message);
});