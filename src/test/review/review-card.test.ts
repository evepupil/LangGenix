/**
 * 复习评分集成测试（真实测试库）—— v0.1 闭环核心
 *
 * 测试范围：
 * - 评分后 SRS 状态写回卡片（reps 增加、lastReview 记录、due 推进）
 * - 复习日志正确落库（rating/复习前 state/快照）
 * - 验收线关键：评 Good 后新卡离开 new 状态、due 落在未来
 * - 队列联动：评分后该卡不再立即到期，但"到期时刻"重新进入队列
 *
 * 按既有约定以 DB 操作 + SRS 引擎复现 reviewCardAction 的核心逻辑，
 * 不经 protectedAction wrapper。
 */

import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { card, deck, reviewLog } from "@/db/schema";
import { buildQueue } from "@/features/review/queue";
import {
  type CardSchedulingState,
  getScheduler,
  SRS_RATING,
} from "@/features/srs";
import { cleanupTestUsers, createTestUser, testDb } from "../utils";

const createdUserIds: string[] = [];

afterAll(async () => {
  await cleanupTestUsers(createdUserIds);
});

const NO_LIMIT = { dailyNewLimit: 1000, dailyReviewLimit: 1000 };

/** 建牌组 */
async function createDeck(userId: string) {
  const id = crypto.randomUUID();
  await testDb
    .insert(deck)
    .values({ id, userId, name: "复习测试牌组", learningLanguage: "en" });
  return id;
}

/** 建新卡（SRS 初始化） */
async function createNewCard(userId: string, deckId: string, now: Date) {
  const init = getScheduler().createInitialState(now);
  const id = crypto.randomUUID();
  await testDb.insert(card).values({
    id,
    deckId,
    userId,
    type: "basic",
    front: "word",
    back: "释义",
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
  return id;
}

/** 复现 reviewCardAction 核心：取卡 → schedule → 事务写回 + 记日志 */
async function reviewCard(
  userId: string,
  cardId: string,
  rating: number,
  now: Date
) {
  const [row] = await testDb
    .select()
    .from(card)
    .where(and(eq(card.id, cardId), eq(card.userId, userId)))
    .limit(1);
  if (!row) throw new Error("card not found");

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
  const { next, log } = getScheduler().schedule(
    current,
    rating as 1 | 2 | 3 | 4,
    now
  );

  await testDb.transaction(async (tx) => {
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
      userId,
      rating: log.rating,
      state: log.state,
      due: log.due,
      stability: log.stability,
      difficulty: log.difficulty,
      scheduledDays: log.scheduledDays,
      reviewedAt: now,
    });
  });

  return next;
}

describe("复习评分写回", () => {
  it("评 Good 后：reps 增加、记录 lastReview、due 推进到未来、离开 new", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const deckId = await createDeck(user.id);
    const now = new Date();
    const cardId = await createNewCard(user.id, deckId, now);

    await reviewCard(user.id, cardId, SRS_RATING.Good, now);

    const [row] = await testDb
      .select()
      .from(card)
      .where(eq(card.id, cardId))
      .limit(1);

    expect(row?.reps).toBe(1);
    expect(row?.lastReview).not.toBeNull();
    expect(row?.state).not.toBe("new");
    expect(row?.due.getTime()).toBeGreaterThan(now.getTime());
  });

  it("复习日志正确落库（rating + 复习前 state=new）", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const deckId = await createDeck(user.id);
    const now = new Date();
    const cardId = await createNewCard(user.id, deckId, now);

    await reviewCard(user.id, cardId, SRS_RATING.Good, now);

    const logs = await testDb
      .select()
      .from(reviewLog)
      .where(eq(reviewLog.cardId, cardId));

    expect(logs).toHaveLength(1);
    expect(logs[0]?.rating).toBe(SRS_RATING.Good);
    expect(logs[0]?.state).toBe("new"); // 复习前状态
  });
});

describe("队列联动（验收线核心）", () => {
  it("评分后该卡不再立即到期，但到期时刻后重新进入队列", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const deckId = await createDeck(user.id);
    const now = new Date();
    const cardId = await createNewCard(user.id, deckId, now);

    // 复习一次（Good）
    const next = await reviewCard(user.id, cardId, SRS_RATING.Good, now);

    // 取当前候选，用"复习刚结束的时刻"算队列：该卡 due 在未来，不应到期
    const candNow = await testDb
      .select({ id: card.id, state: card.state, due: card.due })
      .from(card)
      .where(and(eq(card.deckId, deckId), eq(card.userId, user.id)));
    const queueNow = buildQueue(candNow, NO_LIMIT, now);
    expect(queueNow.cardIds).not.toContain(cardId);

    // 到了该卡 due 之后（+1 分钟），它应重新可复习
    const afterDue = new Date(next.due.getTime() + 60_000);
    const queueLater = buildQueue(candNow, NO_LIMIT, afterDue);
    expect(queueLater.cardIds).toContain(cardId);
  });
});
