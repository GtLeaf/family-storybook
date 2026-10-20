import { describe, expect, it } from "vitest";
import { captionPages } from "./captions";
import { storyLines } from "../content/audio";
import { STAGE_IDS } from "../content/story";

describe("完整页阅读弹层", () => {
  it("全部故事和分支分段后无遗漏、无重复，每段不超过弹层阅读预算", () => {
    for (const stage of STAGE_IDS) {
      for (const choice of ["listen", "stay"] as const) {
        for (const { text } of storyLines(stage, choice)) {
          const pages = captionPages(text);
          expect(pages.join("")).toBe(text);
          for (const page of pages) expect(Array.from(page).length).toBeLessThanOrEqual(36);
        }
      }
    }
  });
  it("空段、短段和特殊字符完整保留", () => {
    for (const text of ["", "我们一起读吧。", "小熊说：你好！🍯我们去野餐。".repeat(5)]) {
      expect(captionPages(text).join("")).toBe(text);
    }
  });
});
