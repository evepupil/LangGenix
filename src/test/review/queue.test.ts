/**
 * 复习队列计算测试（纯函数，不连库）
 *
 * 测试范围：
 * - 排序优先级：重学 > 到期 > 新卡
 * - 到期判定：未到期的 review/learning 卡不入队
 * - 新卡不看 due，始终可作为新卡引入
 * - 每日上限：新卡限额、复习（重学+到期）合计限额且重学优先
 * - 空候选 → 空队列
 */

import { describe, expect, it } from "vitest";

import type { CardState } from "@/db/schema";
import { buildQueue, type QueueCandidate } from "@/features/review/queue";

const NOW = new Date("2026-01-10T00:00:00.000Z");
const past = (mins: number) => new Date(NOW.getTime() - mins * 60_000);
const future = (mins: number) => new Date(NOW.getTime() + mins * 60_000);

function c(id: string, state: CardState, due: Date = NOW): QueueCandidate {
  return { id, state, due };
}

const NO_LIMIT = { dailyNewLimit: 1000, dailyReviewLimit: 1000 };

describe("buildQueue 排序优先级", () => {
  it("应按 重学 → 到期 → 新卡 排列", () => {
    const q = buildQueue(
      [
        c("new1", "new"),
        c("review1", "review", past(10)),
        c("relearn1", "relearning", past(5)),
      ],
      NO_LIMIT,
      NOW
    );
    expect(q.cardIds).toEqual(["relearn1", "review1", "new1"]);
    expect(q.counts).toEqual({
      relearning: 1,
      due: 1,
      new: 1,
      total: 3,
    });
  });

  it("同类卡按 due 升序（最早到期先复习）", () => {
    const q = buildQueue(
      [c("late", "review", past(5)), c("early", "review", past(60))],
      NO_LIMIT,
      NOW
    );
    expect(q.cardIds).toEqual(["early", "late"]);
  });
});

describe("buildQueue 到期判定", () => {
  it("未到期的 review 卡不入队", () => {
    const q = buildQueue(
      [c("notdue", "review", future(60)), c("due", "review", past(1))],
      NO_LIMIT,
      NOW
    );
    expect(q.cardIds).toEqual(["due"]);
  });

  it("新卡不看 due，即使 due 在未来也作为新卡引入", () => {
    const q = buildQueue([c("n", "new", future(999))], NO_LIMIT, NOW);
    expect(q.cardIds).toEqual(["n"]);
    expect(q.counts.new).toBe(1);
  });
});

describe("buildQueue 每日上限", () => {
  it("新卡数受 dailyNewLimit 限制", () => {
    const q = buildQueue(
      [c("n1", "new"), c("n2", "new"), c("n3", "new")],
      { dailyNewLimit: 2, dailyReviewLimit: 1000 },
      NOW
    );
    expect(q.counts.new).toBe(2);
    expect(q.cardIds).toHaveLength(2);
  });

  it("复习（重学+到期）合计受 dailyReviewLimit 限制，重学优先占额", () => {
    const q = buildQueue(
      [
        c("re1", "relearning", past(10)),
        c("re2", "relearning", past(9)),
        c("due1", "review", past(5)),
        c("due2", "review", past(4)),
      ],
      { dailyNewLimit: 1000, dailyReviewLimit: 3 },
      NOW
    );
    // 上限 3：2 张重学全保留，到期只能再进 1 张
    expect(q.counts.relearning).toBe(2);
    expect(q.counts.due).toBe(1);
    expect(q.counts.total).toBe(3);
    // 重学按 due 升序：past(10) 比 past(9) 更早，re1 在前
    expect(q.cardIds.slice(0, 2)).toEqual(["re1", "re2"]);
    // 到期单个名额给更早到期的 due1（past(5) < past(4)）
    expect(q.cardIds[2]).toBe("due1");
  });

  it("dailyReviewLimit 为 0 时无复习卡入队，但新卡仍可入", () => {
    const q = buildQueue(
      [c("due1", "review", past(5)), c("n1", "new")],
      { dailyNewLimit: 10, dailyReviewLimit: 0 },
      NOW
    );
    expect(q.counts.due).toBe(0);
    expect(q.counts.new).toBe(1);
    expect(q.cardIds).toEqual(["n1"]);
  });
});

describe("buildQueue 边界", () => {
  it("空候选返回空队列", () => {
    const q = buildQueue([], NO_LIMIT, NOW);
    expect(q.cardIds).toEqual([]);
    expect(q.counts.total).toBe(0);
  });
});
