import { z } from "zod";
import {
  FRIENDS,
  ITEMS,
  STAGE_IDS,
  type CompanionChoice,
  type Friend,
  type Item,
  type Stage,
} from "../content/story";

export const SAVE_KEY = "forest-story.progress.v1";
const friendSchema = z.enum(FRIENDS);
const stagePosition = (stage: Stage) => STAGE_IDS.indexOf(stage);
const progressSchema = z
  .object({
    schemaVersion: z.literal(1),
    storyVersion: z.literal(1),
    stage: z.enum(STAGE_IDS),
    found: z.array(z.enum(ITEMS)).max(3),
    choice: z.enum(["listen", "stay"]).nullable(),
    stones: z.array(z.number().int().min(0).max(2)).max(3),
    seats: z.tuple([
      friendSchema.nullable(),
      friendSchema.nullable(),
      friendSchema.nullable(),
    ]),
    decorations: z.array(z.enum(["flower", "leaf"])).max(2),
    completed: z.boolean(),
    updatedAt: z.string(),
  })
  .superRefine((p, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (
      new Set(p.found).size !== p.found.length ||
      new Set(p.stones).size !== p.stones.length ||
      new Set(p.decorations).size !== p.decorations.length
    )
      fail("重复物品");
    const seated = p.seats.filter((f) => f !== null);
    if (new Set(seated).size !== seated.length) fail("座位中角色重复");
    if (
      stagePosition(p.stage) >= stagePosition("wind-talk") &&
      p.found.length !== 3
    )
      fail("前置收集未完成");
    if (
      stagePosition(p.stage) >= stagePosition("response") &&
      p.choice === null
    )
      fail("前置对话未完成");
    if (
      stagePosition(p.stage) >= stagePosition("picnic") &&
      p.stones.length !== 3
    )
      fail("前置石头未完成");
    if (
      (stagePosition(p.stage) >= stagePosition("ending") || p.completed) &&
      seated.length !== 3
    )
      fail("前置摆放未完成");
    if (p.stage === "diary" && !p.completed) fail("日记未完成");
    // 完成后仍可回看任意页面，但完成记录必须保有所有任务成果。
    if (
      p.completed &&
      (p.found.length !== 3 || p.choice === null || p.stones.length !== 3)
    )
      fail("完成记录缺少任务成果");
  });
export type Progress = z.infer<typeof progressSchema>;
export type Decoration = Progress["decorations"][number];
export const newProgress = (): Progress => ({
  schemaVersion: 1,
  storyVersion: 1,
  stage: "intro",
  found: [],
  choice: null,
  stones: [],
  seats: [null, null, null],
  decorations: [],
  completed: false,
  updatedAt: new Date().toISOString(),
});

export type Action =
  | { type: "NEXT"; from: Stage }
  | { type: "PREVIOUS"; from: Stage }
  | { type: "COLLECT"; item: Item }
  | { type: "CHOOSE"; choice: CompanionChoice }
  | { type: "STONE"; slot: number }
  | { type: "SEAT"; friend: Friend; slot: number }
  | { type: "DECORATE"; item: Decoration }
  | { type: "REARRANGE" }
  | { type: "DIARY" };

export function canAdvance(p: Progress): boolean {
  if (p.stage === "find") return p.found.length === 3;
  if (p.stage === "stones") return p.stones.length === 3;
  if (p.stage === "picnic") return p.seats.every(Boolean);
  return !["choice", "diary"].includes(p.stage);
}

export function reduceProgress(p: Progress, action: Action): Progress {
  let next = p;
  switch (action.type) {
    case "PREVIOUS": {
      if (action.from !== p.stage) return p;
      const stage = STAGE_IDS[stagePosition(p.stage) - 1];
      if (!stage) return p;
      next = { ...p, stage };
      break;
    }
    case "NEXT": {
      if (action.from !== p.stage || !canAdvance(p)) return p;
      const stage = STAGE_IDS[stagePosition(p.stage) + 1];
      if (!stage) return p;
      next = { ...p, stage, completed: p.completed || stage === "diary" };
      break;
    }
    case "COLLECT":
      if (p.stage !== "find" || p.found.includes(action.item)) return p;
      next = { ...p, found: [...p.found, action.item] };
      break;
    case "CHOOSE":
      if (p.stage !== "choice") return p;
      next = { ...p, choice: action.choice, stage: "response" };
      break;
    case "STONE":
      if (
        p.stage !== "stones" ||
        ![0, 1, 2].includes(action.slot) ||
        p.stones.includes(action.slot)
      )
        return p;
      next = { ...p, stones: [...p.stones, action.slot] };
      break;
    case "SEAT": {
      if (p.stage !== "picnic" || ![0, 1, 2].includes(action.slot)) return p;
      const seats: Progress["seats"] = [...p.seats];
      const oldSlot = seats.indexOf(action.friend);
      const occupant = seats[action.slot];
      // 未摆过的餐具不能覆盖已有餐具；已摆过的餐具可以交换座位。
      if (oldSlot === -1 && occupant !== null) return p;
      if (oldSlot !== -1) seats[oldSlot] = occupant;
      seats[action.slot] = action.friend;
      next = { ...p, seats };
      break;
    }
    case "DECORATE":
      if (p.stage !== "picnic") return p;
      next = {
        ...p,
        decorations: p.decorations.includes(action.item)
          ? p.decorations.filter((d) => d !== action.item)
          : [...p.decorations, action.item],
      };
      break;
    case "REARRANGE":
      if (!p.completed) return p;
      next = { ...p, stage: "picnic" };
      break;
    case "DIARY":
      if (!p.completed) return p;
      next = { ...p, stage: "diary" };
      break;
  }
  return { ...next, updatedAt: new Date().toISOString() };
}

export type SaveResult =
  | { status: "empty" | "unavailable" | "invalid"; progress: null }
  | { status: "ok" | "recovered"; progress: Progress };
export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function parseProgress(raw: string): Progress | null {
  try {
    const parsed = progressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function loadProgress(storage: StoragePort): SaveResult {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { status: "empty", progress: null };
    const progress = parseProgress(raw);
    if (progress) return { status: "ok", progress };
    const backup = storage.getItem(`${SAVE_KEY}.backup`);
    const recovered = backup ? parseProgress(backup) : null;
    return recovered
      ? { status: "recovered", progress: recovered }
      : { status: "invalid", progress: null };
  } catch {
    return { status: "unavailable", progress: null };
  }
}
export function saveProgress(storage: StoragePort, p: Progress): boolean {
  try {
    if (!progressSchema.safeParse(p).success) return false;
    const old = storage.getItem(SAVE_KEY);
    if (old && parseProgress(old)) storage.setItem(`${SAVE_KEY}.backup`, old);
    storage.setItem(SAVE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export function clearProgress(storage: StoragePort): boolean {
  try {
    storage.removeItem(SAVE_KEY);
    storage.removeItem(`${SAVE_KEY}.backup`);
    return true;
  } catch {
    return false;
  }
}
