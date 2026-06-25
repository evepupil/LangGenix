import { ArrowLeft, BookOpen, Play } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardEditorDialog } from "@/features/card/components/card-editor-dialog";
import { DeleteCardButton } from "@/features/card/components/delete-card-button";
import { getDeckCards } from "@/features/card/queries";
import { DeleteDeckButton } from "@/features/deck/components/delete-deck-button";
import { getDeckById, getDeckReviewCounts } from "@/features/deck/queries";
import { getServerSession } from "@/lib/auth/server";

/** 卡片状态对应的中文标签 */
const STATE_LABELS: Record<string, string> = {
  new: "新卡",
  learning: "学习中",
  review: "复习",
  relearning: "重学",
};

/**
 * 牌组详情页：牌组信息 + 复习入口 + 卡片管理
 */
export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const { deckId } = await params;
  const deck = await getDeckById(deckId, session.user.id);
  if (!deck) {
    notFound();
  }

  const [cards, counts] = await Promise.all([
    getDeckCards(deckId, session.user.id),
    getDeckReviewCounts(deckId, session.user.id),
  ]);

  const reviewable = counts.dueCards + counts.newCards;

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/decks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{deck.name}</h2>
            <Badge variant="outline">{deck.learningLanguage}</Badge>
          </div>
          {deck.description ? (
            <p className="text-muted-foreground">{deck.description}</p>
          ) : null}
        </div>
        <DeleteDeckButton deckId={deck.id} />
      </div>

      {/* 复习入口 */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <BookOpen className="h-4 w-4" />共 {cards.length} 张
            </span>
            {counts.dueCards > 0 ? (
              <Badge variant="secondary">到期 {counts.dueCards}</Badge>
            ) : null}
            {counts.newCards > 0 ? (
              <Badge variant="secondary">新卡 {counts.newCards}</Badge>
            ) : null}
          </div>
          {reviewable > 0 ? (
            <Link href={`/dashboard/decks/${deck.id}/review`}>
              <Button>
                <Play className="mr-2 h-4 w-4" />
                开始复习（{reviewable}）
              </Button>
            </Link>
          ) : (
            <Button disabled>今日无待复习</Button>
          )}
        </CardContent>
      </Card>

      {/* 卡片管理 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">卡片</h3>
        <CardEditorDialog deckId={deck.id} />
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              这个牌组还没有卡片，添加第一张吧
            </p>
            <CardEditorDialog deckId={deck.id} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.front}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {STATE_LABELS[c.state] ?? c.state}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.back}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <CardEditorDialog
                    deckId={deck.id}
                    card={{ id: c.id, front: c.front, back: c.back }}
                  />
                  <DeleteCardButton cardId={c.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
