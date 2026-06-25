import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewSession } from "@/features/review/components/review-session";
import { getReviewCards, getReviewQueue } from "@/features/review/queries";
import { getServerSession } from "@/lib/auth/server";

/**
 * 复习会话页
 *
 * 取出当前牌组的复习队列与卡片内容，交给 ReviewSession 客户端组件交互。
 */
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const { deckId } = await params;

  // 计算复习队列（同时校验牌组归属：null 表示不存在或越权）
  const queue = await getReviewQueue(deckId, session.user.id);
  if (!queue) {
    notFound();
  }

  const cards = await getReviewCards(queue.cardIds, session.user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/decks/${deckId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">复习</h2>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-medium">今日没有需要复习的卡片</h3>
            <p className="mb-6 mt-1 text-muted-foreground">
              到期卡片会在到期时自动出现在这里
            </p>
            <Link href={`/dashboard/decks/${deckId}`}>
              <Button>返回牌组</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ReviewSession deckId={deckId} cards={cards} />
      )}
    </div>
  );
}
