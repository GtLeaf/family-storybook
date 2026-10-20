import { expect, test } from "@playwright/test";
const finished = {
  schemaVersion: 1, storyVersion: 1, stage: "diary", found: ["cup", "napkin", "basket"],
  choice: "listen", stones: [0, 1, 2], seats: ["bear", "pig", "donkey"],
  decorations: ["flower"], completed: true, updatedAt: "2026-10-20T00:00:00.000Z",
};
test("受限脚本策略下优先读取平台记录，保存失败可见", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'none'; object-src 'none'; worker-src 'none'" } });
  });
  await page.addInitScript(data => {
    const bag: Record<string, string> = { "forest-story.progress.v1": JSON.stringify(data) };
    Object.assign(window, { xhs: {
      launchOptions: { miniToolEnv: { buildVersion: 9490001 } },
      miniTool: {
        getStorage: async ({ key }: { key: string }) => ({ data: bag[key] ?? null }),
        setStorage: async () => { throw new Error("模拟保存失败"); },
        removeStorage: async ({ key }: { key: string }) => { delete bag[key]; },
      },
    } });
  }, finished);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "看看我们的日记", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "看看我们的日记", exact: true }).click();
  await expect(page.locator(".diary-page .board-world")).toBeVisible();
  await expect(page.getByText("这次记录暂时无法保存。故事可以继续，关闭页面后可能需要重新开始。", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("forest-story.progress.v1"))).toBeNull();
  expect(errors).toEqual([]);
});
test("缺少新布局和 DOM API 时，日记画面与互动目标保有尺寸", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(data => {
    localStorage.setItem("forest-story.progress.v1", JSON.stringify(data));
    localStorage.setItem("forest-story.settings.v1", JSON.stringify({ narration: false, volume: .8, reducedMotion: true }));
    for (const name of ["AbortController", "ResizeObserver"]) Object.defineProperty(window, name, { value: undefined, configurable: true });
    Object.defineProperty(HTMLImageElement.prototype, "decode", { value: undefined, configurable: true });
    const original = CSS.supports.bind(CSS);
    CSS.supports = (property: string, value?: string) => /container-type|aspect-ratio/.test(property) || value === "1cqw" || value === "contents" ? false : original(property, value!);
  }, finished);
  await page.goto("/");
  await page.getByRole("button", { name: "看看我们的日记", exact: true }).click();
  await expect(page.locator(".diary-page .board-world")).toBeInViewport({ ratio: 1 });
  const world = await page.locator(".diary-page .board-world").boundingBox();
  expect(world!.height).toBeGreaterThan(120);
  expect(world!.width / world!.height).toBeCloseTo(1.5, 3);
  await page.getByRole("button", { name: "再摆一次野餐", exact: true }).click();
  await expect(page.getByRole("button", { name: "维尼的座位", exact: true })).toBeInViewport();
  expect(errors).toEqual([]);
});
