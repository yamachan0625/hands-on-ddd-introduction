-- Event テーブル(Outbox テーブル)の作成
CREATE TABLE IF NOT EXISTS "Event" (
  "eventId" TEXT PRIMARY KEY,
  "aggregateId" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventBody" JSONB NOT NULL,
  "occurredOn" TIMESTAMP WITH TIME ZONE NOT NULL,
  "publishedAt" TIMESTAMP WITH TIME ZONE
);

-- 未発行イベントの検索とソートを同時最適化する複合インデックス
-- NULLS FIRSTによりpublishedAt IS NULLの検索を最適化し、occurredOnでのソートも高速化
CREATE INDEX IF NOT EXISTS "Event_unpublished_occurredOn_idx" ON "Event"("publishedAt" ASC NULLS FIRST, "occurredOn" ASC);