/**
 * SRS 调度器工厂测试
 *
 * 测试范围（纯函数）：
 * - getScheduler 默认返回 FSRS
 * - 显式 fsrs 返回 FSRS 调度器
 * - 未实装的 sm2 应抛错（而非静默回退）
 */

import { describe, expect, it } from "vitest";

import { getScheduler } from "@/features/srs/scheduler";

describe("getScheduler", () => {
  it("默认返回 FSRS 调度器", () => {
    expect(getScheduler().algorithm).toBe("fsrs");
  });

  it("显式 fsrs 返回 FSRS 调度器", () => {
    expect(getScheduler("fsrs").algorithm).toBe("fsrs");
  });

  it("sm2 尚未实装，应抛错而非回退", () => {
    expect(() => getScheduler("sm2")).toThrowError(/SM-2/);
  });
});
