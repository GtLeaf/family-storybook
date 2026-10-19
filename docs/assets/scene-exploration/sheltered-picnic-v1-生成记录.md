# 大树背风面的野餐草地

2026-10-19。使用内置 imagegen，transparent_background=false。

选稿状态更新（2026-10-19）：用户最初确认此版，随后指出其构图与“大树旁发现屹耳”过于接近，并要求重新设计野餐场景。此版现保留为配色参考，暂不作为野餐正式背景；新版近景俯视构图见 [sheltered-picnic-v2](sheltered-picnic-v2.png)。原角色合成图保留为历史预览。

纯背景：[sheltered-picnic-v1.png](sheltered-picnic-v1.png)，1536×1024。中性纸白、淡鼠尾草绿、灰褐树干和淡灰绿远景，减少整体黄色铺染。中央及前景预留野餐垫、互动道具和角色位置；背景未画入角色或互动物件。

本地叠图检查：[sheltered-picnic-v1-with-characters.png](sheltered-picnic-v1-with-characters.png)。仅使用原有三张透明角色等比缩放后叠加，保留原始姿态；未放入野餐垫与道具。

此版未接入游戏页面，现保留为配色参考。风格参考使用 tree-discovery-v1.png 的640像素JPEG缩略图，单张约73KB，以控制网络请求体积。

## 完整生成提示词

```text
Use case: illustration-story. Create a landscape 3:2 BACKGROUND ONLY for a quiet sheltered picnic clearing beside the same woodland tree in the reference. Use the reference for tree identity and fine irregular pencil-and-ink linework with restrained translucent watercolor, but CHANGE its yellow overall color cast.
Color direction: neutral almost-white paper (#F6F5F0), pale sage-green grass, neutral grey-brown bark, extremely dilute cool grey-green distant trees and shadows. Keep the illustration fresh, gentle and softly natural. Leave abundant genuinely neutral paper showing through. NO overall yellow wash, ochre veil, sepia aging, cream-yellow sky, golden-hour sunlight or yellow-green grass. Warm brown may appear locally in tiny bark details only. Do not make the scene dark, wintry, saturated, or strongly blue.
Composition: slightly wider view of the sheltered side of the same mature crooked tree, trunk in the left fifth, a few roots staying near the left edge, sparse partial foliage above left. Broad level pale grassy clearing in the lower center reserved for a picnic blanket to be added later; leave its entire surface simple and unobstructed. Leave comfortable open ground behind and beside this space for three friends to stand or sit later. Keep all reserved ground within the central two thirds so it survives a centered 4:3 crop. A small curving path enters from the right, connecting to the previous scene. Soft natural eye-level view with enough visible ground for interactive objects, no dramatic perspective.
A few fine bark marks and sparse grass tufts near edges; greatly simplified middle distance, distant tree silhouettes dissolving into neutral white paper. Soft diffuse daylight. No dense foliage, dense flowers, all-over texture, photographic blur or 3D rendering. No characters, animals, blanket, basket, cup, napkin, loose stones, food, furniture, labels, text, border or watermark. Opaque background.
```

## 本地叠图位置

```json
[
  {
    "role": "donkey",
    "source": "exec-ccba4044-92d1-4ddb-a56f-abdc48ed88cc.png",
    "position": [
      873,
      400
    ],
    "size": [
      474,
      300
    ]
  },
  {
    "role": "bear",
    "source": "exec-e41c29cd-d0cd-436e-ad28-bca3c703d339.png",
    "position": [
      479,
      260
    ],
    "size": [
      172,
      430
    ]
  },
  {
    "role": "pig",
    "source": "exec-f6ff41c1-7756-4988-9c28-43a549e79fd7.png",
    "position": [
      720,
      420
    ],
    "size": [
      159,
      270
    ]
  }
]
```
