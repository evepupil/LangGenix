"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { card, reviewLog } from "@/db/schema";
import { getProfile } from "@/features/profile";
import { reviewCardSchema } from "@/features/review/schemas";
import {
  type CardSchedulingState,
  getScheduler,
  type SrsRating,
} from "@/features/srs";
import { protectedAction } from "@/lib/safe-action";

const withReviewAction = (name: string) =>
  protectedAction.metadata({ action: `review.${name}` });

/**
 * 复习评分（v0.1 闭环核心）
 *
 * 流程：取卡（校验归属）→ 用 SRS 引擎按评分推进调度状态 →
 * 事务内同时 UPDATE card 状态 + INSERT review_log。
 * 算法取自用户学习档案（默认 fsrs）。
 */
export const reviewCardAction = withReviewAction("reviewCard")
  .schema(reviewCardSchema)
  .action(async ({ parsedInput: { cardId, rating }, ctx }) => {
    // 取卡并校验归属
    const [row] = await db
      .select()
      .from(card)
      .where(and(eq(card.id, cardId), eq(card.userId, ctx.userId)))
      .limit(1);

    if (!row) {
      throw new Error("卡片不存在或无权访问");
    }

    const profile = await getProfile(ctx.userId);
    const scheduler = getScheduler(profile.algorithm);

    // 组装当前调度状态交给引擎
    const current: CardSchedulingState = {
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      scheduledDays: row.scheduledDays,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      learningSteps: row.learningSteps,
      lastReview: row.lastReview,
    };

    const now = new Date();
    const { next, log } = scheduler.schedule(current, rating as SrsRating, now);

    // 事务：写回卡片新状态 + 记录复习日志
    await db.transaction(async (tx) => {
      await tx
        .update(card)
        .set({
          due: next.due,
          stability: next.stability,
          difficulty: next.difficulty,
          scheduledDays: next.scheduledDays,
          reps: next.reps,
          lapses: next.lapses,
          state: next.state,
          learningSteps: next.learningSteps,
          lastReview: now,
          updatedAt: now,
        })
        .where(eq(card.id, cardId));

      await tx.insert(reviewLog).values({
        id: crypto.randomUUID(),
        cardId,
        userId: ctx.userId,
        rating: log.rating,
        state: log.state,
        due: log.due,
        stability: log.stability,
        difficulty: log.difficulty,
        scheduledDays: log.scheduledDays,
        reviewedAt: now,
      });
    });

    revalidatePath(`/dashboard/decks/${row.deckId}/review`);

    return {
      message: "复习已记录",
      nextDue: next.due,
      nextState: next.state,
    };
  });
