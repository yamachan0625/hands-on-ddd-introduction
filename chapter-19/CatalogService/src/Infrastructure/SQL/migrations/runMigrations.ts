import { promises as fs } from "fs";
import path from "path";

import pool from "../db";

async function runMigrations(fileName: string) {
  try {
    const sqlFile = path.join(__dirname, fileName);
    const sql = await fs.readFile(sqlFile, "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log("Database migration completed successfully");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Migration failed:", e);
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("Error running migrations:", e);
    throw e;
  }
}

// スクリプト直接実行時にマイグレーションを実行
if (require.main === module) {
  const fileName = process.argv[2];
  runMigrations(fileName)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigrations;
