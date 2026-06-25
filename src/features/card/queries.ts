/**
 * 卡片查询（供 RSC 直接调用）
 *
 * 按项目约定，读取在 Server Component 直接用 Drizzle，不走 Action。
 * 所有查询按 userId 过滤，保证只读自己的数据。
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { card } from "@/db/schema";

/**
 * 卡片列表项（牌组详情页用，仅取展示所需字段）
 */
export interface CardListItem {
  id: string;
  front: string;
  back: string;
  state: string;
  due: Date;
  reps: number;
  createdAt: Date;
}

/**
 * 获取某牌组下的卡片列表（按创建时间倒序）
 *
 * @param deckId 牌组 ID
 * @param userId 当前用户（双重过滤，越权不返回）
 */
export async function getDeckCards(
  deckId: string,
  userId: string
): Promise<CardListItem[]> {
  return db
    .select({
      id: card.id,
      front: card.front,
      back: card.back,
      state: card.state,
      due: card.due,
      reps: card.reps,
      createdAt: card.createdAt,
    })
    .from(card)
    .where(and(eq(card.deckId, deckId), eq(card.userId, userId)))
    .orderBy(card.createdAt);
}

/**
 * 获取单张卡片（校验归属，不存在或越权返回 null）
 */
export async function getCardById(cardId: string, userId: string) {
  const [row] = await db
    .select()
    .from(card)
    .where(and(eq(card.id, cardId), eq(card.userId, userId)))
    .limit(1);

  return row ?? null;
}
