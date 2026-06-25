import { z } from "zod";

/**
 * 创建卡片 Schema
 *
 * v0.1 仅支持正反词卡（basic）：front=词，back=释义。
 * type 暂固定 basic，cloze/释义卡后续版本扩展。
 */
export const createCardSchema = z.object({
  /** 所属牌组 ID */
  deckId: z.string().min(1, "牌组ID不能为空"),
  /** 正面（词） */
  front: z.string().min(1, "正面内容不能为空").max(2000, "正面最多2000个字符"),
  /** 背面（释义） */
  back: z.string().min(1, "背面内容不能为空").max(2000, "背面最多2000个字符"),
});

/**
 * 更新卡片 Schema
 */
export const updateCardSchema = z.object({
  /** 卡片 ID */
  id: z.string().min(1, "卡片ID不能为空"),
  /** 正面（词） */
  front: z.string().min(1, "正面内容不能为空").max(2000, "正面最多2000个字符"),
  /** 背面（释义） */
  back: z.string().min(1, "背面内容不能为空").max(2000, "背面最多2000个字符"),
});

/**
 * 删除卡片 Schema
 */
export const deleteCardSchema = z.object({
  /** 卡片 ID */
  id: z.string().min(1, "卡片ID不能为空"),
});

/**
 * 类型导出
 */
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type DeleteCardInput = z.infer<typeof deleteCardSchema>;
