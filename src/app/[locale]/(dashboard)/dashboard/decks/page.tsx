import { BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateDeckDialog } from "@/features/deck/components/create-deck-dialog";
import { getUserDecks } from "@/features/deck/queries";
import { ensureSampleDeck } from "@/features/deck/seed/sample-deck";
import { getServerSession } from "@/lib/auth/server";

/**
 * 牌组列表页
 *
 * 展示用户的全部牌组及各组卡片统计；首次进入（无牌组）自动建示例牌组。
 */
export default async function DecksPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  // 首次进入时为用户准备一套示例牌组（幂等，已有牌组则跳过）
  await ensureSampleDeck(session.user.id);

  const decks = await getUserDecks(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">我的牌组</h2>
          <p className="text-muted-foreground">管理牌组，开始间隔重复复习</p>
        </div>
        <CreateDeckDialog />
      </div>

      {decks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">还没有牌组</h3>
            <p className="mb-4 text-muted-foreground">
              创建第一个牌组，开始添加卡片
            </p>
            <CreateDeckDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Link key={deck.id} href={`/dashboard/decks/${deck.id}`}>
              <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{deck.name}</CardTitle>
                    <Badge variant="outline">{deck.learningLanguage}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deck.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {deck.description}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      {deck.totalCards} 张
                    </span>
                    {deck.dueCards > 0 ? (
                      <Badge variant="secondary">到期 {deck.dueCards}</Badge>
                    ) : null}
                    {deck.newCards > 0 ? (
                      <Badge variant="secondary">新卡 {deck.newCards}</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
