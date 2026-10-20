import type { StoragePort } from "../lib/progress";

type Launch = { miniToolEnv?: { buildVersion?: number | string } };
type MiniTool = {
  getLaunchOptions?: () => Promise<Launch>;
  getStorage?: (options: { key: string }) => Promise<{ data: string | null }>;
  setStorage?: (options: { key: string; data: string }) => Promise<unknown>;
  removeStorage?: (options: { key: string }) => Promise<unknown>;
};
type Host = { launchOptions?: Launch; miniTool?: MiniTool };
const keys = ["forest-story.settings.v1", "forest-story.progress.v1", "forest-story.progress.v1.backup"];
const cache = new Map<string, string>();
let platform: MiniTool | undefined;
let readable = true;
let queue = Promise.resolve();
export let storageWarning = "";
function warn() {
  storageWarning = "这次记录暂时无法保存。故事可以继续，关闭页面后可能需要重新开始。";
  window.dispatchEvent(new Event("forest-storage-error"));
}
function enqueue(write: () => Promise<unknown>) {
  queue = queue.then(write).then(() => undefined).catch(warn);
}
export const xhsStorage: StoragePort = {
  getItem(key) {
    if (!readable) throw new Error("记录读取失败");
    return platform ? cache.get(key) ?? null : window.localStorage.getItem(key);
  },
  setItem(key, data) {
    if (!readable) throw new Error("记录读取失败，保留原记录");
    if (!platform) return window.localStorage.setItem(key, data);
    cache.set(key, data);
    enqueue(() => platform!.setStorage!({ key, data }));
  },
  removeItem(key) {
    if (!readable) throw new Error("记录读取失败，保留原记录");
    if (!platform) return window.localStorage.removeItem(key);
    cache.delete(key);
    enqueue(() => platform!.removeStorage!({ key }));
  },
};
export async function initializeStorage(host: Host | undefined = (window as Window & { xhs?: Host }).xhs) {
  const miniTool = host?.miniTool;
  let build = Number(host?.launchOptions?.miniToolEnv?.buildVersion) || 0;
  if (!build && typeof miniTool?.getLaunchOptions === "function") {
    try { build = Number((await miniTool.getLaunchOptions()).miniToolEnv?.buildVersion) || 0; } catch { /* 未满足版本条件时使用受保护的浏览器存储。 */ }
  }
  if (Math.floor(build / 1000) < 9460 || typeof miniTool?.getStorage !== "function" ||
    typeof miniTool.setStorage !== "function" || typeof miniTool.removeStorage !== "function") return;
  platform = miniTool;
  try {
    // 先读取全部平台记录；读取失败时禁止写入，避免用空进度覆盖原记录。
    const values = await Promise.all(keys.map(key => miniTool.getStorage!({ key })));
    for (let i = 0; i < keys.length; i++) {
      const data = values[i].data;
      if (typeof data === "string") cache.set(keys[i], data);
    }
    for (const key of keys) {
      if (cache.has(key)) continue;
      let old: string | null = null;
      try { old = window.localStorage.getItem(key); } catch { /* 迁移来源可能不可用。 */ }
      if (old !== null) {
        await miniTool.setStorage!({ key, data: old });
        cache.set(key, old);
      }
    }
  } catch { readable = false; warn(); }
}
// 用于验证队列顺序及异步保存失败，不表示记录永久保存。
export async function flushStorage() { await queue; }
