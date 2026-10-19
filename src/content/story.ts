export const STAGE_IDS = [
  "intro",
  "find",
  "wind-talk",
  "walk",
  "worry",
  "choice",
  "response",
  "companion-talk",
  "stones",
  "picnic",
  "ending",
  "diary",
] as const;
export type Stage = (typeof STAGE_IDS)[number];
export type Art = "cover" | "wind" | "search" | "path" | "discovery" | "picnic";
export type CompanionChoice = "listen" | "stay";
export const ITEMS = ["cup", "napkin", "basket"] as const;
export type Item = (typeof ITEMS)[number];
export const FRIENDS = ["bear", "pig", "donkey"] as const;
export type Friend = (typeof FRIENDS)[number];
export const FRIEND_NAMES: Record<Friend, string> = {
  bear: "维尼",
  pig: "小猪",
  donkey: "屹耳",
};
export const ITEM_NAMES: Record<Item, string> = {
  cup: "杯子",
  napkin: "餐巾",
  basket: "篮子",
};
export type Line = { speaker: string; text: string; shot: number };
export type Scene = {
  node: string;
  chapter: number;
  location: string;
  title: string;
  art: Art;
  lines: Line[];
  next: string;
  instruction?: string;
};

export const STORY: Record<Stage, Scene> = {
  "intro": {
    "node": "S01",
    "chapter": 1,
    "location": "林边草地",
    "title": "咦，风也来野餐了",
    "art": "wind",
    "lines": [
      {
        "speaker": "故事开始了",
        "text": "维尼和小猪刚准备好野餐，一阵风就赶来了。",
        "shot": 0
      },
      {
        "speaker": "风来过了",
        "text": "餐巾飘远了，杯子滚到了路边，篮子也倒在草丛旁。",
        "shot": 1
      },
      {
        "speaker": "维尼",
        "text": "我想，杯子一定没有长脚。至少，刚才还没有。",
        "shot": 2
      },
      {
        "speaker": "小猪",
        "text": "我们一起找找吧。",
        "shot": 2
      }
    ],
    "next": "我们来找找"
  },
  "find": {
    "node": "S02",
    "chapter": 1,
    "location": "林边小路",
    "title": "小东西，藏在哪里？",
    "art": "search",
    "lines": [
      {
        "speaker": "小猪",
        "text": "杯子、餐巾，还有篮子。看看草丛和树根旁，点一点，把它们找回来吧。",
        "shot": 0
      }
    ],
    "next": "都找到了",
    "instruction": "找一找，点一点露出来的小东西"
  },
  "wind-talk": {
    "node": "S02-A",
    "chapter": 1,
    "location": "一起聊一句",
    "title": "你从哪里看出风来过？",
    "art": "search",
    "lines": [
      {
        "speaker": "留一点时间给彼此",
        "text": "东西找回来了。再看看周围，你从哪里看出风来过？是歪向一边的小草，还是晃动的叶子？",
        "shot": 0
      }
    ],
    "next": "去找屹耳"
  },
  "walk": {
    "node": "S03",
    "chapter": 2,
    "location": "通往大树的小路",
    "title": "还有一个朋友的位置",
    "art": "path",
    "lines": [
      {
        "speaker": "小猪",
        "text": "屹耳也许想和我们一起。",
        "shot": 0
      },
      {
        "speaker": "维尼",
        "text": "好主意。我们给他留个位置。",
        "shot": 0
      },
      {
        "speaker": "轻轻往前走",
        "text": "他们收好用品，沿着小路去找屹耳。风小了一点。",
        "shot": 1
      }
    ],
    "next": "去大树旁"
  },
  "worry": {
    "node": "S04",
    "chapter": 2,
    "location": "大树旁",
    "title": "屹耳有一点点担心",
    "art": "discovery",
    "lines": [
      {
        "speaker": "小猪",
        "text": "屹耳，要和我们一起野餐吗？",
        "shot": 0
      },
      {
        "speaker": "屹耳",
        "text": "谢谢。我只是想，风也许还会回来。到时候，垫子会飞，杯子会倒。",
        "shot": 1
      },
      {
        "speaker": "维尼",
        "text": "嗯。那我们先不着急。",
        "shot": 1
      }
    ],
    "next": "我们可以怎样陪他"
  },
  "choice": {
    "node": "S05",
    "chapter": 2,
    "location": "大树旁",
    "title": "陪伴，可以有不同的样子",
    "art": "discovery",
    "lines": [
      {
        "speaker": "轮到你来决定",
        "text": "我们可以先听他说说，也可以安静地陪他待一会儿。你想试哪一种？",
        "shot": 0
      }
    ],
    "next": "就这样陪他"
  },
  "response": {
    "node": "S05-R",
    "chapter": 2,
    "location": "大树旁",
    "title": "有朋友在，就很好",
    "art": "discovery",
    "lines": [],
    "next": "留一点时间聊聊"
  },
  "companion-talk": {
    "node": "S05-A",
    "chapter": 2,
    "location": "一起聊一句",
    "title": "你想怎样被陪伴？",
    "art": "discovery",
    "lines": [
      {
        "speaker": "家长也可以先说说",
        "text": "如果是你，希望有人听一听，还是安静地陪一会儿？也可以有别的办法。不知道也没关系。",
        "shot": 0
      }
    ],
    "next": "一起想办法"
  },
  "stones": {
    "node": "S06",
    "chapter": 2,
    "location": "背风的大树旁",
    "title": "让垫子稳稳地待着",
    "art": "picnic",
    "lines": [
      {
        "speaker": "绕到大树背风的一面",
        "text": "他们绕到大树背风的一面，重新铺好垫子。",
        "shot": 0
      },
      {
        "speaker": "小猪",
        "text": "篮子压住了一角。再用三块石头，把另外三个角也固定好。",
        "shot": 1
      }
    ],
    "next": "摆好我们的野餐",
    "instruction": "点一下垫角，放上一块小石头"
  },
  "picnic": {
    "node": "S07",
    "chapter": 3,
    "location": "背风草地",
    "title": "这里，给你留了个位置",
    "art": "picnic",
    "lines": [
      {
        "speaker": "一起布置吧",
        "text": "给每位朋友留一个位置。你摆一份，也可以请家长摆一份。再添一朵花、一片叶子，就是你们的小小野餐。",
        "shot": 0
      }
    ],
    "next": "开餐吧",
    "instruction": "点一个座位，把餐具放在那里"
  },
  "ending": {
    "node": "S08",
    "chapter": 3,
    "location": "我们的野餐",
    "title": "朋友在旁边，这里挺好的",
    "art": "picnic",
    "lines": [
      {
        "speaker": "小猪",
        "text": "风又来了。看，垫子没有跑！",
        "shot": 0
      },
      {
        "speaker": "屹耳",
        "text": "风还在。不过，这里挺好的。",
        "shot": 1
      },
      {
        "speaker": "维尼",
        "text": "嗯。朋友在旁边，东西也不用追了。",
        "shot": 1
      },
      {
        "speaker": "故事的最后",
        "text": "这一天没有完全照计划发生。不过，他们还是一起开始了野餐。",
        "shot": 1
      }
    ],
    "next": "把今天记下来"
  },
  "diary": {
    "node": "S09",
    "chapter": 3,
    "location": "我的冒险日记",
    "title": "我们的小小野餐",
    "art": "picnic",
    "lines": [
      {
        "speaker": "一起完成的一天",
        "text": "今天，我们找回了野餐用品，也让垫子稳稳地留在原地。每位朋友，都有了自己的位置。",
        "shot": 0
      }
    ],
    "next": "回到书架"
  }
};

export const RESPONSES: Record<CompanionChoice, Line[]> = {
  "listen": [
    {
      "speaker": "维尼",
      "text": "你愿意告诉我们，最担心什么吗？",
      "shot": 0
    },
    {
      "speaker": "屹耳",
      "text": "我不想刚铺好垫子，就又得追着它跑。",
      "shot": 1
    },
    {
      "speaker": "小猪",
      "text": "那我们想想，怎么让垫子待在原地。",
      "shot": 1
    }
  ],
  "stay": [
    {
      "speaker": "安静地待一会儿",
      "text": "他们留在屹耳旁边。没有谁急着说下一句话。",
      "shot": 0
    },
    {
      "speaker": "屹耳",
      "text": "谢谢你们等我。也许，我们可以先把垫子压住。",
      "shot": 1
    }
  ]
};

export const CHOICE_TEXT: Record<CompanionChoice, { title: string; description: string }> = {
  "listen": {
    "title": "先听他说说",
    "description": "“你愿意告诉我们，最担心什么吗？”"
  },
  "stay": {
    "title": "在旁边陪一会儿",
    "description": "“不用着急，我们就在这里。”"
  }
};
