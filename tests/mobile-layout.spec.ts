import { test, expect, type Page } from "@playwright/test";
import { STAGE_IDS } from "../src/content/story";

const finished = {
  schemaVersion: 1, storyVersion: 1, stage: "diary", found: ["cup", "napkin", "basket"],
  choice: "listen", stones: [0, 1, 2], seats: ["bear", "pig", "donkey"],
  decorations: ["flower"], completed: true, updatedAt: "2026-10-20T00:00:00.000Z",
};
async function fits(page: Page) {
  expect(await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth - innerWidth,
    vertical: document.documentElement.scrollHeight - innerHeight,
    body: document.body.scrollHeight - innerHeight,
  }))).toEqual({ horizontal: 0, vertical: 0, body: 0 });
  if (await page.locator(".mobile-story-actions").isVisible()) {
    expect(await page.locator(".mobile-story-actions").evaluate(node => {
      const safe = Number.parseFloat(getComputedStyle(document.querySelector(".app")!).paddingBottom);
      return Math.abs(node.getBoundingClientRect().bottom + safe - innerHeight);
    })).toBeLessThanOrEqual(1);
  }
}
async function reachable(page: Page, selector: string) {
  for (const target of await page.locator(selector).all()) {
    await expect(target).toBeInViewport({ ratio: 1 });
    expect(await target.evaluate(node => {
      const r = node.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return node === hit || node.contains(hit);
    })).toBe(true);
  }
}

for (const [width, height] of [[320, 568], [360, 640], [390, 760], [430, 932]]) {
  test(`${width}×${height} 所有故事状态、字幕及辅助页面单屏可用`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      localStorage.setItem("forest-story.settings.v1", JSON.stringify({ narration: false, volume: .8, reducedMotion: true }));
    });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    // 沿用应用自身设置格式，避免默认朗读干扰手动字幕逐页检查。
    await page.getByRole("button", { name: "家长读", exact: true }).click();
    await fits(page);
    for (const stage of STAGE_IDS) {
      await page.evaluate(({ data, stage }) => {
        localStorage.setItem("forest-story.progress.v1", JSON.stringify({
          ...data, stage, completed: stage === "diary",
          found: stage === "find" ? [] : data.found,
          stones: stage === "stones" ? [] : data.stones,
          seats: stage === "picnic" ? [null, null, null] : data.seats,
        }));
      }, { data: finished, stage });
      await page.reload();
      await page.getByRole("button", { name: stage === "diary" ? "看看我们的日记" : "继续这次小冒险", exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".story-page")).toBeVisible();
      await fits(page);
      if (stage === "diary") {
        // 图片加载成功也可能被零高度布局隐藏，需要验证实际画面可见。
        const picture = page.locator(".diary-sheet .board-world");
        await expect(picture).toBeVisible();
        await expect(picture).toBeInViewport({ ratio: 1 });
        const bounds = await picture.boundingBox();
        expect(bounds!.height).toBeGreaterThan(120);
        expect(bounds!.width / bounds!.height).toBeCloseTo(3 / 2, 3);
        await expect(picture.locator(".scene-actor")).toHaveCount(3);
        await expect.poll(() => page.locator(".picnic-board > img").evaluate(node =>
          node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
        )).toBe(true);
      }
      if (stage !== "diary") {
        await expect(page.locator(".mobile-reading-area > .mobile-caption")).toBeVisible();
        // 图画与工具占各自空间，字幕不能盖住互动平面。
        expect(await page.locator(".story-spread").evaluate(node => {
          const caption = node.querySelector(".mobile-caption")!.getBoundingClientRect();
          return [...node.querySelectorAll(".scene-art, .found-tray, .task-count, .picnic-tools")]
            .every(element => element.getBoundingClientRect().bottom <= caption.top + 1);
        })).toBe(true);
        await expect(page.locator(".story-toolbar").getByRole("button")).toHaveCount(3);
        // 标题下直接进入实际插画，不再用竖长画框制造顶部留白。
        expect(await page.locator(".scene-visual").evaluate(node => {
          const title = node.querySelector(".mobile-stage-title")!.getBoundingClientRect();
          const world = node.querySelector(".narrative-world, .board-world")!.getBoundingClientRect();
          return Math.abs(world.top - title.bottom - 6);
        })).toBeLessThanOrEqual(1);
        // 实际插画始终完整保留原图比例。
        const ratio = await page.locator(".narrative-world, .board-world").first().evaluate(node => {
          const box = node.getBoundingClientRect();
          return box.width / box.height;
        });
        expect(ratio).toBeCloseTo(3 / 2, 3);
      }
      if (stage === "intro") {
        // 收紧画面后，剩余高度全部分给文案，直到吸底操作栏上方。
        const reader = await page.locator(".caption-scroll").boundingBox();
        const actions = await page.locator(".mobile-story-actions").boundingBox();
        expect(reader!.height).toBeGreaterThan(height * .24);
        expect(Math.abs(reader!.y + reader!.height + 8 - actions!.y)).toBeLessThanOrEqual(1);
      }
      if (stage === "find") await reachable(page, ".find-object:not(:disabled)");
      if (stage === "stones") await reachable(page, ".stone-slot:not(:disabled)");
      if (stage === "picnic") await reachable(page, ".plate:not(:disabled), .decoration-tools button");
      if (stage === "choice") {
        await reachable(page, ".choice-list button");
        const [first, second] = await page.locator(".choice-list button").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
        expect(second.top).toBeGreaterThanOrEqual(first.bottom + 7);
        expect(second.x).toBe(first.x);
      }
      const more = page.getByRole("button", { name: "继续讲", exact: true });
      for (let i = 0; i < 10 && await more.isVisible(); i++) {
        await expect(more).toBeEnabled();
        await more.click();
        await fits(page);
      }
      if (stage !== "diary") {
        await reachable(page, ".mobile-story-actions button");
        await page.getByRole("button", { name: "读完整页", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeInViewport({ ratio: 1 });
        expect(await dialog.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true);
        await page.getByRole("button", { name: "关闭", exact: true }).click();
      }
      if (width === 390 && ["intro", "find", "choice", "picnic", "diary"].includes(stage))
        await page.screenshot({ path: `test-results/single-screen-${stage}-${test.info().project.name}.png` });
    }
    await page.getByRole("button", { name: "更多", exact: true }).click();
    await page.getByRole("button", { name: "声音与家长设置", exact: true }).click();
    for (const name of ["声音", "共玩", "记录", "关于"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await fits(page);
    }
    expect(errors).toEqual([]);
  });
}

test("地址栏可用高度改变时重新分配舞台，字幕和操作保持可见", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "家长读", exact: true }).click();
  await page.getByRole("button", { name: "开始一起玩", exact: true }).click();
  await expect(page.getByRole("button", { name: "继续讲", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "继续讲", exact: true }).click();
  for (const height of [640, 760, 568, 844]) {
    await page.setViewportSize({ width: 390, height });
    await fits(page);
    await expect(page.locator(".current-story-line")).toContainText("餐巾飘远了");
    await reachable(page, ".mobile-story-actions button");
  }
});

test("本页文案累积上推，手动回看不被拉走，翻页与返回清空旧文案", async ({ page }) => {
  // 矮屏仍会产生内部滚动；高屏应优先完整展示多段文字。
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem("forest-story.settings.v1", JSON.stringify({
    narration: false, volume: .8, reducedMotion: true,
  })));
  await page.goto("/");
  await page.getByRole("button", { name: "开始一起玩", exact: true }).click();
  const next = page.getByRole("button", { name: "继续讲", exact: true });
  const scroll = page.locator(".caption-scroll");
  const paragraphs = page.locator(".caption-paragraph");
  await expect(paragraphs).toHaveCount(1);
  await next.click(); await next.click();
  await expect(paragraphs).toHaveCount(3);
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await expect(paragraphs.first()).toContainText("维尼和小猪刚准备好野餐");
  await scroll.focus(); await scroll.press("Home");
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(0);
  await expect(page.getByRole("button", { name: "回到当前句", exact: true })).toBeVisible();
  await next.click();
  await expect(paragraphs).toHaveCount(4);
  expect(await scroll.evaluate(node => node.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "回到当前句", exact: true }).click();
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "我们来找找", exact: true }).click();
  await expect(paragraphs).toHaveCount(1);
  await expect(scroll).not.toContainText("维尼和小猪刚准备好野餐");
  expect(await scroll.evaluate(node => node.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "上一页", exact: true }).click();
  await expect(paragraphs).toHaveCount(1);
  await expect(scroll).toContainText("维尼和小猪刚准备好野餐");
  await expect(scroll).not.toContainText("看看草丛和树根旁");
  expect(await scroll.evaluate(node => node.scrollTop)).toBe(0);
  await fits(page);
});
