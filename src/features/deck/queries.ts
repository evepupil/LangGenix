/**
 * 牌组查询（供 RSC 直接调用）
 *
 * 按项目约定，列表/详情等读取在 Server Component 中直接用 Drizzle 查询，
 * 不走 Server Action（Action 仅用于 mutation）。所有查询都按 userId 过滤，
 * 保证用户只能读到自己的数据。
 */

import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { card, deck } from "@/db/schema";

/**
 * 牌组列表项（含卡片统计）
 */
export interface DeckListItem {
  id: string;
  name: string;
  description: string | null;
  learningLanguage: string;
  createdAt: Date;
  /** 牌组内卡片总数 */
  totalCards: number;
  /** 当前到期（可复习）的卡片数：到期且非新卡 */
  dueCards: number;
  /** 新卡数 */
  newCards: number;
}

/**
 * 获取用户的牌组列表（含每组卡片统计）
 *
 * 统计用条件聚合一次查出，避免对每个牌组单独计数（N+1）。
 * @param userId 当前用户
 * @param now 计算到期的基准时刻（默认当前时间）
 */
export async function getUserDecks(
  userId: string,
  now: Date = new Date()
): Promise<DeckListItem[]> {
  const rows = await db
    .select({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      learningLanguage: deck.learningLanguage,
      createdAt: deck.createdAt,
      totalCards: count(card.id),
      // 到期卡：due <= now 且不是新卡
      dueCards: sql<number>`count(*) filter (where ${card.id} is not null and ${card.due} <= ${now} and ${card.state} <> 'new')`,
      // 新卡
      newCards: sql<number>`count(*) filter (where ${card.state} = 'new')`,
    })
    .from(deck)
    .leftJoin(card, eq(card.deckId, deck.id))
    .where(eq(deck.userId, userId))
    .groupBy(deck.id)
    .orderBy(deck.createdAt);

  return rows.map((r) => ({
    ...r,
    totalCards: Number(r.totalCards),
    dueCards: Number(r.dueCards),
    newCards: Number(r.newCards),
  }));
}

/**
 * 获取单个牌组（校验归属，不存在或越权返回 null）
 */
export async function getDeckById(deckId: string, userId: string) {
  const [row] = await db
    .select()
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)))
    .limit(1);

  return row ?? null;
}

/**
 * 统计某牌组当前可复习数量（到期卡 + 新卡），供 UI 展示
 */
export async function getDeckReviewCounts(
  deckId: string,
  userId: string,
  now: Date = new Date()
) {
  const [row] = await db
    .select({
      dueCards: sql<number>`count(*) filter (where ${card.due} <= ${now} and ${card.state} <> 'new')`,
      newCards: sql<number>`count(*) filter (where ${card.state} = 'new')`,
    })
    .from(card)
    .where(and(eq(card.deckId, deckId), eq(card.userId, userId)));

  return {
    dueCards: Number(row?.dueCards ?? 0),
    newCards: Number(row?.newCards ?? 0),
  };
}
