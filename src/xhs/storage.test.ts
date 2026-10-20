import { afterEach, beforeEach, expect, test, vi } from "vitest";
const SETTINGS = "forest-story.settings.v1";
const SAVE = "forest-story.progress.v1";
const store = new Map<string, string>();
const dispatchEvent = vi.fn();
const browser = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, data: string) => { store.set(key, data); }),
  removeItem: vi.fn((key: string) => { store.delete(key); }),
};
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); store.clear();
  vi.stubGlobal("window", { localStorage: browser, dispatchEvent });
});
afterEach(() => vi.unstubAllGlobals());
function host(version = 9490001, data = new Map<string, string>()) {
  return {
    launchOptions: { miniToolEnv: { buildVersion: version } },
    miniTool: {
      getStorage: vi.fn(async ({ key }: { key: string }) => ({ data: data.get(key) ?? null })),
      setStorage: vi.fn(async ({ key, data: value }: { key: string; data: string }) => { data.set(key, value); }),
      removeStorage: vi.fn(async ({ key }: { key: string }) => { data.delete(key); }),
    },
  };
}
test("支持的平台优先读取远端，保存按顺序执行且不写浏览器", async () => {
  const remote = new Map([[SAVE, "旧记录"]]); const h = host(9460001, remote);
  const s = await import("./storage"); await s.initializeStorage(h);
  expect(s.xhsStorage.getItem(SAVE)).toBe("旧记录");
  s.xhsStorage.setItem(SAVE, "第一笔"); s.xhsStorage.setItem(SAVE, "第二笔");
  await s.flushStorage(); expect(remote.get(SAVE)).toBe("第二笔"); expect(browser.setItem).not.toHaveBeenCalled();
});
test("平台空记录从浏览器迁移，已有平台记录不被覆盖", async () => {
  store.set(SAVE, "浏览器进度"); store.set(SETTINGS, "浏览器设置");
  const remote = new Map([[SAVE, "平台进度"]]); const h = host(9490001, remote);
  const s = await import("./storage"); await s.initializeStorage(h);
  expect(s.xhsStorage.getItem(SAVE)).toBe("平台进度"); expect(remote.get(SETTINGS)).toBe("浏览器设置");
});
test("异步写入失败发出提示，不能静默改用浏览器", async () => {
  const h = host(); h.miniTool.setStorage.mockRejectedValue(new Error("空间不足"));
  const s = await import("./storage"); await s.initializeStorage(h);
  s.xhsStorage.setItem(SAVE, "新记录"); await s.flushStorage();
  expect(s.storageWarning).toContain("无法保存"); expect(dispatchEvent).toHaveBeenCalled(); expect(browser.setItem).not.toHaveBeenCalled();
});
test("平台读取失败禁止后续覆盖及删除", async () => {
  const h = host(); h.miniTool.getStorage.mockRejectedValue(new Error("读取失败"));
  const s = await import("./storage"); await s.initializeStorage(h);
  expect(() => s.xhsStorage.getItem(SAVE)).toThrow();
  expect(() => s.xhsStorage.setItem(SAVE, "空进度")).toThrow();
  expect(() => s.xhsStorage.removeItem(SAVE)).toThrow(); expect(h.miniTool.setStorage).not.toHaveBeenCalled();
});
test("清除只删除业务指定的键", async () => {
  const remote = new Map([[SAVE, "进度"], [SETTINGS, "设置"], ["other", "其他记录"]]); const h = host(9490001, remote);
  const s = await import("./storage"); await s.initializeStorage(h);
  s.xhsStorage.removeItem(SAVE); await s.flushStorage();
  expect(remote.has(SAVE)).toBe(false); expect(remote.get(SETTINGS)).toBe("设置"); expect(remote.get("other")).toBe("其他记录");
});
test("客户端版本不足或未知使用可失败的浏览器后备", async () => {
  const h = host(9459001); const s = await import("./storage"); await s.initializeStorage(h);
  s.xhsStorage.setItem(SAVE, "进度"); expect(store.get(SAVE)).toBe("进度"); expect(h.miniTool.getStorage).not.toHaveBeenCalled();
  browser.setItem.mockImplementationOnce(() => { throw new Error("禁止存储"); });
  expect(() => s.xhsStorage.setItem(SAVE, "下一笔")).toThrow();
});
test("同步版本缺失时读取异步启动参数", async () => {
  const h = { miniTool: { ...host().miniTool, getLaunchOptions: vi.fn(async () => ({ miniToolEnv: { buildVersion: 9490001 } })) } };
  const s = await import("./storage"); await s.initializeStorage(h);
  expect(h.miniTool.getLaunchOptions).toHaveBeenCalled(); expect(h.miniTool.getStorage).toHaveBeenCalledTimes(3);
});
