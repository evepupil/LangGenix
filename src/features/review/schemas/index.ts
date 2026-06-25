import { z } from "zod";

/**
 * 复习评分 Schema
 *
 * rating 1-4 对应 ts-fsrs Rating：1=Again 2=Hard 3=Good 4=Easy。
 */
export const reviewCardSchema = z.object({
  /** 卡片 ID */
  cardId: z.string().min(1, "卡片ID不能为空"),
  /** 评分（1=Again 2=Hard 3=Good 4=Easy） */
  rating: z.number().int().min(1, "评分最小为1").max(4, "评分最大为4"),
});

/**
 * 类型导出
 */
export type ReviewCardInput = z.infer<typeof reviewCardSchema>;
