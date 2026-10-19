import { test, expect, type Page } from "@playwright/test";
const SAVE_KEY = "forest-story.progress.v1";
async function click(page: Page, label: string) {
  const button = page.getByRole("button", { name: label, exact: true });
  await expect(button).toBeEnabled();
  await button.click();
}
async function start(page: Page) {
  await page.goto("/");
  await click(page, "家长读");
  await click(page, "开始一起玩");
  await click(page, "我们来找找");
}
async function getToChoice(page: Page) {
  for (const item of ["篮子", "杯子", "餐巾"]) await click(page, `找到${item}`);
  await click(page, "都找到了");
  await expect(
    page.getByRole("heading", { name: "你从哪里看出风来过？" }),
  ).toBeVisible();
  await click(page, "去找屹耳");
  await click(page, "去大树旁");
  await click(page, "我们可以怎样陪他");
}
async function getToPicnic(page: Page, choice: "listen" | "stay") {
  await getToChoice(page);
  await page
    .getByRole("button", {
      name: choice === "listen" ? "先听他说说" : "在旁边陪一会儿",
    })
    .click();
  await click(page, "就这样陪他");
  await click(page, "继续讲");
  await expect(
    page.getByText(
      choice === "listen"
        ? "我不想刚铺好垫子，就又得追着它跑。"
        : "谢谢你们等我。也许，我们可以先把垫子压住。",
      { exact: true },
    ),
  ).toBeVisible();
  await click(page, "留一点时间聊聊");
  await click(page, "一起想办法");
  await expect(
    page.getByRole("button", { name: "摆好我们的野餐" }),
  ).toHaveCount(0);
  for (const slot of [3, 1, 2]) await click(page, `给第${slot}个垫角放石头`);
  await click(page, "摆好我们的野餐");
}

for (const choice of ["listen", "stay"] as const)
  test(`完整首章：${choice} 分支、恢复、交换、装饰与日记`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await start(page);
    await expect(page.getByRole("button", { name: "都找到了" })).toHaveCount(0);
    await getToPicnic(page, choice);
    await click(page, "第2个空座位");
    await click(page, "第1个空座位");
    await page.reload();
    await click(page, "继续这次小冒险");
    await expect(
      page.getByRole("button", { name: "小猪的座位" }),
    ).toBeVisible();
    await click(page, "第3个空座位");
    await click(page, "维尼的座位");
    await click(page, "小猪的座位");
    await page.getByRole("button", { name: "一朵纸花", exact: true }).click();
    await page.getByRole("button", { name: "一片叶子", exact: true }).click();
    await page.getByRole("button", { name: "一片叶子", exact: true }).click();
    await click(page, "开餐吧");
    await click(page, "把今天记下来");
    await expect(
      page.getByRole("heading", { name: "我们的小小野餐" }),
    ).toBeVisible();
    await expect(page.locator(".diary-friends")).toHaveText(
      /维尼座位 1小猪座位 2屹耳座位 3/,
    );
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
      SAVE_KEY,
    );
    expect(saved.seats).toEqual(["bear", "pig", "donkey"]);
    expect(saved.decorations).toEqual(["flower"]);
    expect(saved.completed).toBe(true);
    await page.screenshot({
      path: `test-results/${choice}-${test.info().project.name}-diary.png`,
      fullPage: true,
    });
    await click(page, "上一页");
    await click(page, "把今天记下来");
    await click(page, "把美好放回书架");
    await page.reload();
    await click(page, "看看我们的日记");
    await expect(
      page.getByRole("heading", { name: "我们的小小野餐" }),
    ).toBeVisible();
    await click(page, "再摆一次野餐");
    await expect(
      page.getByRole("button", { name: "一朵纸花" }),
    ).toHaveAttribute("aria-pressed", "true");
    await click(page, "上一页");
    await page.reload();
    await click(page, "继续这次小冒险");
    await expect(page.locator(".stone-slot.placed")).toHaveCount(3);
    await click(page, "摆好我们的野餐");
    await expect(page.getByRole("button", { name: "维尼的座位" })).toBeVisible();
    await expect(page.getByRole("button", { name: "一朵纸花" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(errors).toEqual([]);
  });

test("逐页返回保留收集，第一页返回书架，分支可重选", async ({ page }) => {
  await start(page);
  await click(page, "找到杯子");
  await click(page, "上一页");
  await expect(page.getByRole("heading", { name: "咦，风也来野餐了" })).toBeVisible();
  await click(page, "书架");
  await click(page, "继续这次小冒险");
  await click(page, "我们来找找");
  await expect(page.getByRole("button", { name: "找到杯子", exact: true })).toBeDisabled();
  for (const item of ["篮子", "餐巾"]) await click(page, `找到${item}`);
  await click(page, "都找到了");
  await click(page, "去找屹耳");
  await click(page, "去大树旁");
  await click(page, "我们可以怎样陪他");
  await page.getByRole("button", { name: "先听他说说" }).click();
  await click(page, "就这样陪他");
  await click(page, "上一页");
  await expect(page.getByRole("button", { name: "先听他说说" }))
    .toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "在旁边陪一会儿" }).click();
  await click(page, "就这样陪他");
  await click(page, "继续讲");
  await expect(page.getByText("谢谢你们等我。也许，我们可以先把垫子压住。", { exact: true })).toBeVisible();
});

test("暂停、帮助、返回书架、重玩取消与清除确认", async ({ page }) => {
  await start(page);
  await click(page, "找到杯子");
  await click(page, "帮帮我");
  await expect(page.locator(".find-object.hinted:not(.found)")).toHaveCount(2);
  await click(page, "歇一会儿");
  await expect(page.getByRole("dialog")).toBeVisible();
  await click(page, "先回书架");
  await click(page, "从头玩");
  await click(page, "保留记录，返回");
  await click(page, "继续这次小冒险");
  await expect(
    page.getByRole("button", { name: "找到杯子", exact: true }),
  ).toBeDisabled();
  await click(page, "家长小角落");
  await page.getByRole("checkbox", { name: "减少动态效果" }).check();
  await expect(page.locator(".app")).toHaveClass(/reduce-motion/);
  await click(page, "清除本机故事记录");
  await click(page, "保留记录，返回");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).not.toBeNull();
  await click(page, "清除本机故事记录");
  await click(page, "确认清除记录");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBeNull();
  await click(page, "返回书架");
  await expect(page.getByRole("button", { name: "开始一起玩" })).toBeVisible();
});

test("录音加载失败仍可推进，后台会暂停", async ({ page }) => {
  // 只阻断音频请求，保留 Vite 的 ?import&url 模块；WebKit 将音频标记为 other。
  await page.route("**/v2_intro_0.mp3", (route) => route.abort());
  await page.goto("/");
  await click(page, "开始一起玩");
  await expect(
    page.getByText(
      "声音暂时无法播放。可以点朗读按钮再试，或切换“家长读”继续。",
    ),
  ).toBeVisible();
  await click(page, "我们来找找");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog", { name: "森林会等你" })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });
  await click(page, "继续故事");
  await click(page, "找到杯子");
  await expect(
    page.getByRole("button", { name: "找到杯子", exact: true }),
  ).toBeDisabled();
});

test("无效存档不静默抹除，确认后才重新开始", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    (key) => localStorage.setItem(key, "broken-original"),
    SAVE_KEY,
  );
  await page.reload();
  await expect(
    page.getByText(
      "这份进度暂时读不出来，原记录已保留。重新开始前会请你确认。",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe("broken-original");
  await click(page, "开始一起玩");
  await click(page, "保留记录，返回");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe("broken-original");
  await click(page, "开始一起玩");
  await click(page, "确认重新开始");
  await expect(
    page.getByRole("heading", { name: "咦，风也来野餐了" }),
  ).toBeVisible();
});

test("图片失败显示重试，恢复加载后可继续", async ({ page }) => {
  let block = true;
  await page.route("**/art/search.webp*", (route) =>
    block ? route.abort() : route.continue(),
  );
  await start(page);
  await expect(page.getByText("森林的画面还在路上")).toBeVisible();
  block = false;
  await click(page, "重新加载画面");
  await expect(page.locator(".find-board img")).toBeVisible();
  await click(page, "找到杯子");
});

test("320 / 390 / 430 / 1280 布局无横向溢出", async ({ page }) => {
  for (const width of [320, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: width > 650 ? 900 : 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "风吹走的野餐" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1280)
      await page.screenshot({
        path: `test-results/home-${width}-${test.info().project.name}.png`,
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await click(page, "家长读");
  await click(page, "开始一起玩");
  await click(page, "我们来找找");
  for (const name of ["上一页", "歇一会儿"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeInViewport();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/find-320-${test.info().project.name}.png`,
    fullPage: true,
  });
});
