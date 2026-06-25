"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reviewCardAction } from "@/features/review/actions";
import { SRS_RATING, type SrsRating } from "@/features/srs";
import type { ReviewCard } from "../queries";

/** 4 键评分配置（颜色用 Tailwind 类区分难易） */
const RATING_BUTTONS: Array<{
  rating: SrsRating;
  label: string;
  className: string;
}> = [
  {
    rating: SRS_RATING.Again,
    label: "重来",
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
  {
    rating: SRS_RATING.Hard,
    label: "困难",
    className: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  {
    rating: SRS_RATING.Good,
    label: "良好",
    className: "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    rating: SRS_RATING.Easy,
    label: "简单",
    className: "bg-blue-600 hover:bg-blue-700 text-white",
  },
];

interface ReviewSessionProps {
  /** 所属牌组 ID（用于返回链接） */
  deckId: string;
  /** 本次复习队列的卡片（已按队列顺序） */
  cards: ReviewCard[];
}

/**
 * 复习会话
 *
 * 极简交互：显示正面 → 点击翻面看背面 → 4 键评分 → 自动下一张。
 * 评分通过 reviewCardAction 写回 SRS 状态。队列走完显示完成。
 * FSRS 的复杂参数（stability/difficulty 等）对用户完全隐藏（ADR-004）。
 */
export function ReviewSession({ deckId, cards }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const deckHref = `/dashboard/decks/${deckId}`;
  const current = cards[index];

  const handleRate = async (rating: SrsRating) => {
    if (!current || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await reviewCardAction({ cardId: current.id, rating });
      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }
      setReviewedCount((n) => n + 1);
      setRevealed(false);
      setIndex((i) => i + 1);
    } catch (error) {
      toast.error("评分提交失败，请重试");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 队列完成（current 为空即已走完，TS 据此收窄后续 current 非空）
  if (!current) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CheckCircle2 className="mb-4 h-14 w-14 text-green-600" />
          <h3 className="text-xl font-semibold">本轮复习完成</h3>
          <p className="mb-6 mt-1 text-muted-foreground">
            共复习 {reviewedCount} 张卡片
          </p>
          <Link href={deckHref}>
            <Button>返回牌组</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 进度 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {cards.length}
        </span>
        <Link href={deckHref} className="hover:text-foreground">
          退出复习
        </Link>
      </div>

      {/* 卡面 */}
      <Card className="min-h-64">
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-6 py-10 text-center">
          <div className="text-2xl font-semibold">{current.front}</div>
          {revealed ? (
            <>
              <div className="h-px w-24 bg-border" />
              <div className="whitespace-pre-wrap text-lg text-muted-foreground">
                {current.back}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* 操作区：未翻面显示"显示答案"，翻面后显示 4 键 */}
      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATING_BUTTONS.map((btn) => (
            <Button
              key={btn.rating}
              className={btn.className}
              disabled={isSubmitting}
              onClick={() => handleRate(btn.rating)}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                btn.label
              )}
            </Button>
          ))}
        </div>
      ) : (
        <Button className="w-full" onClick={() => setRevealed(true)}>
          显示答案
        </Button>
      )}
    </div>
  );
}
