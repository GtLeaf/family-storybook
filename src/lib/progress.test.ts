import { describe, expect, it } from "vitest";
import { STAGE_IDS } from "../content/story";
import {
  canAdvance,
  clearProgress,
  loadProgress,
  newProgress,
  parseProgress,
  reduceProgress,
  saveProgress,
  SAVE_KEY,
  type Action,
  type Progress,
  type StoragePort,
} from "./progress";

const next = (p: Progress) =>
  reduceProgress(p, { type: "NEXT", from: p.stage });
function choiceState() {
  let p = next(newProgress());
  for (const item of ["napkin", "basket", "cup"] as const)
    p = reduceProgress(p, { type: "COLLECT", item });
  for (let i = 0; i < 4; i++) p = next(p);
  return p;
}
function picnicState() {
  let p = reduceProgress(choiceState(), { type: "CHOOSE", choice: "listen" });
  p = next(next(p));
  for (const slot of [2, 0, 1]) p = reduceProgress(p, { type: "STONE", slot });
  return next(p);
}
function complete() {
  let p = picnicState();
  for (const [slot, friend] of (["bear", "pig", "donkey"] as const).entries())
    p = reduceProgress(p, { type: "SEAT", friend, slot });
  return next(next(p));
}
function memoryStorage(): StoragePort {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("故事规则和恢复边界", () => {
  it("没有集齐不能越过寻找，同一物品只能收一次", () => {
    const p = next(newProgress());
    expect(canAdvance(p)).toBe(false);
    expect(next(p)).toBe(p);
    const collected = reduceProgress(p, { type: "COLLECT", item: "cup" });
    expect(
      reduceProgress(collected, { type: "COLLECT", item: "cup" }).found,
    ).toEqual(["cup"]);
  });
  it("过期页面的下一步事件不能跳过新页面", () => {
    const action: Action = { type: "NEXT", from: "intro" };
    const p = reduceProgress(newProgress(), action);
    expect(reduceProgress(p, action)).toBe(p);
  });
  it("第一页不越界，过期返回事件不会连续倒退", () => {
    const intro = newProgress();
    expect(reduceProgress(intro, { type: "PREVIOUS", from: "intro" })).toBe(intro);
    const action: Action = { type: "PREVIOUS", from: "choice" };
    const p = reduceProgress(choiceState(), action);
    expect(p.stage).toBe("worry");
    expect(reduceProgress(p, action)).toBe(p);
  });
  it("返回保留部分收集，重新进入仍需完成任务才能前进", () => {
    const collected = reduceProgress(next(newProgress()), {
      type: "COLLECT", item: "cup",
    });
    const p = next(reduceProgress(collected, { type: "PREVIOUS", from: "find" }));
    expect(p.stage).toBe("find");
    expect(p.found).toEqual(["cup"]);
    expect(next(p)).toBe(p);
  });
  it("完成后逐页回看均可存取，重选分支保留任务和完成记录", () => {
    const storage = memoryStorage();
    const finished = complete();
    let p = finished;
    for (const stage of [...STAGE_IDS].reverse()) {
      expect(p.stage).toBe(stage);
      expect(p).toMatchObject({
        completed: true, found: finished.found, stones: finished.stones,
        seats: finished.seats, decorations: finished.decorations,
      });
      expect(saveProgress(storage, p)).toBe(true);
      expect(loadProgress(storage)).toEqual({ status: "ok", progress: p });
      if (stage === "choice") {
        expect(p.choice).toBe("listen");
        const changed = reduceProgress(p, { type: "CHOOSE", choice: "stay" });
        expect(changed).toMatchObject({ stage: "response", choice: "stay", completed: true });
        expect(changed.seats).toEqual(finished.seats);
        expect(saveProgress(storage, changed)).toBe(true);
      }
      p = reduceProgress(p, { type: "PREVIOUS", from: p.stage });
    }
  });
  it("回看阶段的完成存档仍拒绝缺失的任务成果", () => {
    for (const missing of [
      { found: [] }, { choice: null }, { stones: [] }, { seats: [null, null, null] },
    ]) {
      expect(parseProgress(JSON.stringify({
        ...complete(), stage: "intro", ...missing,
      }))).toBeNull();
    }
  });
  it.each(["listen", "stay"] as const)(
    "陪伴分支 %s 都能走到固定垫子，不能重复确认另一分支",
    (choice) => {
      let p = reduceProgress(choiceState(), { type: "CHOOSE", choice });
      expect(p.stage).toBe("response");
      expect(
        reduceProgress(p, {
          type: "CHOOSE",
          choice: choice === "listen" ? "stay" : "listen",
        }),
      ).toBe(p);
      p = next(next(p));
      expect(p.stage).toBe("stones");
      expect(p.choice).toBe(choice);
    },
  );
  it("餐具不能覆盖已有朋友，交换不会重复或丢失", () => {
    let p = picnicState();
    p = reduceProgress(p, { type: "SEAT", friend: "bear", slot: 0 });
    expect(reduceProgress(p, { type: "SEAT", friend: "pig", slot: 0 })).toBe(p);
    p = reduceProgress(p, { type: "SEAT", friend: "pig", slot: 1 });
    p = reduceProgress(p, { type: "SEAT", friend: "bear", slot: 1 });
    expect(p.seats).toEqual(["pig", "bear", null]);
    expect(canAdvance(p)).toBe(false);
    expect(reduceProgress(p, { type: "SEAT", friend: "donkey", slot: 9 })).toBe(
      p,
    );
  });
  it("装饰可取消，不影响完成；日记与重摆保留实际布局", () => {
    let p = complete();
    expect(p.stage).toBe("diary");
    expect(p.completed).toBe(true);
    p = reduceProgress(p, { type: "REARRANGE" });
    expect(p.seats).toEqual(["bear", "pig", "donkey"]);
    p = reduceProgress(p, { type: "DECORATE", item: "flower" });
    expect(p.decorations).toEqual(["flower"]);
    p = reduceProgress(p, { type: "DECORATE", item: "flower" });
    expect(p.decorations).toEqual([]);
    expect(canAdvance(p)).toBe(true);
  });
  it("无效坐标和跨阶段交互不改变状态", () => {
    const p = newProgress();
    expect(reduceProgress(p, { type: "STONE", slot: 0 })).toBe(p);
    expect(reduceProgress(p, { type: "COLLECT", item: "basket" })).toBe(p);
    expect(reduceProgress(p, { type: "REARRANGE" })).toBe(p);
    expect(reduceProgress(p, { type: "DIARY" })).toBe(p);
  });
  it("损坏 JSON、未知版本、重复物品及不完整前置条件被拒绝", () => {
    expect(parseProgress("{broken")).toBeNull();
    expect(
      parseProgress(JSON.stringify({ ...newProgress(), schemaVersion: 99 })),
    ).toBeNull();
    expect(
      parseProgress(
        JSON.stringify({ ...newProgress(), stage: "diary", completed: true }),
      ),
    ).toBeNull();
    expect(
      parseProgress(
        JSON.stringify({ ...complete(), found: ["cup", "cup", "basket"] }),
      ),
    ).toBeNull();
    expect(
      parseProgress(
        JSON.stringify({ ...complete(), seats: ["bear", "bear", "pig"] }),
      ),
    ).toBeNull();
  });
  it("损坏主存档可恢复备份，无可用备份时保留原记录", () => {
    const storage = memoryStorage();
    saveProgress(storage, newProgress());
    saveProgress(storage, next(newProgress()));
    storage.setItem(SAVE_KEY, "broken");
    expect(loadProgress(storage).status).toBe("recovered");
    storage.removeItem(`${SAVE_KEY}.backup`);
    expect(loadProgress(storage).status).toBe("invalid");
    expect(storage.getItem(SAVE_KEY)).toBe("broken");
  });
  it("完整布局序列化后保持一致，清除同时删除备份", () => {
    const storage = memoryStorage();
    saveProgress(storage, picnicState());
    const p = complete();
    expect(saveProgress(storage, p)).toBe(true);
    expect(loadProgress(storage)).toEqual({ status: "ok", progress: p });
    expect(clearProgress(storage)).toBe(true);
    expect(storage.getItem(`${SAVE_KEY}.backup`)).toBeNull();
    expect(loadProgress(storage).status).toBe("empty");
  });
  it("存储拒绝访问时返回可处理的错误", () => {
    const fail = () => {
      throw new Error("storage unavailable");
    };
    const storage: StoragePort = {
      getItem: fail,
      setItem: fail,
      removeItem: fail,
    };
    expect(loadProgress(storage).status).toBe("unavailable");
    expect(saveProgress(storage, newProgress())).toBe(false);
    expect(clearProgress(storage)).toBe(false);
  });
});
