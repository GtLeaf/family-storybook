# 《风吹走的野餐》语音交付清单 v1.0

> 生成日期：2026-10-19 ｜ 内容基准：TTS_TASK.md 最新版
> 统一规格：WAV 母版，**48kHz / 单声道 / 16bit PCM**，已做 EBU R128 响度归一化（-23 LUFS / TP -1.5）
> 同目录附 `.mp3` 试听版。四角色固定音色（旁白·维尼·小猪·屹耳），干净人声，无背景音乐/音效。

## 必做 29 段（13 主音频 + 16 交互）

| 任务 | 内容 | 音色 | 时长 | 状态 |
|---|---|---|---|---|
| P01 | intro | 旁白·维尼·小猪 | 18.74s | ✅ |
| P02 | find | 旁白·小猪 | 10.34s | ✅ |
| P03 | wind-talk | 旁白 | 10.22s | ✅ |
| P04 | walk | 旁白·小猪·维尼 | 15.74s | ✅ |
| P05 | worry | 旁白·小猪·屹耳·维尼 | 17.52s | ✅ |
| P06 | choice | 旁白 | 11.83s | ✅ |
| P07A | response/listen | 旁白·维尼·屹耳·小猪 | 13.87s | ✅ |
| P07B | response/stay | 旁白·屹耳 | 16.63s | ✅ |
| P08 | companion-talk | 旁白 | 12.41s | ✅ |
| P09 | stones | 旁白·小猪 | 9.91s | ✅ |
| P10 | picnic | 旁白 | 14.42s | ✅ |
| P11 | ending | 旁白·小猪·屹耳·维尼 | 21.41s | ✅ |
| P12 | diary | 旁白 | 11.42s | ✅ |
| U01 | find_cup | 小猪 | 2.30s | ✅ |
| U02 | find_napkin | 维尼 | 2.74s | ✅ |
| U03 | find_basket | 小猪 | 3.12s | ✅ |
| U04 | find_hint | 旁白 | 3.31s | ✅ |
| U05 | choice_listen | 旁白 | 4.54s | ✅ |
| U06 | choice_stay | 旁白 | 5.83s | ✅ |
| U07 | stone_placed | 旁白 | 2.54s | ✅ |
| U08 | seat_select_bear | 旁白 | 3.53s | ✅ |
| U09 | seat_select_pig | 旁白 | 3.31s | ✅ |
| U10 | seat_select_donkey | 旁白 | 4.03s | ✅ |
| U11 | seat_placed_bear | 旁白 | 2.04s | ✅ |
| U12 | seat_placed_pig | 旁白 | 2.30s | ✅ |
| U13 | seat_placed_donkey | 旁白 | 2.30s | ✅ |
| U14 | decoration_added | 旁白 | 3.12s | ✅ |
| U15 | decoration_removed | 旁白 | 2.04s | ✅ |
| U16 | voice_preview | 旁白 | 7.44s | ✅ |

## 可选补充 2 段

| 任务 | 内容 | 音色 | 时长 | 状态 |
|---|---|---|---|---|
| O01 | stones_complete | 屹耳 | 3.31s | ✅ |
| O02 | offline_invitation | 旁白 | 9.53s | ✅ |

## 汇总
- **合计 31 段**：13 主音频 + 16 交互 + 2 可选，全部 ✅
- 目录：`audio/tts/v1/`，每个任务 1 份 `.wav` 母版 + 1 份 `.mp3` 试听
- 多角色整页为按角色分音色合成后自然拼接的连贯成品，角色前缀未读出

## 屹耳音量校准（2026-10-19）

网页使用的 MP3 中，屹耳明显低于其他角色；与同名 WAV 的响度也不一致。本次分别测量两个格式，仅提高屹耳台词，采用 20ms 增益渐变，保留原声道、语速和时长。

| MP3 文件 | 屹耳台词范围 | 增益 | 调整后响度 |
|---|---|---|---|
| page_05_worry | 5.93—15.35s | +11.10 dB | -23.43 LUFS |
| page_07a_response_listen | 7.05—11.05s | +12.81 dB | -23.24 LUFS |
| page_07b_response_stay | 11.15—16.632s | +12.99 dB | -23.27 LUFS |
| page_11_ending | 5.95—7.50s | +18.51 dB | -23.38 LUFS |
| optional_stones_complete | 整段 | +11.87 dB | -23.27 LUFS |

WAV 按各自原始响度校准，已足够响的 `optional_stones_complete.wav` 保持原样。所有调整文件的真峰值低于 0 dBFS，解码后时长不变；WAV 台词范围外的采样完全保留。MP3 重编码后，其他角色的整体音量仅有约 -0.27 dB 的编码差异。

原件：`../archive/v1-before-eeyore-volume/`。精确测量与原件校验值：`eeyore-volume-adjustment.json`。可在项目根目录运行 `python3 scripts/adjust-eeyore-volume.py` 重做，始终从备份处理，不会反复叠加音量。备份不进入网页构建。
