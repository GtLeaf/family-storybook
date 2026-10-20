import { test, expect } from "@playwright/test";

const fileName = (url: string) => new URL(url).pathname.split("/").pop()!;

function watchArtwork(page: import("@playwright/test").Page) {
  const requested: string[] = [];
  const completed = new Set<string>();
  page.on("request", request => {
    if (request.url().includes("/art/")) requested.push(fileName(request.url()));
  });
  page.on("response", response => {
    if (!response.url().includes("/art/") || !response.ok()) return;
    void response.finished().then(error => {
      if (!error) completed.add(fileName(response.url()));
    });
  });
  return { requested, completed };
}

async function decodedScene(page: import("@playwright/test").Page, selector: string) {
  await expect.poll(() => page.locator(`${selector} > img`).evaluate((node: HTMLImageElement) =>
    node.complete && node.naturalWidth > 0)).toBe(true);
  await page.locator(`${selector} svg image`).evaluateAll(async nodes => {
    await Promise.all(nodes.map(async node => {
      const image = new Image();
      image.src = node.getAttribute("href")!;
      await image.decode();
    }));
  });
}

test("封面完成后才预取开场，预取完断网仍可显示开场背景与角色", async ({ page, context }) => {
  const { requested, completed } = watchArtwork(page);
  let releaseCover!: () => void;
  const coverGate = new Promise<void>(resolve => { releaseCover = resolve; });
  await page.route("**/art/cover.webp*", async route => {
    await coverGate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => requested.includes("cover.webp")).toBe(true);
  expect(requested.filter(name => name !== "cover.webp")).toEqual([]);
  releaseCover();
  for (const file of ["wind.webp", "bear.webp", "pig.webp"])
    await expect.poll(() => completed.has(file)).toBe(true);
  expect(requested).not.toContain("search.webp");
  expect(requested).not.toContain("discovery.webp");
  await context.setOffline(true);
  await page.getByRole("button", { name: "家长读", exact: true }).click();
  await page.getByRole("button", { name: "开始一起玩", exact: true }).click();
  await decodedScene(page, ".scene-intro");
  await expect(page.getByText("森林的画面还在路上")).toHaveCount(0);
});

test("开场期间预取寻找和小路，翻页与 SVG 遮挡复用相同图片", async ({ page }) => {
  const { requested, completed } = watchArtwork(page);
  await page.goto("/");
  await page.getByRole("button", { name: "家长读", exact: true }).click();
  await page.getByRole("button", { name: "开始一起玩", exact: true }).click();
  for (const file of ["search.webp", "path.webp"])
    await expect.poll(() => completed.has(file)).toBe(true);
  expect(requested).not.toContain("picnic.webp");
  const before = requested.filter(name => name === "search.webp").length;
  await page.getByRole("button", { name: "我们来找找", exact: true }).click();
  await decodedScene(page, ".find-board");
  expect(requested.filter(name => name === "search.webp")).toHaveLength(before);
  const background = await page.locator(".find-board > img").getAttribute("src");
  const foreground = await page.locator(".search-foreground image").getAttribute("href");
  expect(foreground).toBe(background);
  for (const file of ["discovery.webp", "donkey.webp"])
    await expect.poll(() => completed.has(file)).toBe(true);
  await page.screenshot({ path: `test-results/artwork-find-${test.info().project.name}.png`, fullPage: true });
});

test("预取失败后切到当前场景仍会重试，不保留失败缓存", async ({ page }) => {
  let failFirst = true;
  let failed = false;
  await page.route("**/art/search.webp*", async route => {
    if (failFirst) {
      failFirst = false;
      failed = true;
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "家长读", exact: true }).click();
  await page.getByRole("button", { name: "开始一起玩", exact: true }).click();
  await expect.poll(() => failed).toBe(true);
  await page.getByRole("button", { name: "我们来找找", exact: true }).click();
  await decodedScene(page, ".find-board");
  await expect(page.getByText("森林的画面还在路上")).toHaveCount(0);
  await page.getByRole("button", { name: "找到杯子", exact: true }).click();
  await expect(page.getByRole("button", { name: "找到杯子", exact: true })).toBeDisabled();
});
