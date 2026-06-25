"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteDeckAction } from "@/features/deck/actions";

/**
 * 删除牌组按钮（带二次确认）—— 删除后返回牌组列表
 */
export function DeleteDeckButton({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteDeckAction({ id: deckId });
      if (result?.data) {
        toast.success("牌组已删除");
        router.push("/dashboard/decks");
      } else if (result?.serverError) {
        toast.error(result.serverError);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("删除失败，请重试");
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除整个牌组？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作不可撤销，牌组内所有卡片及复习记录将被永久删除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
