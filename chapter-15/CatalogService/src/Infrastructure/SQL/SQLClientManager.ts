import { AsyncLocalStorage } from "async_hooks";
import { Pool, PoolClient } from "pg";

import pool from "./db";

// クライアント情報をAsyncLocalStorageで管理
const asyncLocalStorage = new AsyncLocalStorage<PoolClient>();

export class SQLClientManager {
  // デフォルトのクライアントとしてpoolを使用
  private defaultClient: Pool = pool;

  setClient(client: PoolClient): void {
    // AsyncLocalStorageに現在のクライアントを保存
    asyncLocalStorage.enterWith(client);
  }

  // 接続の取得と解放を自動化するメソッド
  async withClient<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    // 既存のトランザクションクライアントがあればそれを使用
    const existingClient = asyncLocalStorage.getStore();
    if (existingClient) {
      return await callback(existingClient);
    }

    // なければ新しい接続を取得して自動解放
    const client = await this.defaultClient.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }
}
