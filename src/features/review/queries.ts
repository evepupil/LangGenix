/**
 * 复习查询（供 RSC 调用）
 *
 * 取出牌组候选卡片，结合用户学习档案的每日上限，交给纯函数 buildQueue
 * 计算复习顺序；并提供按队列顺序取卡片内容的方法。
 */

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { type CardState, card, deck } from "@/db/schema";
import { getProfile } from "@/features/profile";
import { buildQueue, type ReviewQueue } from "./queue";

/**
 * 复习会话用的卡片内容
 */
export interface ReviewCard {
  id: string;
  front: string;
  back: string;
  state: CardState;
}

/**
 * 获取某牌组的复习队列（顺序 + 计数）
 *
 * 校验牌组归属；按学习档案的每日上限限额。
 * @returns 队列；牌组不存在或越权返回 null
 */
export async function getReviewQueue(
  deckId: string,
  userId: string,
  now: Date = new Date()
): Promise<ReviewQueue | null> {
  // 校验牌组归属
  const [ownDeck] = await db
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)))
    .limit(1);

  if (!ownDeck) {
    return null;
  }

  // 取该牌组全部卡片的队列计算所需字段
  const candidates = await db
    .select({ id: card.id, state: card.state, due: card.due })
    .from(card)
    .where(and(eq(card.deckId, deckId), eq(card.userId, userId)));

  const profile = await getProfile(userId);

  return buildQueue(
    candidates,
    {
      dailyNewLimit: profile.dailyNewLimit,
      dailyReviewLimit: profile.dailyReviewLimit,
    },
    now
  );
}

/**
 * 按队列顺序取卡片内容（用于复习会话逐张展示）
 *
 * inArray 一次取回后，在内存中按 cardIds 顺序还原（SQL 不保证顺序）。
 */
export async function getReviewCards(
  cardIds: string[],
  userId: string
): Promise<ReviewCard[]> {
  if (cardIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: card.id,
      front: card.front,
      back: card.back,
      state: card.state,
    })
    .from(card)
    .where(and(inArray(card.id, cardIds), eq(card.userId, userId)));

  // 还原队列顺序
  const byId = new Map(rows.map((r) => [r.id, r]));
  return cardIds
    .map((id) => byId.get(id))
    .filter((c): c is ReviewCard => c !== undefined);
}
