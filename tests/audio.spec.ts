import { click } from "./helpers";
import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    audioLog: string[];
    audioPlayer: HTMLMediaElement | null;
  }
}


async function expectClip(page: Page, clip: string) {
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.src))
    .toContain(`${clip}.mp3`);
}

async function finishClip(page: Page) {
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.currentTime ?? 0))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    const audio = window.audioPlayer;
    if (audio) audio.currentTime = Math.max(0, audio.duration - 0.1);
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.audioLog = [];
    window.audioPlayer = null;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.audioLog.push(this.src);
      window.audioPlayer = this;
      return play.call(this);
    };
    // 播放录音不应读取设备语音库，也不应回退到浏览器合成。
    Object.defineProperty(window, "speechSynthesis", {
      get() { throw new Error("不应调用浏览器语音合成"); },
    });
  });
});

test("录音可解码播放，暂停、重听、翻页、提示与静音正确", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await click(page, "开始一起玩");
  await expectClip(page, "v2_intro_0");
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.currentTime ?? 0))
    .toBeGreaterThan(0);
  await click(page, "暂停朗读");
  expect(await page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
  await click(page, "重听这一段");
  await expectClip(page, "v2_intro_0");
  await click(page, "我们来找找");
  await expectClip(page, "v2_find_0");
  await click(page, "找到杯子");
  await expectClip(page, "ui_find_cup");
  await click(page, "找到餐巾");
  await expectClip(page, "ui_find_napkin");
  await click(page, "帮帮我");
  await expectClip(page, "ui_find_hint");
  await click(page, "书架");
  expect(await page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
  await click(page, "继续这次小冒险");
  await expectClip(page, "v2_find_0");
  await expect(page.getByRole("button", { name: "找到杯子", exact: true })).toBeDisabled();
  await click(page, "更多");
  expect(await page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
  await click(page, "继续故事");
  await expectClip(page, "v2_find_0");
  await click(page, "更多");
  await click(page, "声音与家长设置");
  await page.getByRole("checkbox", { name: "自动朗读故事" }).uncheck();
  await click(page, "返回故事");
  await click(page, "继续故事");
  const count = await page.evaluate(() => window.audioLog.length);
  await click(page, "找到篮子");
  await click(page, "都找到了");
  await expect(page.getByRole("heading", { name: "你从哪里看出风来过？" })).toBeVisible();
  expect(await page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
  expect(await page.evaluate(() => window.audioLog.length)).toBe(count);
  expect(errors).toEqual([]);
});

for (const choice of ["listen", "stay"] as const) {
  test(`录音匹配 ${choice} 分支、石头接播、座位、装饰和日记`, async ({ page }) => {
    await page.goto("/");
    await click(page, "开始一起玩");
    await click(page, "我们来找找");
    for (const item of ["杯子", "餐巾", "篮子"]) await click(page, `找到${item}`);
    for (const label of ["都找到了", "去找屹耳", "去大树旁", "我们可以怎样陪他"])
      await click(page, label);
    await page.getByRole("button", {
      name: choice === "listen" ? "先听他说说" : "在旁边陪一会儿",
    }).click();
    await expectClip(page, `ui_choice_${choice}`);
    await click(page, "就这样陪他");
    await expectClip(page, choice === "listen" ? "v2_response_listen_0" : "v2_response_stay_0");
    await click(page, "留一点时间聊聊");
    await expectClip(page, "v2_companion-talk_0");
    await click(page, "一起想办法");
    for (const slot of [1, 2, 3]) await click(page, `给第${slot}个垫角放石头`);
    await expectClip(page, "ui_stone_placed");
    // 跳到片尾，由浏览器自然触发结束事件并接播下一段。
    await finishClip(page);
    await expectClip(page, "optional_stones_complete");
    await click(page, "摆好我们的野餐");
    for (const [index, friend] of ["bear", "pig", "donkey"].entries()) {
      await click(page, `第${index + 1}个空座位`);
      await expectClip(page, `ui_seat_placed_${friend}`);
    }
    await click(page, "维尼的座位");
    await expectClip(page, "ui_seat_select_bear");
    await click(page, "小猪的座位");
    await expectClip(page, "ui_seat_placed_bear");
    await click(page, "一朵纸花");
    await expectClip(page, "ui_decoration_added");
    await click(page, "一朵纸花");
    await expectClip(page, "ui_decoration_removed");
    await click(page, "开餐吧");
    await expectClip(page, "v2_ending_0");
    await click(page, "把今天记下来");
    await expectClip(page, "v2_diary_0");
    await finishClip(page);
    await expect.poll(() => page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
    await click(page, "把美好放回书架");
    expect(await page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
  });
}

test("试听中调音量不重播，离开设置停止声音", async ({ page }) => {
  await page.goto("/");
  await click(page, "家长小角落");
  await click(page, "试听声音");
  await expectClip(page, "ui_voice_preview");
  const count = await page.evaluate(() => window.audioLog.length);
  await page.getByRole("slider", { name: "朗读音量" }).fill("0.3");
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.volume)).toBe(0.3);
  expect(await page.evaluate(() => window.audioLog.length)).toBe(count);
  await click(page, "返回书架");
  expect(await page.evaluate(() => window.audioPlayer?.paused)).toBe(true);
});

test("自动播放受限时可点击重试，连续反馈可切换录音", async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let first = true;
    HTMLMediaElement.prototype.play = function () {
      if (first) {
        first = false;
        return Promise.reject(new DOMException("请点击播放", "NotAllowedError"));
      }
      return play.call(this);
    };
  });
  await page.goto("/");
  await click(page, "开始一起玩");
  await expect(page.getByText("浏览器需要你点一下才能播放声音。请点朗读按钮，再一起听故事。"))
    .toBeVisible();
  await click(page, "重听这一段");
  await expectClip(page, "v2_intro_0");
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.currentTime ?? 0)).toBeGreaterThan(0);
  await click(page, "我们来找找");
  await expectClip(page, "v2_find_0");
  await click(page, "找到杯子");
  await click(page, "找到餐巾");
  await expectClip(page, "ui_find_napkin");
  await expect(page.locator(".audio-notice")).toHaveCount(0);
});

test("长句完整换行展示，配音推进不替换原文或重播", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("forest-story.progress.v1", JSON.stringify({
    schemaVersion: 1, storyVersion: 1, stage: "picnic", found: ["cup", "napkin", "basket"],
    choice: "listen", stones: [0, 1, 2], seats: [null, null, null],
    decorations: [], completed: false, updatedAt: "2026-10-20T00:00:00.000Z",
  })));
  await page.reload();
  await click(page, "继续这次小冒险");
  await expectClip(page, "v2_picnic_0");
  await expect.poll(() => page.evaluate(() => window.audioPlayer?.currentTime ?? 0)).toBeGreaterThan(0);
  const count = await page.evaluate(() => window.audioLog.length);
  await page.evaluate(() => {
    const player = window.audioPlayer;
    if (player) player.currentTime = player.duration * .8;
  });
  await expect(page.locator(".caption-position")).toHaveText("1/1");
  await expect(page.locator(".current-story-line")).toContainText("再添一朵花");
  expect(await page.evaluate(() => window.audioLog.length)).toBe(count);
  await expect(page.locator(".current-story-line")).toContainText("给每位朋友留一个位置");
});

test("暂停菜单可跳到末镜或重看，恢复朗读从相应句子开始", async ({ page }) => {
  await page.goto("/");
  await click(page, "开始一起玩");
  await expectClip(page, "v2_intro_0");
  await click(page, "更多");
  await click(page, "看完整画面");
  await expectClip(page, "v2_intro_3");
  await expect(page.locator(".current-story-line")).toContainText("我们一起找找吧");
  await click(page, "更多");
  await click(page, "重看这一幕");
  await expectClip(page, "v2_intro_0");
  await expect(page.locator(".current-story-line")).toContainText("维尼和小猪刚准备好野餐");
});

test("自动朗读追加当前页文案，回看时停止跟随，回到当前句后恢复", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem("forest-story.settings.v1", JSON.stringify({
    narration: true, volume: .8, reducedMotion: true,
  })));
  await page.goto("/");
  await click(page, "开始一起玩");
  await expectClip(page, "v2_intro_0");
  await finishClip(page); await expectClip(page, "v2_intro_1");
  await finishClip(page); await expectClip(page, "v2_intro_2");
  const scroll = page.locator(".caption-scroll");
  await expect(page.locator(".caption-paragraph")).toHaveCount(3);
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await scroll.focus(); await scroll.press("Home");
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(0);
  await expect(page.getByRole("button", { name: "回到当前句", exact: true })).toBeVisible();
  await finishClip(page); await expectClip(page, "v2_intro_3");
  await expect(page.locator(".caption-paragraph")).toHaveCount(4);
  expect(await scroll.evaluate(node => node.scrollTop)).toBe(0);
  await click(page, "回到当前句");
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await click(page, "我们来找找");
  await expectClip(page, "v2_find_0");
  await expect(page.locator(".caption-paragraph")).toHaveCount(1);
  await expect(scroll).not.toContainText("我想，杯子一定没有长脚");
});
