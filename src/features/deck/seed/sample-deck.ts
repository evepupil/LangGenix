/**
 * 示例牌组 seed（v0.1 D5）
 *
 * 用户首次进入牌组页且尚无任何牌组时，自动建一套示例牌组，
 * 让其开箱即可体验复习闭环（不必先手动倒卡）。
 *
 * 这是"示例"而非"精选"——ADR-005 的高质量精选牌组（考研/四六级核心词）
 * 仍留待后续版本，这里只放约 25 个常用英语词作为上手样例。
 */

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { card, deck } from "@/db/schema";
import { getScheduler } from "@/features/srs";

/** 示例牌组的卡片（常用英语词 → 中文释义） */
const SAMPLE_CARDS: Array<{ front: string; back: string }> = [
  { front: "apple", back: "苹果（n.）" },
  { front: "book", back: "书；预订（n./v.）" },
  { front: "cat", back: "猫（n.）" },
  { front: "dog", back: "狗（n.）" },
  { front: "eat", back: "吃（v.）" },
  { front: "friend", back: "朋友（n.）" },
  { front: "good", back: "好的（adj.）" },
  { front: "house", back: "房子（n.）" },
  { front: "idea", back: "主意，想法（n.）" },
  { front: "jump", back: "跳（v.）" },
  { front: "know", back: "知道（v.）" },
  { front: "learn", back: "学习（v.）" },
  { front: "money", back: "钱（n.）" },
  { front: "name", back: "名字（n.）" },
  { front: "open", back: "打开（v.）；开着的（adj.）" },
  { front: "people", back: "人们（n.）" },
  { front: "question", back: "问题（n.）" },
  { front: "run", back: "跑（v.）" },
  { front: "school", back: "学校（n.）" },
  { front: "time", back: "时间（n.）" },
  { front: "use", back: "使用（v.）" },
  { front: "voice", back: "声音（n.）" },
  { front: "water", back: "水（n.）" },
  { front: "year", back: "年（n.）" },
  { front: "young", back: "年轻的（adj.）" },
];

/**
 * 若用户尚无任何牌组，则为其创建一套示例牌组（含示例卡片）。
 *
 * 幂等：仅当用户名下没有牌组时才创建，避免重复。
 * @returns 新建的牌组 ID；若已有牌组则返回 null
 */
export async function ensureSampleDeck(userId: string): Promise<string | null> {
  const existing = await db
    .select({ id: deck.id })
    .from(deck)
    .where(eq(deck.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return null;
  }

  const deckId = crypto.randomUUID();
  await db.insert(deck).values({
    id: deckId,
    userId,
    name: "示例牌组（常用英语词）",
    description: "上手用的示例牌组，可随时删除。",
    learningLanguage: "en",
  });

  const now = new Date();
  const scheduler = getScheduler();
  const rows = SAMPLE_CARDS.map((c) => {
    const init = scheduler.createInitialState(now);
    return {
      id: crypto.randomUUID(),
      deckId,
      userId,
      type: "basic" as const,
      front: c.front,
      back: c.back,
      due: init.due,
      stability: init.stability,
      difficulty: init.difficulty,
      scheduledDays: init.scheduledDays,
      reps: init.reps,
      lapses: init.lapses,
      state: init.state,
      learningSteps: init.learningSteps,
      lastReview: init.lastReview,
    };
  });

  await db.insert(card).values(rows);

  return deckId;
}
