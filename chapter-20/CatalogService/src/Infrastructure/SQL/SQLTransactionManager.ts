import { injectable } from "tsyringe";

import { ITransactionManager } from "Application/shared/ITransactionManager";

import pool from "./db";
import { SQLClientManager } from "./SQLClientManager";

@injectable()
export class SQLTransactionManager implements ITransactionManager {
  constructor(private clientManager: SQLClientManager) {}

  async begin<T>(callback: () => Promise<T>): Promise<T> {
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query(`BEGIN TRANSACTION`);
      // トランザクション用のクライアントをセット
      this.clientManager.setClient(client);

      // コールバックを実行
      const result = await callback();

      // トランザクションをコミット
      await client.query("COMMIT");
      return result;
    } catch (error) {
      // エラー時はロールバック
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // クライアントをリリース
      client.release();
    }
  }
}
