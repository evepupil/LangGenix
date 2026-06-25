/**
 * 卡片创建与级联删除集成测试
 *
 * 测试范围（真实测试库）：
 * - 新建卡片时 SRS 引擎初始化的调度状态正确落库（state=new / due / 计数）
 * - 删除牌组 → 卡片级联删除（FK onDelete cascade）
 * - 删除卡片 → 复习日志级联删除
 *
 * 说明：业务逻辑（SRS 初始化 + schema 级联约束）按既有测试约定直接以
 * DB 操作复现验证，不经 protectedAction wrapper（项目无 session mock 基建）。
 */

import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { card, deck, reviewLog } from "@/db/schema";
import { getScheduler } from "@/features/srs";
import { cleanupTestUsers, createTestUser, testDb } from "../utils";

const createdUserIds: string[] = [];

afterAll(async () => {
  await cleanupTestUsers(createdUserIds);
});

/** 建一个测试牌组 */
async function createDeck(userId: string, name = "测试牌组") {
  const id = crypto.randomUUID();
  await testDb
    .insert(deck)
    .values({ id, userId, name, learningLanguage: "en" });
  return id;
}

/** 用 SRS 引擎初始化并插入一张卡（复现 createCardAction 的核心逻辑） */
async function createCard(
  userId: string,
  deckId: string,
  front: string,
  back: string,
  now = new Date()
) {
  const init = getScheduler().createInitialState(now);
  const id = crypto.randomUUID();
  await testDb.insert(card).values({
    id,
    deckId,
    userId,
    type: "basic",
    front,
    back,
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

describe("卡片创建（SRS 初始化）", () => {
  it("新卡应以 state=new、due≈创建时刻、计数为 0 落库", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const deckId = await createDeck(user.id);

    const now = new Date();
    const cardId = await createCard(user.id, deckId, "apple", "苹果", now);

    const [row] = await testDb
      .select()
      .from(card)
      .where(eq(card.id, cardId))
      .limit(1);

    expect(row).toBeDefined();
    expect(row?.state).toBe("new");
    expect(row?.reps).toBe(0);
    expect(row?.lapses).toBe(0);
    expect(row?.lastReview).toBeNull();
    // 新卡 due 等于创建时刻（FSRS createEmptyCard 行为）
    expect(row?.due.getTime()).toBe(now.getTime());
  });
});

describe("级联删除", () => {
  it("删除牌组应级联删除其卡片", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const deckId = await createDeck(user.id);
    await createCard(user.id, deckId, "one", "一");
    await createCard(user.id, deckId, "two", "二");

    // 删牌组前确认有 2 张卡
    const before = await testDb
      .select()
      .from(card)
      .where(eq(card.deckId, deckId));
    expect(before).toHaveLength(2);

    await testDb.delete(deck).where(eq(deck.id, deckId));

    const after = await testDb
      .select()
      .from(card)
      .where(eq(card.deckId, deckId));
    expect(after).toHaveLength(0);
  });

  it("删除卡片应级联删除其复习日志", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const deckId = await createDeck(user.id);
    const cardId = await createCard(user.id, deckId, "cascade", "级联");

    // 手动插入一条复习日志
    await testDb.insert(reviewLog).values({
      id: crypto.randomUUID(),
      cardId,
      userId: user.id,
      rating: 3,
      state: "new",
      due: new Date(),
      stability: 1,
      difficulty: 5,
      scheduledDays: 0,
    });

    const before = await testDb
      .select()
      .from(reviewLog)
      .where(eq(reviewLog.cardId, cardId));
    expect(before).toHaveLength(1);

    await testDb.delete(card).where(eq(card.id, cardId));

    const after = await testDb
      .select()
      .from(reviewLog)
      .where(eq(reviewLog.cardId, cardId));
    expect(after).toHaveLength(0);
  });
});

describe("所有权隔离", () => {
  it("按 (id, userId) 过滤无法读到他人的牌组", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    createdUserIds.push(owner.id, other.id);
    const deckId = await createDeck(owner.id);

    // 以 other 身份按 action 的过滤条件查询，应查不到
    const rows = await testDb
      .select()
      .from(deck)
      .where(and(eq(deck.id, deckId), eq(deck.userId, other.id)));

    expect(rows).toHaveLength(0);
  });
});
