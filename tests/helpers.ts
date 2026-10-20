import { expect, type Page } from "@playwright/test";

// 页面底部现在逐句推进；流程测试先读完当前幕，再进入下一幕。
export async function click(page: Page, name: string) {
  if (name === "家长小角落" && await page.locator(".story-page").isVisible()) {
    await page.getByRole("button", { name: "更多", exact: true }).click();
    await page.getByRole("button", { name: "声音与家长设置", exact: true }).click();
    return;
  }
  const target = page.getByRole("button", { name, exact: true });
  if (["看完整画面", "重看这一幕"].includes(name) && !(await target.isVisible()))
    await page.getByRole("button", { name: "更多", exact: true }).click();
  for (let i = 0; i < 12 && !(await target.isVisible()); i++) {
    const next = page.getByRole("button", { name: "继续讲", exact: true });
    if (!(await next.isVisible())) break;
    await expect(next).toBeEnabled();
    await next.click();
  }
  await expect(target).toBeEnabled();
  await target.click();
}
