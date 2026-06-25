/**
 * SRS（间隔重复）引擎类型定义
 *
 * 这些类型是 SRS 引擎对外的稳定契约，独立于具体算法实现（FSRS / SM-2）。
 * CardSchedulingState 刻意只覆盖"调度状态"子集，不依赖整张 card 表行——
 * 让引擎与数据库表结构解耦，便于单测与未来算法替换。
 */

import type { CardState } from "@/db/schema";

/**
 * 卡片调度状态
 *
 * 与 card 表的 FSRS 状态字段同构，是 SRS 引擎读写的最小单元。
 * 字段语义对应 ts-fsrs 的 Card 接口（不含已弃用的 elapsed_days）。
 */
export interface CardSchedulingState {
  /** 下次到期时间（复习队列核心字段） */
  due: Date;
  /** 记忆稳定性（FSRS：记忆强度，越大遗忘越慢） */
  stability: number;
  /** 难度（FSRS：该卡固有难记程度） */
  difficulty: number;
  /** 排期间隔天数 */
  scheduledDays: number;
  /** 累计复习次数 */
  reps: number;
  /** 累计遗忘次数（评 Again 的次数） */
  lapses: number;
  /** 卡片状态（new/learning/review/relearning） */
  state: CardState;
  /** 学习阶段步数（ts-fsrs v5+） */
  learningSteps: number;
  /** 上次复习时间（新卡为 null） */
  lastReview: Date | null;
}

/**
 * 复习评分
 *
 * 数值对应 ts-fsrs 的 Rating 枚举（Manual=0 不用于评分）。
 * DB 中以 integer 存储，与此一致。
 */
export const SRS_RATING = {
  /** 完全不会 */
  Again: 1,
  /** 勉强想起，偏难 */
  Hard: 2,
  /** 正常想起 */
  Good: 3,
  /** 轻松想起 */
  Easy: 4,
} as const;

/** 复习评分值（1-4），等价于 ts-fsrs 的 Grade */
export type SrsRating = (typeof SRS_RATING)[keyof typeof SRS_RATING];

/**
 * 一次复习日志（调度产生的副产物）
 *
 * 对应 ts-fsrs 的 ReviewLog 子集，落库到 review_log 表。
 * state 为复习"前"的状态；stability/difficulty 为复习"后"的快照。
 */
export interface SrsReviewLog {
  /** 本次评分 */
  rating: SrsRating;
  /** 复习前的卡片状态 */
  state: CardState;
  /** 本次复习时该卡的 due */
  due: Date;
  /** 复习后稳定性 */
  stability: number;
  /** 复习后难度 */
  difficulty: number;
  /** 复习后排期间隔天数 */
  scheduledDays: number;
}

/**
 * 调度结果
 *
 * schedule() 的返回：更新后的卡片调度状态 + 本次复习日志。
 * 调用方据此 UPDATE card 并 INSERT review_log。
 */
export interface ScheduleResult {
  /** 更新后的卡片调度状态 */
  next: CardSchedulingState;
  /** 本次复习日志 */
  log: SrsReviewLog;
}

/**
 * 四档评分的间隔预览
 *
 * 用于复习界面在按钮上显示"选这档下次几天后复习"。
 * 每档给出更新后的 due 与间隔天数（不落库，仅展示）。
 */
export type SchedulePreview = Record<
  SrsRating,
  { due: Date; scheduledDays: number }
>;
