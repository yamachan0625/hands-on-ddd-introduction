import { nanoid } from "nanoid";

export class DomainEvent<
  Type extends string = string,
  Body extends Record<string, unknown> = Record<string, unknown>
> {
  private constructor(
    // ドメインイベントのID
    public readonly eventId: string,
    // 集約のID
    public readonly aggregateId: string,
    // 集約の種類
    public readonly aggregateType: string,
    // ドメインイベントの種類
    public readonly eventType: Type,
    // ドメインイベントの内容
    public readonly eventBody: Body,
    // ドメインイベントの発生時刻
    public readonly occurredOn: Date,
    // ドメインイベントをパブリッシャーがパブリッシュした時刻
    public publishedAt: Date | null
  ) {}

  static create<Type extends string, Body extends Record<string, unknown>>(
    aggregateId: string,
    aggregateType: string,
    eventType: Type,
    eventBody: Body
  ): DomainEvent<Type, Body> {
    return new DomainEvent(
      nanoid(),
      aggregateId,
      aggregateType,
      eventType,
      eventBody,
      new Date(),
      null
    );
  }

  static reconstruct<Type extends string, Body extends Record<string, unknown>>(
    eventId: string,
    aggregateId: string,
    aggregateType: string,
    eventType: Type,
    eventBody: Body,
    occurredOn: Date,
    publishedAt: Date | null
  ): DomainEvent<Type, Body> {
    return new DomainEvent(
      eventId,
      aggregateId,
      aggregateType,
      eventType,
      eventBody,
      occurredOn,
      publishedAt
    );
  }

  public publish(): void {
    this.publishedAt = new Date();
  }
}
