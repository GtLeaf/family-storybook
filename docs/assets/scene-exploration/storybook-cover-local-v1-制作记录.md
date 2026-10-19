# 新版故事封面：本地拼接预览

2026-10-20 更新：本地拼接封面已随获批的脚本与分镜重制接入 Web v0.4，发布文件为 `public/art/cover.webp`。以下保留原制作过程。

2026-10-19。图片生成服务连续两次返回 moderation_blocked（HTTP 400，非413）后，用户明确选择本地拼接封面预览。此版本不是图片生成服务的成功输出。

输出：[storybook-cover-local-v1.png](storybook-cover-local-v1.png)，1536×1024。原制作时为待确认预览，现已接入首页。

使用中性配色野餐背景 sheltered-picnic-v1.png 作为底图；三角色复用 asset/role 原始透明PNG，保留站姿；野餐垫、篮子与飘起餐巾从原始风吹乱野餐背景按轮廓提取，垫子与餐巾降低黄色、转为中性灰绿纸白。少量细线表示风。上方留白，不绘制标题，以便网页单独排版。角色互动和坐姿需后续另行制作。

## 拼接布局

```json
[
  {
    "name": "blanket",
    "position": [
      462,
      702
    ],
    "size": [
      675,
      245
    ]
  },
  {
    "name": "donkey",
    "position": [
      812,
      440
    ],
    "size": [
      427,
      270
    ]
  },
  {
    "name": "bear",
    "position": [
      438,
      300
    ],
    "size": [
      164,
      410
    ]
  },
  {
    "name": "pig",
    "position": [
      665,
      455
    ],
    "size": [
      150,
      255
    ]
  },
  {
    "name": "basket",
    "position": [
      377,
      718
    ],
    "size": [
      216,
      145
    ]
  },
  {
    "name": "napkin",
    "position": [
      784,
      355
    ],
    "size": [
      181,
      110
    ]
  }
]
```
