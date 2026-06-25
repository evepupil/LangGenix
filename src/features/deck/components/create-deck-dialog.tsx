"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createDeckAction } from "@/features/deck/actions";

/** 支持的学习语言（v0.1 首发英语，预留扩展） */
const LANGUAGE_OPTIONS = [
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
] as const;

/**
 * 新建牌组对话框
 */
export function CreateDeckDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [learningLanguage, setLearningLanguage] = useState("en");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createDeckAction({
        name,
        description: description.trim() || undefined,
        learningLanguage,
      });

      if (result?.data) {
        toast.success("牌组创建成功");
        setOpen(false);
        setName("");
        setDescription("");
        router.refresh();
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("创建牌组失败，请重试");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          新建牌组
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建牌组</DialogTitle>
          <DialogDescription>
            创建一个牌组来组织你的卡片。学习语言用于区分不同外语的牌组。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deck-name">牌组名称 *</Label>
            <Input
              id="deck-name"
              placeholder="如：考研核心词"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deck-lang">学习语言</Label>
            <Select
              value={learningLanguage}
              onValueChange={setLearningLanguage}
            >
              <SelectTrigger id="deck-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deck-desc">描述（可选）</Label>
            <Textarea
              id="deck-desc"
              placeholder="这个牌组的用途…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
