/**
 * SRS 调度器接口与工厂
 *
 * 定义算法无关的调度器契约，并按用户偏好的算法返回对应实现。
 * v0.1 仅实装 FSRS（ADR-004）；SM-2 作为可选算法预留接口，未实装时
 * 显式抛错而非静默回退 FSRS——避免"以为在用 SM-2、实则跑 FSRS"的隐患。
 * 真正接入 SM-2 时（第二个算法倒逼），在此补一个实现即可，上层不动。
 */

import type { SrsAlgorithm } from "@/db/schema";
import { fsrsScheduler } from "./fsrs-adapter";
import type {
  CardSchedulingState,
  SchedulePreview,
  ScheduleResult,
  SrsRating,
} from "./types";

/**
 * 调度器接口（算法无关）
 *
 * 所有间隔重复算法（FSRS / SM-2）实现此接口，对上层暴露统一能力。
 */
export interface SrsScheduler {
  /** 算法标识 */
  readonly algorithm: SrsAlgorithm;

  /**
   * 为新建卡片生成初始调度状态
   * @param now 创建时刻（新卡立即可进队列，due = now）
   */
  createInitialState(now: Date): CardSchedulingState;

  /**
   * 根据评分推进卡片调度状态
   * @param state 复习前的卡片调度状态
   * @param rating 本次评分（1-4）
   * @param now 复习时刻
   * @returns 更新后的状态 + 复习日志
   */
  schedule(
    state: CardSchedulingState,
    rating: SrsRating,
    now: Date
  ): ScheduleResult;

  /**
   * 预览四档评分各自的下次间隔（用于复习界面按钮，不落库）
   * @param state 当前卡片调度状态
   * @param now 复习时刻
   */
  preview(state: CardSchedulingState, now: Date): SchedulePreview;
}

/**
 * 按算法获取调度器实例
 *
 * @param algorithm 用户学习档案中的算法偏好，默认 fsrs
 * @throws 当请求的算法尚未实装时（如 sm2）
 */
export function getScheduler(algorithm: SrsAlgorithm = "fsrs"): SrsScheduler {
  switch (algorithm) {
    case "fsrs":
      return fsrsScheduler;
    case "sm2":
      throw new Error(
        "SM-2 算法尚未实装（v0.1 仅支持 FSRS）；请在用户学习档案中使用 fsrs"
      );
    default:
      // 穷尽 SrsAlgorithm 后的兜底，理论不可达
      throw new Error(`未知的 SRS 算法: ${algorithm satisfies never}`);
  }
}
