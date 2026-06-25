"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { deck } from "@/db/schema";
import {
  createDeckSchema,
  deleteDeckSchema,
  updateDeckSchema,
} from "@/features/deck/schemas";
import { protectedAction } from "@/lib/safe-action";

const withDeckAction = (name: string) =>
  protectedAction.metadata({ action: `deck.${name}` });

/**
 * 创建牌组
 */
export const createDeckAction = withDeckAction("createDeck")
  .schema(createDeckSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const deckId = crypto.randomUUID();

    await db.insert(deck).values({
      id: deckId,
      userId: ctx.userId,
      name: data.name,
      description: data.description ?? null,
      learningLanguage: data.learningLanguage,
    });

    revalidatePath("/dashboard/decks");

    return { message: "牌组创建成功", deckId };
  });

/**
 * 更新牌组（名称 / 描述）
 *
 * 通过 where 同时匹配 id 与 userId，确保只能改自己的牌组。
 */
export const updateDeckAction = withDeckAction("updateDeck")
  .schema(updateDeckSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const updateData: {
      name: string;
      description?: string | null;
      updatedAt: Date;
    } = {
      name: data.name,
      updatedAt: new Date(),
    };
    // description 显式传入时才更新（含传 null 清空）
    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    const updated = await db
      .update(deck)
      .set(updateData)
      .where(and(eq(deck.id, data.id), eq(deck.userId, ctx.userId)))
      .returning({ id: deck.id });

    if (updated.length === 0) {
      throw new Error("牌组不存在或无权访问");
    }

    revalidatePath("/dashboard/decks");
    revalidatePath(`/dashboard/decks/${data.id}`);

    return { message: "牌组更新成功" };
  });

/**
 * 删除牌组
 *
 * 牌组内卡片与复习日志通过外键级联删除（onDelete: cascade）。
 */
export const deleteDeckAction = withDeckAction("deleteDeck")
  .schema(deleteDeckSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    const deleted = await db
      .delete(deck)
      .where(and(eq(deck.id, id), eq(deck.userId, ctx.userId)))
      .returning({ id: deck.id });

    if (deleted.length === 0) {
      throw new Error("牌组不存在或无权访问");
    }

    revalidatePath("/dashboard/decks");

    return { message: "牌组已删除" };
  });
