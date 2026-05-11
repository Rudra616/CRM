import app from "./app";
import testDB from "./config/testDb";
import { createServer } from "http";
import { initSocketServer } from "./realtime/socket";
const PORT = process.env.PORT || 3000;

testDB()
const server = createServer(app);
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("❌ Server failed to start:", err.message);
});





