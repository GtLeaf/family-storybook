# 大树旁发现屹耳：三角色本地叠图预览

2026-10-19。经用户明确要求，采用本地拼接。背景为 tree-discovery-v1.png；三角色为 asset/role 下原始透明 PNG。

输出：[tree-discovery-with-characters-v1.png](tree-discovery-with-characters-v1.png)，1536×1024。

屹耳在左侧树旁，维尼和小猪从右侧走近。屹耳和维尼水平翻转，使朋友们互相朝向；其余仅裁掉透明边缘并等比缩放，未重绘角色，未替换游戏素材。

```json
[
  {
    "role": "donkey",
    "source": "exec-ccba4044-92d1-4ddb-a56f-abdc48ed88cc.png",
    "crop": [
      114,
      116,
      1418,
      941
    ],
    "horizontal_flip": true,
    "position": [
      202,
      410
    ],
    "size": [
      537,
      340
    ]
  },
  {
    "role": "bear",
    "source": "exec-e41c29cd-d0cd-436e-ad28-bca3c703d339.png",
    "crop": [
      274,
      119,
      813,
      1470
    ],
    "horizontal_flip": true,
    "position": [
      1052,
      350
    ],
    "size": [
      176,
      440
    ]
  },
  {
    "role": "pig",
    "source": "exec-f6ff41c1-7756-4988-9c28-43a549e79fd7.png",
    "crop": [
      374,
      80,
      1011,
      1160
    ],
    "horizontal_flip": false,
    "position": [
      824,
      515
    ],
    "size": [
      162,
      275
    ]
  }
]
```
