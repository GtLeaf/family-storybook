"""用 macOS 本地声音生成逐句临时配音；正式录音可按同名文件替换。"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'audio/tts/v2/script.json').read_text())
TARGET = ROOT / 'audio/tts/v2'
TARGET.mkdir(parents=True, exist_ok=True)
# 正式录音接入后禁止批量临时合成，避免覆盖用户交付。
existing_manifest = TARGET / 'manifest.json'
if existing_manifest.exists() and any(
    row.get('provisional') is False for row in json.loads(existing_manifest.read_text())
):
    raise SystemExit('v2 已含正式录音，停止临时配音生成。请勿覆盖正式交付文件。')
VOICES = {
    '维尼': ('Reed (中文（中国大陆）)', 155),
    '小猪': ('Flo (中文（中国大陆）)', 175),
    '屹耳': ('Grandpa (中文（中国大陆）)', 145),
}

def generate(item):
    name, line = item
    voice, rate = VOICES.get(line['speaker'], ('Tingting', 170))
    with tempfile.TemporaryDirectory(prefix='storybook-audio-') as tmp:
        aiff = Path(tmp) / 'line.aiff'
        subprocess.run(['say', '-v', voice, '-r', str(rate), '-o', str(aiff), line['text']], check=True, capture_output=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(aiff), '-af', 'loudnorm=I=-23:TP=-2:LRA=7,apad=pad_dur=0.25', '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', str(TARGET / f'{name}.wav')], check=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(TARGET / f'{name}.wav'), '-c:a', 'libmp3lame', '-b:a', '96k', str(TARGET / f'{name}.mp3')], check=True)
    return dict(id=name, **line, voice=voice, rate=rate, provisional=True)

items = [(f'v2_{stage}_{i}', line) for stage, scene in DATA['scenes'].items() for i, line in enumerate(scene['lines'])]
items += [(f'v2_response_{choice}_{i}', line) for choice, lines in DATA['responses'].items() for i, line in enumerate(lines)]
items += [
    ('optional_stones_complete', dict(speaker='屹耳', text='现在看起来，好像可以安心待一会儿了。', shot=1)),
    ('ui_choice_listen', dict(speaker='旁白', text='先听他说说。你愿意告诉我们，最担心什么吗？', shot=0)),
    ('ui_choice_stay', dict(speaker='旁白', text='在旁边陪一会儿。不用着急，我们就在这里。', shot=0)),
]
with ThreadPoolExecutor(max_workers=2) as pool:
    manifest = list(pool.map(generate, items))
(TARGET / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'已生成 {len(manifest)} 句临时配音（WAV / MP3），原 v1 保留。')
