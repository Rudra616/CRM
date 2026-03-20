import app from "./app";
import testDB from "./config/testDb";

const PORT = process.env.PORT || 3000;

testDB()
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("❌ Server failed to start:", err.message);
});