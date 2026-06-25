import { z } from "zod";

/**
 * 创建牌组 Schema
 */
export const createDeckSchema = z.object({
  /** 牌组名称 */
  name: z.string().min(1, "牌组名称不能为空").max(100, "牌组名称最多100个字符"),
  /** 牌组描述（可选） */
  description: z.string().max(500, "描述最多500个字符").optional(),
  /**
   * 所属学习语言码（如 en/ja）—— 注意不是 next-intl 界面语言。
   * 默认 en；不硬编码为唯一值，为多语言留口（ADR-003）。
   */
  learningLanguage: z
    .string()
    .min(2, "语言码至少2位")
    .max(10, "语言码最多10位")
    .default("en"),
});

/**
 * 更新牌组 Schema
 */
export const updateDeckSchema = z.object({
  /** 牌组 ID */
  id: z.string().min(1, "牌组ID不能为空"),
  /** 牌组名称 */
  name: z.string().min(1, "牌组名称不能为空").max(100, "牌组名称最多100个字符"),
  /** 牌组描述（可选，传 null 清空） */
  description: z.string().max(500, "描述最多500个字符").nullable().optional(),
});

/**
 * 删除牌组 Schema
 */
export const deleteDeckSchema = z.object({
  /** 牌组 ID */
  id: z.string().min(1, "牌组ID不能为空"),
});

/**
 * 类型导出
 */
export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
export type DeleteDeckInput = z.infer<typeof deleteDeckSchema>;
