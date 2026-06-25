/**
 * 用户学习档案查询（模块 0.4）
 *
 * 学习档案存"当前学习语言 + 学习偏好（算法/每日上限/复习按钮模式）"。
 * 采用"读取或创建默认"模式：用户首次需要时自动建一份默认档案，
 * 避免在注册流程里强耦合档案创建。
 */

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { type UserLearningProfile, userLearningProfile } from "@/db/schema";

/**
 * 确保用户有学习档案，不存在则创建默认档案
 *
 * 默认值由 schema 的列默认值决定（currentLanguage=en / algorithm=fsrs /
 * dailyNewLimit=20 / dailyReviewLimit=200 / reviewButtonMode=four）。
 */
export async function ensureProfile(
  userId: string
): Promise<UserLearningProfile> {
  const [existing] = await db
    .select()
    .from(userLearningProfile)
    .where(eq(userLearningProfile.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userLearningProfile)
    .values({ id: crypto.randomUUID(), userId })
    .returning();

  if (!created) {
    throw new Error("创建学习档案失败");
  }

  return created;
}

/**
 * 获取用户学习档案（读取或创建默认）
 */
export async function getProfile(userId: string): Promise<UserLearningProfile> {
  return ensureProfile(userId);
}
