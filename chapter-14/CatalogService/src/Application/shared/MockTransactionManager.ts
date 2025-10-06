import { ITransactionManager } from "./ITransactionManager";

export class MockTransactionManager implements ITransactionManager {
  async begin<T>(callback: () => Promise<T>): Promise<T> {
    return await callback();
  }
}
