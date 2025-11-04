import { injectable } from "tsyringe";

import { Aggregate } from "Domain/shared/Aggregate";
import { DomainEvent } from "Domain/shared/DomainEvent/DomainEvent";
import { IEventStoreRepository } from "Domain/shared/DomainEvent/IEventStoreRepository";

import { SQLClientManager } from "../SQLClientManager";

@injectable()
export class SQLEventStoreRepository implements IEventStoreRepository {
  constructor(private clientManager: SQLClientManager) {}

  async find<T extends Aggregate<DomainEvent>>(
    aggregateId: string,
    aggregateType: string,
    reconstruct: (events: T["domainEvents"]) => T
  ): Promise<T | null> {
    return await this.clientManager.withClient(async (client) => {
      // 指定された集約に関連する全てのイベントを時系列順で取得
      const query = `
        SELECT
          "eventId",
          "aggregateId",
          "aggregateType",
          "eventType",
          "eventBody",
          "occurredOn",
          "publishedAt"
        FROM "Event"
        WHERE "aggregateId" = $1 AND "aggregateType" = $2
        ORDER BY "occurredOn" ASC
      `;

      const result = await client.query(query, [aggregateId, aggregateType]);

      if (result.rows.length === 0) {
        return null;
      }

      const domainEvents = result.rows.map((row) =>
        DomainEvent.reconstruct(
          row.eventId,
          row.aggregateId,
          row.aggregateType,
          row.eventType,
          row.eventBody,
          row.occurredOn,
          row.publishedAt
        )
      );

      // 集約の再構築関数を使用して集約を再構築
      return reconstruct(domainEvents);
    });
  }

  async findPendingEvents(): Promise<DomainEvent[]> {
    return await this.clientManager.withClient(async (client) => {
      const query = `
        SELECT
          "eventId",
          "aggregateId",
          "aggregateType",
          "eventType",
          "eventBody",
          "occurredOn",
          "publishedAt"
        FROM "Event"
        WHERE "publishedAt" IS NULL
        ORDER BY "occurredOn" ASC
      `;

      const result = await client.query(query);

      return result.rows.map((row) =>
        DomainEvent.reconstruct(
          row.eventId,
          row.aggregateId,
          row.aggregateType,
          row.eventType,
          row.eventBody,
          row.occurredOn,
          row.publishedAt
        )
      );
    });
  }

  async store(aggregate: Aggregate<DomainEvent>): Promise<void> {
    await this.clientManager.withClient(async (client) => {
      const events = aggregate.getDomainEvents();

      for (const event of events) {
        const query = `
          INSERT INTO "Event" (
            "eventId",
            "aggregateId",
            "aggregateType",
            "eventType",
            "eventBody",
            "occurredOn",
            "publishedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        const values = [
          event.eventId,
          event.aggregateId,
          event.aggregateType,
          event.eventType,
          JSON.stringify(event.eventBody),
          event.occurredOn,
          event.publishedAt,
        ];

        await client.query(query, values);
      }
      aggregate.clearDomainEvents();
    });
  }

  async markAsPublished(event: DomainEvent): Promise<void> {
    await this.clientManager.withClient(async (client) => {
      const query = `
        UPDATE "Event"
        SET "publishedAt" = $1
        WHERE "eventId" = $2
      `;

      const values = [event.publishedAt, event.eventId];

      await client.query(query, values);
    });
  }
}
