import type { CompanionChoice, Friend, Stage } from "./story";

export type Actor = { friend: Friend; x: number; y: number; width: number; facing: "left" | "right"; motion?: "walk" | "arrive" };
export type Shot = { caption: string; camera?: "wide" | "props" | "donkey"; actors: Actor[] };
const bear = (x: number, y = 78, width = 13, facing: Actor["facing"] = "left", motion?: Actor["motion"]): Actor => ({ friend: "bear", x, y, width, facing, motion });
const pig = (x: number, y = 78, width = 11, facing: Actor["facing"] = "left", motion?: Actor["motion"]): Actor => ({ friend: "pig", x, y, width, facing, motion });
const donkey = (x = 29, y = 74, width = 36, facing: Actor["facing"] = "right", motion?: Actor["motion"]): Actor => ({ friend: "donkey", x, y, width, facing, motion });
const meeting = [donkey(), pig(61), bear(78)];
const listening = [donkey(), pig(58), bear(71)];
const staying = [donkey(33, 74, 36, "right"), pig(59, 78, 11, "right"), bear(74, 78, 13, "right")];

export function storyboard(stage: Stage, choice: CompanionChoice | null): Shot[] {
  switch (stage) {
    case "intro": return [
      { caption: "刚准备好的野餐，被风打乱了", camera: "wide", actors: [bear(39, 62, 12, "right"), pig(58, 65, 11)] },
      { caption: "杯子滚远了，餐巾也飘了起来", camera: "props", actors: [bear(39, 62, 12, "right"), pig(58, 65, 11)] },
      { caption: "一起去把小东西找回来", camera: "wide", actors: [bear(39, 62, 12, "right"), pig(58, 65, 11, "right")] },
    ];
    case "find": case "wind-talk": return [{ caption: "风留下了哪些小线索？", actors: [bear(47, 77, 11, "right"), pig(62, 72, 10)] }];
    case "walk": return [
      { caption: "大树旁，还有一位朋友", actors: [bear(39, 92, 14, "right"), pig(58, 92, 12)] },
      { caption: "沿着小路，去找屹耳", actors: [bear(55, 76, 11, "right", "walk"), pig(70, 75, 9, "right", "walk")] },
    ];
    case "worry": return [
      { caption: "屹耳在树旁，两位朋友轻轻走近", actors: [donkey(), pig(61, 78, 11, "left", "arrive"), bear(78, 78, 13, "left", "arrive")] },
      { caption: "先停下来，听听他的担心", camera: "donkey", actors: meeting },
    ];
    case "choice": return [{ caption: "陪伴，可以有不同的样子", actors: meeting }];
    case "response": return choice === "stay" ? [
      { caption: "不急着说话，安静地陪在旁边", actors: staying.map(actor => actor.friend === "donkey" ? actor : { ...actor, motion: "arrive" }) },
      { caption: "等一等，也是一种陪伴", actors: staying },
    ] : [
      { caption: "靠近一点，认真听他说", actors: listening.map(actor => actor.friend === "bear" ? { ...actor, motion: "arrive" } : actor) },
      { caption: "听见担心，再一起想办法", camera: "donkey", actors: listening },
    ];
    case "companion-talk": return [{ caption: "这一刻，留给你们的声音", actors: choice === "stay" ? staying : listening }];
    case "stones": return [
      { caption: "绕到大树背风的一面", actors: [bear(29, 34, 9, "right"), pig(47, 33, 8, "right"), donkey(70, 31, 24, "left")] },
      { caption: "让每一个垫角，都稳稳地待着", actors: [] },
    ];
    case "ending": return [
      { caption: "风又来了，垫子稳稳地留在原地", actors: [] },
      { caption: "朋友在旁边，这里挺好的", actors: [] },
    ];
    default: return [{ caption: "每位朋友，都有自己的位置", actors: [] }];
  }
}
