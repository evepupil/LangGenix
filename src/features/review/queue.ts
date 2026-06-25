/**
 * 复习队列计算（模块 1.4，纯逻辑、可单测）
 *
 * 从候选卡片中按规则筛选、排序、限额，产出本次复习队列。
 * 与数据库解耦：调用方先查出候选卡片交给本模块，本模块不碰 DB。
 *
 * 排序优先级（已定）：重学（relearning） > 到期复习（review/learning 到期） > 新卡。
 * 新卡整体排在到期卡之后（v0.1 不穿插，简单可预测）。
 */

import type { CardState } from "@/db/schema";

/**
 * 队列计算所需的卡片最小信息
 */
export interface QueueCandidate {
  id: string;
  state: CardState;
  due: Date;
}

/**
 * 每日上限
 */
export interface QueueLimits {
  /** 每日新卡引入上限 */
  dailyNewLimit: number;
  /** 每日复习上限（到期 + 重学卡之和的上限） */
  dailyReviewLimit: number;
}

/**
 * 队列分组结果
 */
export interface ReviewQueue {
  /** 最终复习顺序：重学 → 到期 → 新卡 */
  cardIds: string[];
  /** 各类计数（用于 UI 展示） */
  counts: {
    relearning: number;
    due: number;
    new: number;
    total: number;
  };
}

/**
 * 判断卡片当前是否到期可复习
 *
 * - new：始终视为"可作为新卡引入"（不看 due）
 * - 其余：due <= now 即到期
 */
function isDue(card: QueueCandidate, now: Date): boolean {
  return card.due.getTime() <= now.getTime();
}

/**
 * 构建复习队列
 *
 * @param candidates 候选卡片（某牌组下的全部卡片）
 * @param limits 每日上限
 * @param now 基准时刻
 *
 * 限额口径（v0.1 简化）：
 * - 新卡：取最多 dailyNewLimit 张（不扣减"今日已学新卡"，完整配额扣减留待
 *   统计模块就绪后精确化，避免现在引入跨日配额状态）。
 * - 复习（重学 + 到期）：合计取最多 dailyReviewLimit 张，重学优先。
 */
export function buildQueue(
  candidates: QueueCandidate[],
  limits: QueueLimits,
  now: Date = new Date()
): ReviewQueue {
  // 重学卡：state=relearning 且到期，按 due 升序（最早到期先复习）
  const relearning = candidates
    .filter((c) => c.state === "relearning" && isDue(c, now))
    .sort((a, b) => a.due.getTime() - b.due.getTime());

  // 到期复习卡：state 为 review/learning 且到期
  const due = candidates
    .filter(
      (c) => (c.state === "review" || c.state === "learning") && isDue(c, now)
    )
    .sort((a, b) => a.due.getTime() - b.due.getTime());

  // 新卡：state=new，按 due 升序（一般即创建顺序）
  const newCards = candidates
    .filter((c) => c.state === "new")
    .sort((a, b) => a.due.getTime() - b.due.getTime());

  // 限额：复习（重学+到期）合计 ≤ dailyReviewLimit，重学优先占额
  const reviewCap = Math.max(0, limits.dailyReviewLimit);
  const cappedRelearning = relearning.slice(0, reviewCap);
  const remainingReviewCap = reviewCap - cappedRelearning.length;
  const cappedDue = due.slice(0, Math.max(0, remainingReviewCap));

  // 新卡限额
  const cappedNew = newCards.slice(0, Math.max(0, limits.dailyNewLimit));

  const cardIds = [
    ...cappedRelearning.map((c) => c.id),
    ...cappedDue.map((c) => c.id),
    ...cappedNew.map((c) => c.id),
  ];

  return {
    cardIds,
    counts: {
      relearning: cappedRelearning.length,
      due: cappedDue.length,
      new: cappedNew.length,
      total: cardIds.length,
    },
  };
}
