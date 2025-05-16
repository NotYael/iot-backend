import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

// Test the connection immediately
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to the database!");

    // Test a simple query
    const result = await client.query("SELECT NOW()");
    console.log("Database time:", result.rows[0].now);

    client.release();
  } catch (err) {
    console.error("Database connection error:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
    });
  }
};

testConnection();

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
