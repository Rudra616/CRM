import db from "./db";
  import bcrypt from "bcrypt";

const testDB = async () => {
 try {
  const connection = await db.getConnection();
  console.log("✅ Database Connected");
  const hash = await bcrypt.hash("123456", 10);
  console.log(hash);
  connection.release();
 } catch (error) {
  console.error("❌ DB Connection Failed", error);
 }
};

export default testDB;



