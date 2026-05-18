import app from "./app";
import testDB from "./config/testDb";
import { createServer } from "http";
import { validateEnvVariables } from "./common/helpers/validateEnv";
const PORT = process.env.PORT;

testDB()
validateEnvVariables()
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("❌ Server failed to start:", err.message);
});





