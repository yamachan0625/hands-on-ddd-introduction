import { Pool } from "pg";

// 環境変数から接続情報を取得するか、デフォルト値を使用
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "localdb",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
});

export default pool;
