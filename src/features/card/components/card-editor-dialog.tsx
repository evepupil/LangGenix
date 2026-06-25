"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCardAction, updateCardAction } from "@/features/card/actions";

interface CardEditorDialogProps {
  /** 所属牌组 ID（新建时必需） */
  deckId: string;
  /** 传入则为编辑模式 */
  card?: { id: string; front: string; back: string };
}

/**
 * 卡片新建 / 编辑对话框
 *
 * 不传 card → 新建；传 card → 编辑该卡正反面（不影响其 FSRS 调度状态）。
 */
export function CardEditorDialog({ deckId, card }: CardEditorDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(card);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = isEdit
        ? await updateCardAction({ id: card!.id, front, back })
        : await createCardAction({ deckId, front, back });

      if (result?.data) {
        toast.success(isEdit ? "卡片已更新" : "卡片已添加");
        setOpen(false);
        if (!isEdit) {
          setFront("");
          setBack("");
        }
        router.refresh();
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error(isEdit ? "更新失败，请重试" : "添加失败，请重试");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加卡片
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑卡片" : "添加卡片"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-front">正面（词）*</Label>
            <Textarea
              id="card-front"
              placeholder="如：apple"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              required
              maxLength={2000}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-back">背面（释义）*</Label>
            <Textarea
              id="card-back"
              placeholder="如：苹果（n.）"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              required
              maxLength={2000}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !front.trim() || !back.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
