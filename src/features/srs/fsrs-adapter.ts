/**
 * FSRS 算法适配器
 *
 * 用 ts-fsrs 库实现 SrsScheduler 接口。本文件是 SRS 引擎与 ts-fsrs 的
 * 唯一耦合点，集中处理两件转换：
 *   1. DB 调度状态 ↔ ts-fsrs Card（字段名 camelCase ↔ snake_case）
 *   2. DB 的字符串状态 enum ↔ ts-fsrs 的数字 State 枚举
 * 上层（actions / 测试）只依赖 SrsScheduler 接口与 CardSchedulingState，
 * 不直接接触 ts-fsrs 类型，便于未来替换算法。
 */

import {
  createEmptyCard,
  type Card as FsrsCard,
  fsrs,
  type Grade,
  type RecordLog,
  State,
} from "ts-fsrs";

import type { CardState } from "@/db/schema";
import type { SrsScheduler } from "./scheduler";
import {
  type CardSchedulingState,
  type SchedulePreview,
  type ScheduleResult,
  SRS_RATING,
  type SrsRating,
} from "./types";

/** ts-fsrs 实例（使用库默认参数：retention 0.9 等） */
const f = fsrs();

// ----------------------------------------
// 状态枚举互转：DB 字符串 enum ↔ ts-fsrs 数字 State
// ----------------------------------------

/** DB 卡片状态 → ts-fsrs State（数字枚举） */
const DB_STATE_TO_FSRS: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** ts-fsrs State → DB 卡片状态（字符串 enum） */
const FSRS_STATE_TO_DB: Record<State, CardState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

// ----------------------------------------
// Card 互转
// ----------------------------------------

/**
 * DB 调度状态 → ts-fsrs Card
 *
 * elapsed_days 已被 ts-fsrs 弃用（6.0 移除），这里按 0 传入占位——
 * ts-fsrs 内部以 last_review 与 now 实时计算，不依赖该字段。
 */
function toFsrsCard(state: CardSchedulingState): FsrsCard {
  return {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: 0,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: DB_STATE_TO_FSRS[state.state],
    // last_review 在 ts-fsrs 中是"可选且不含 undefined"（exactOptionalPropertyTypes）：
    // 新卡（lastReview 为 null）时省略该字段，而非赋 undefined
    ...(state.lastReview ? { last_review: state.lastReview } : {}),
  };
}

/** ts-fsrs Card → DB 调度状态 */
function fromFsrsCard(card: FsrsCard): CardSchedulingState {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: FSRS_STATE_TO_DB[card.state],
    learningSteps: card.learning_steps,
    lastReview: card.last_review ?? null,
  };
}

// ----------------------------------------
// SrsScheduler 实现
// ----------------------------------------

/** FSRS 调度器单例 */
export const fsrsScheduler: SrsScheduler = {
  algorithm: "fsrs",

  createInitialState(now: Date): CardSchedulingState {
    // createEmptyCard 生成 state=New、due=now 的新卡，立即可进队列
    return fromFsrsCard(createEmptyCard(now));
  },

  schedule(
    state: CardSchedulingState,
    rating: SrsRating,
    now: Date
  ): ScheduleResult {
    // SrsRating 的数值与 ts-fsrs Grade（排除 Manual）一致，可直接作为 Grade
    const { card, log } = f.next(toFsrsCard(state), now, rating as Grade);
    return {
      next: fromFsrsCard(card),
      log: {
        rating,
        // 复习"前"状态来自传入的 state（ts-fsrs log.state 同义）
        state: state.state,
        due: log.due,
        stability: card.stability,
        difficulty: card.difficulty,
        scheduledDays: card.scheduled_days,
      },
    };
  },

  preview(state: CardSchedulingState, now: Date): SchedulePreview {
    // repeat 返回四档各自的 { card, log }，取每档更新后的 due / 间隔
    const record: RecordLog = f.repeat(toFsrsCard(state), now);
    const pick = (rating: SrsRating) => {
      const { card } = record[rating as Grade];
      return { due: card.due, scheduledDays: card.scheduled_days };
    };
    return {
      [SRS_RATING.Again]: pick(SRS_RATING.Again),
      [SRS_RATING.Hard]: pick(SRS_RATING.Hard),
      [SRS_RATING.Good]: pick(SRS_RATING.Good),
      [SRS_RATING.Easy]: pick(SRS_RATING.Easy),
    };
  },
};

// 供测试直接验证互转纯函数
export { fromFsrsCard, toFsrsCard };
