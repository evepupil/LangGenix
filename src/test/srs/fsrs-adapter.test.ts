/**
 * FSRS 适配器测试
 *
 * 测试范围（纯函数，不依赖数据库）：
 * - DB 调度状态 ↔ ts-fsrs Card 字段/状态枚举互转
 * - createInitialState：新卡初始状态正确
 * - schedule：四档评分后状态流转（due 推进、state 转移、计数累加）
 * - preview：四档间隔预览，Easy ≥ Good ≥ Hard 的单调性
 */

import { describe, expect, it } from "vitest";

import {
  fromFsrsCard,
  fsrsScheduler,
  toFsrsCard,
} from "@/features/srs/fsrs-adapter";
import { type CardSchedulingState, SRS_RATING } from "@/features/srs/types";

/** 构造一张全新卡片的调度状态（固定时刻，便于断言） */
const NOW = new Date("2026-01-01T00:00:00.000Z");

function newState(now: Date = NOW): CardSchedulingState {
  return fsrsScheduler.createInitialState(now);
}

describe("createInitialState", () => {
  it("新卡状态应为 new，due 等于创建时刻", () => {
    const s = newState();
    expect(s.state).toBe("new");
    expect(s.due.getTime()).toBe(NOW.getTime());
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(0);
    expect(s.lastReview).toBeNull();
  });
});

describe("toFsrsCard / fromFsrsCard 互转", () => {
  it("往返转换应保持调度状态等价", () => {
    const original: CardSchedulingState = {
      due: new Date("2026-02-01T12:00:00.000Z"),
      stability: 12.34,
      difficulty: 5.67,
      scheduledDays: 7,
      reps: 3,
      lapses: 1,
      state: "review",
      learningSteps: 0,
      lastReview: new Date("2026-01-25T12:00:00.000Z"),
    };
    const roundTrip = fromFsrsCard(toFsrsCard(original));
    expect(roundTrip).toEqual(original);
  });

  it("四种状态枚举均能正确互转", () => {
    const states: CardSchedulingState["state"][] = [
      "new",
      "learning",
      "review",
      "relearning",
    ];
    for (const state of states) {
      const s = { ...newState(), state };
      expect(fromFsrsCard(toFsrsCard(s)).state).toBe(state);
    }
  });

  it("lastReview 为 null 时应安全往返（不变回 undefined 以外）", () => {
    const s = newState();
    expect(s.lastReview).toBeNull();
    expect(fromFsrsCard(toFsrsCard(s)).lastReview).toBeNull();
  });
});

describe("schedule", () => {
  it("评 Good 后：reps 增加、记录 lastReview、due 向后推进", () => {
    const s = newState();
    const { next, log } = fsrsScheduler.schedule(s, SRS_RATING.Good, NOW);

    expect(next.reps).toBe(1);
    expect(next.lastReview).not.toBeNull();
    expect(next.due.getTime()).toBeGreaterThan(NOW.getTime());
    // 复习日志记录的是复习"前"的状态
    expect(log.state).toBe("new");
    expect(log.rating).toBe(SRS_RATING.Good);
  });

  it("评 Again 应离开 new 状态（进入 learning/relearning）", () => {
    const s = newState();
    const { next } = fsrsScheduler.schedule(s, SRS_RATING.Again, NOW);
    expect(next.state).not.toBe("new");
  });

  it("日志中的 stability/difficulty 为复习后的快照", () => {
    const s = newState();
    const { next, log } = fsrsScheduler.schedule(s, SRS_RATING.Good, NOW);
    expect(log.stability).toBe(next.stability);
    expect(log.difficulty).toBe(next.difficulty);
    expect(log.scheduledDays).toBe(next.scheduledDays);
  });
});

describe("preview", () => {
  it("应给出四档评分各自的下次到期，且间隔随评分单调不减", () => {
    const s = newState();
    const preview = fsrsScheduler.preview(s, NOW);

    const again = preview[SRS_RATING.Again];
    const hard = preview[SRS_RATING.Hard];
    const good = preview[SRS_RATING.Good];
    const easy = preview[SRS_RATING.Easy];

    // 四档都应有 due
    for (const p of [again, hard, good, easy]) {
      expect(p.due).toBeInstanceOf(Date);
    }
    // 评分越高，下次间隔越长（Easy ≥ Good ≥ Hard ≥ Again）
    expect(easy.due.getTime()).toBeGreaterThanOrEqual(good.due.getTime());
    expect(good.due.getTime()).toBeGreaterThanOrEqual(hard.due.getTime());
    expect(hard.due.getTime()).toBeGreaterThanOrEqual(again.due.getTime());
  });
});
