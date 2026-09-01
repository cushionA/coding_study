/* =====================================================================
 * lesson 共通のサンプルテーブル定義: app_analytics.book_events
 * ---------------------------------------------------------------------
 * unit02〜04 で扱ってきた「本の取り込み」を、分析側(BigQuery)から見ると
 * こうなる、という1枚のテーブルです。1行 = 「いつ・どの取り込み元から・
 * どの本の情報が入ってきたか」という **イベント1件**。
 *
 * OLTP(Prisma/SQLite)の Book テーブルが「本の今の姿」を1行1冊で持つのに対し、
 * OLAP(BigQuery)のこのテーブルは「起きたことを消さずに積む」形です。
 * この違いは lesson/02 で改めて説明します。
 * ===================================================================== */

import type { BqSchema, Row } from "./fakeBigQuery.js";

export const BOOK_EVENTS_SCHEMA: BqSchema = {
  fields: [
    { name: "event_id", type: "STRING", mode: "REQUIRED" },
    { name: "occurred_at", type: "TIMESTAMP", mode: "REQUIRED" },
    { name: "event_date", type: "DATE", mode: "REQUIRED" },
    { name: "source", type: "STRING", mode: "REQUIRED" },
    { name: "book_title", type: "STRING", mode: "NULLABLE" },
    { name: "author", type: "STRING", mode: "NULLABLE" },
    { name: "price_jpy", type: "INT64", mode: "NULLABLE" },
    { name: "rating", type: "FLOAT64", mode: "NULLABLE" },
    { name: "is_reprint", type: "BOOL", mode: "NULLABLE" },
    { name: "tags", type: "STRING", mode: "REPEATED" },
  ],
};

export const SAMPLE_BOOK_EVENTS: Row[] = [
  { event_id: "ev-001", occurred_at: "2026-08-30T01:00:00Z", event_date: "2026-08-30", source: "openlibrary", book_title: "吾輩は猫である", author: "夏目漱石", price_jpy: 780, rating: 4.2, is_reprint: false, tags: ["classic", "novel"] },
  { event_id: "ev-002", occurred_at: "2026-08-30T02:00:00Z", event_date: "2026-08-30", source: "openlibrary", book_title: "銀河鉄道の夜", author: "宮沢賢治", price_jpy: 640, rating: 4.5, is_reprint: true, tags: ["classic"] },
  { event_id: "ev-003", occurred_at: "2026-08-30T03:00:00Z", event_date: "2026-08-30", source: "partner-feed", book_title: "坊っちゃん", author: "夏目漱石", price_jpy: 520, rating: 3.9, is_reprint: false, tags: [] },
  { event_id: "ev-004", occurred_at: "2026-08-31T01:00:00Z", event_date: "2026-08-31", source: "openlibrary", book_title: "こころ", author: "夏目漱石", price_jpy: 900, rating: 4.7, is_reprint: false, tags: ["classic", "novel"] },
  { event_id: "ev-005", occurred_at: "2026-08-31T02:00:00Z", event_date: "2026-08-31", source: "partner-feed", book_title: "注文の多い料理店", author: "宮沢賢治", price_jpy: 480, rating: 4.0, is_reprint: true, tags: ["short-story"] },
  { event_id: "ev-006", occurred_at: "2026-08-31T03:00:00Z", event_date: "2026-08-31", source: "manual-import", book_title: "人間失格", author: "太宰治", price_jpy: 700, rating: 4.1, is_reprint: false, tags: ["classic"] },
  { event_id: "ev-007", occurred_at: "2026-09-01T01:00:00Z", event_date: "2026-09-01", source: "openlibrary", book_title: "走れメロス", author: "太宰治", price_jpy: 430, rating: 3.8, is_reprint: null, tags: ["short-story"] },
  { event_id: "ev-008", occurred_at: "2026-09-01T02:00:00Z", event_date: "2026-09-01", source: "partner-feed", book_title: "雪国", author: "川端康成", price_jpy: 850, rating: 4.3, is_reprint: false, tags: [] },
];
