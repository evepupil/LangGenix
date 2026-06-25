"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { card, deck } from "@/db/schema";
import {
  createCardSchema,
  deleteCardSchema,
  updateCardSchema,
} from "@/features/card/schemas";
import { getScheduler } from "@/features/srs";
import { protectedAction } from "@/lib/safe-action";

const withCardAction = (name: string) =>
  protectedAction.metadata({ action: `card.${name}` });

/**
 * 创建卡片
 *
 * 关键衔接点：新卡的 FSRS 初始调度状态由 SRS 引擎生成
 * （state=new、due=now，立即可进复习队列），写入 card 表的状态字段。
 * 创建前校验牌组归属，防止向他人牌组写卡。
 */
export const createCardAction = withCardAction("createCard")
  .schema(createCardSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 校验牌组存在且属于当前用户
    const [ownDeck] = await db
      .select({ id: deck.id })
      .from(deck)
      .where(and(eq(deck.id, data.deckId), eq(deck.userId, ctx.userId)))
      .limit(1);

    if (!ownDeck) {
      throw new Error("牌组不存在或无权访问");
    }

    const now = new Date();
    const init = getScheduler().createInitialState(now);
    const cardId = crypto.randomUUID();

    await db.insert(card).values({
      id: cardId,
      deckId: data.deckId,
      userId: ctx.userId,
      type: "basic",
      front: data.front,
      back: data.back,
      // —— SRS 引擎给出的初始调度状态 ——
      due: init.due,
      stability: init.stability,
      difficulty: init.difficulty,
      scheduledDays: init.scheduledDays,
      reps: init.reps,
      lapses: init.lapses,
      state: init.state,
      learningSteps: init.learningSteps,
      lastReview: init.lastReview,
    });

    revalidatePath(`/dashboard/decks/${data.deckId}`);

    return { message: "卡片创建成功", cardId };
  });

/**
 * 更新卡片正反面内容（不触碰 FSRS 调度状态）
 */
export const updateCardAction = withCardAction("updateCard")
  .schema(updateCardSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const updated = await db
      .update(card)
      .set({ front: data.front, back: data.back, updatedAt: new Date() })
      .where(and(eq(card.id, data.id), eq(card.userId, ctx.userId)))
      .returning({ id: card.id, deckId: card.deckId });

    const row = updated[0];
    if (!row) {
      throw new Error("卡片不存在或无权访问");
    }

    revalidatePath(`/dashboard/decks/${row.deckId}`);

    return { message: "卡片更新成功" };
  });

/**
 * 删除卡片（关联复习日志通过外键级联删除）
 */
export const deleteCardAction = withCardAction("deleteCard")
  .schema(deleteCardSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    const deleted = await db
      .delete(card)
      .where(and(eq(card.id, id), eq(card.userId, ctx.userId)))
      .returning({ id: card.id, deckId: card.deckId });

    const row = deleted[0];
    if (!row) {
      throw new Error("卡片不存在或无权访问");
    }

    revalidatePath(`/dashboard/decks/${row.deckId}`);

    return { message: "卡片已删除" };
  });
