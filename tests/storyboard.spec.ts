import { test, expect, type Page } from "@playwright/test";

async function click(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  await expect(button).toBeEnabled();
  await button.click();
}
async function start(page: Page) {
  await page.goto("/");
  await click(page, "家长读");
  await click(page, "开始一起玩");
}
async function arrive(page: Page) {
  await start(page);
  await click(page, "我们来找找");
  for (const item of ["杯子", "餐巾", "篮子"]) await click(page, `找到${item}`);
  await click(page, "都找到了");
  await click(page, "去找屹耳");
}

test("页内镜头、手动讲述与角色出场顺序", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await start(page);
  await expect(page.locator(".storyboard-scene > img")).toHaveAttribute("src", /wind.webp/);
  await expect(page.locator(".actor-donkey")).toHaveCount(0);
  await click(page, "继续讲");
  await expect(page.locator(".storyboard-scene")).toHaveClass(/camera-props/);
  await click(page, "看完整画面");
  await expect(page.locator(".current-story-line")).toContainText("我们一起找找吧");
  await expect(page.locator(".storyboard-scene")).toHaveClass(/camera-wide/);
  await click(page, "重看这一幕");
  await expect(page.locator(".current-story-line")).toContainText("维尼和小猪刚准备好野餐");
  await page.getByText("读完整页", { exact: true }).click();
  await expect(page.locator(".page-transcript")).toContainText("至少，刚才还没有");
  await click(page, "我们来找找");
  await click(page, "找到杯子");
  await expect(page.getByRole("button", { name: "找到杯子", exact: true })).toHaveCSS("opacity", "0");
  await expect(page.locator(".search-foreground")).toBeVisible();
  for (const item of ["餐巾", "篮子"]) await click(page, `找到${item}`);
  await click(page, "都找到了");
  await expect(page.locator(".gathered-props")).toBeVisible();
  await click(page, "去找屹耳");
  await expect(page.locator(".actor-donkey")).toHaveCount(0);
  await click(page, "看完整画面");
  await expect(page.locator(".actor-walk")).toHaveCount(2);
  await click(page, "去大树旁");
  await expect(page.locator(".actor-donkey")).toHaveCount(1);
  await expect(page.locator(".actor-arrive")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("陪伴分支画面不同，讨论继承站位，重新选择会更新画面", async ({ page }) => {
  await arrive(page);
  await click(page, "去大树旁");
  await click(page, "我们可以怎样陪他");
  await page.getByRole("button", { name: "先听他说说" }).click();
  await click(page, "就这样陪他");
  const bear = page.locator(".actor-bear");
  await expect(bear).toHaveAttribute("data-facing", "left");
  await click(page, "上一页");
  await page.getByRole("button", { name: "在旁边陪一会儿" }).click();
  await click(page, "就这样陪他");
  await expect(bear).toHaveAttribute("data-facing", "right");
  await expect(page.locator(".scene-caption")).toContainText("安静地陪在旁边");
  const before = await bear.getAttribute("style");
  await click(page, "留一点时间聊聊");
  expect(await bear.getAttribute("style")).toBe(before);
  await expect(page.locator(".scene-caption")).toContainText("你们的声音");
  await page.screenshot({ path: `test-results/storyboard-companion-${test.info().project.name}.png`, fullPage: true });
});

test("逐句配音结束后切换镜头和发言者，返回取消旧语句", async ({ page }) => {
  await page.addInitScript(() => {
    window.audioPlayer = null;
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.audioPlayer = this;
      return original.call(this);
    };
  });
  await page.goto("/");
  await click(page, "开始一起玩");
  async function finish() {
    await expect.poll(() => page.evaluate(() => window.audioPlayer?.currentTime ?? 0)).toBeGreaterThan(.05);
    await page.evaluate(() => {
      const player = window.audioPlayer;
      if (player) player.currentTime = player.duration - .04;
    });
  }
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.src)).toContain("v2_intro_0.mp3");
  await finish();
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.src)).toContain("v2_intro_1.mp3");
  await expect(page.locator(".storyboard-scene")).toHaveClass(/camera-props/);
  await finish();
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.src)).toContain("v2_intro_2.mp3");
  await expect(page.locator(".actor-bear .actor-body")).toHaveClass(/actor-speaking/);
  await click(page, "歇一会儿");
  expect(await page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
  await click(page, "继续故事");
  await click(page, "我们来找找");
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.src)).toContain("v2_find_0.mp3");
  await expect(page.locator(".actor-bear .actor-body")).not.toHaveClass(/actor-speaking/);
  await click(page, "上一页");
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.src)).toContain("v2_intro_0.mp3");
});

test("固定物与人物位置保留到结尾，暂停和减少动态可用", async ({ page }) => {
  await arrive(page);
  await click(page, "去大树旁");
  await click(page, "我们可以怎样陪他");
  await page.getByRole("button", { name: "在旁边陪一会儿" }).click();
  for (const name of ["就这样陪他", "留一点时间聊聊", "一起想办法"]) await click(page, name);
  const target = page.getByRole("button", { name: "给第1个垫角放石头", exact: true });
  const relativeBounds = () => target.evaluate(node => {
    const box = node.getBoundingClientRect();
    const scene = node.closest(".scene-art")!.getBoundingClientRect();
    return { x: box.x - scene.x, y: box.y - scene.y, width: box.width, height: box.height };
  });
  const bounds = await relativeBounds();
  await click(page, "继续讲");
  expect(await relativeBounds()).toEqual(bounds);
  await expect(page.locator(".flutter-corner")).toHaveCount(3);
  for (const n of [1, 2, 3]) await click(page, `给第${n}个垫角放石头`);
  await expect(page.locator(".flutter-corner")).toHaveCount(0);
  await click(page, "摆好我们的野餐");
  await expect(page.locator(".fixed-stone")).toHaveCount(3);
  await expect(page.locator(".corner-basket")).toHaveCount(1);
  for (const n of [3, 1, 2]) await click(page, `第${n}个空座位`);
  await click(page, "一片叶子");
  await click(page, "开餐吧");
  const friends = await page.locator(".scene-cast .scene-actor").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-friend")));
  expect(friends).toEqual(["pig", "donkey", "bear"]);
  await expect(page.locator(".fixed-stone")).toHaveCount(3);
  await expect(page.locator(".decoration-space svg")).toHaveCount(1);
  await click(page, "歇一会儿");
  await expect(page.locator(".wind-leaf-0")).toHaveCSS("animation-play-state", "paused");
  await click(page, "声音与家长设置");
  await page.getByRole("checkbox", { name: "减少动态效果" }).check();
  await click(page, "返回故事");
  await click(page, "继续故事");
  await expect(page.locator(".wind-layer")).toBeHidden();
  await expect(page.locator(".actor-body").first()).toHaveCSS("animation-name", "none");
  await page.screenshot({ path: `test-results/storyboard-ending-${test.info().project.name}.png`, fullPage: true });
});
