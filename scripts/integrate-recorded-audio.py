"""按来源记录从保留的 WAV 母版重建 v2，校验文件并统一响度。依赖 ffmpeg。"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import math
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'audio/tts/v2'


def run(args):
    return subprocess.run(args, check=True, capture_output=True)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def measure(path):
    output = run(['ffmpeg', '-hide_banner', '-i', str(path), '-af',
                  'loudnorm=print_format=json', '-f', 'null', '-']).stderr.decode()
    data = json.JSONDecoder().raw_decode(output[output.rfind('{'):])[0]
    result = {'lufs': float(data['input_i']), 'true_peak_dbfs': float(data['input_tp'])}
    assert all(math.isfinite(v) for v in result.values()), f'{path.name}: 空白音频'
    return result


def process(row):
    row = dict(row)
    clip = row['id']
    if row.get('provisional'):
        return row
    with tempfile.TemporaryDirectory(prefix='pooh-formal-') as temp:
        folder = Path(temp)
        info = row['source']
        original = ROOT / info['file']
        assert sha(original) == info['sha256'], f'{clip}: 来源文件已变更，停止重建'
        if info['kind'] == 'v1-excerpt':
            start, end = info['start_seconds'], info['end_seconds']
            source = folder / 'excerpt.wav'
            run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-af',
                 f'atrim=start={start}:end={end},asetpts=PTS-STARTPTS', str(source)])
        else:
            source = original
        before = measure(source)
        # 仅调整线性增益，不压缩动态、不改变语速；给 MP3 编码留峰值余量。
        gain = round(min(-23.0 - before['lufs'], -2.0 - before['true_peak_dbfs']), 3)
        wav = folder / f'{clip}.wav'
        mp3 = folder / f'{clip}.mp3'
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-af', f'volume={gain}dB',
             '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', str(wav)])
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav),
             '-c:a', 'libmp3lame', '-b:a', '128k', str(mp3)])
        after = measure(mp3)
        assert after['true_peak_dbfs'] < -1.0, f'{clip}: 峰值超限'
        row['processing'] = {'target_lufs': -23, 'gain_db': gain,
                             'wav_before': before, 'mp3_after': after}
        row['files'] = {ext: {'sha256': sha(path), 'bytes': path.stat().st_size}
                        for ext, path in [('wav', wav), ('mp3', mp3)]}
        row['voice'] = row['speaker'] if row['speaker'] in ['维尼', '小猪', '屹耳'] else '旁白'
        row['provisional'] = False
        row.pop('rate', None)  # 旧值是 macOS 临时合成参数，并非正式录音语速。
        wav.replace(TARGET / wav.name)
        mp3.replace(TARGET / mp3.name)
        return row


def main():
    rows = json.loads((TARGET / 'manifest.json').read_text())
    assert len(rows) == 30 and len({r['id'] for r in rows}) == 30
    for row in rows:
        if not row.get('provisional'):
            source = row['source']
            if sha(ROOT / source['file']) != source['sha256']:
                raise SystemExit(f"{row['id']}: 来源文件已变更，停止重建。")
        for ext, info in row.get('files', {}).items():
            if sha(TARGET / f"{row['id']}.{ext}") != info['sha256']:
                raise SystemExit(f"{row['id']}.{ext} 已另行更新，停止覆盖。请先更新来源与交付记录。")
    with ThreadPoolExecutor(max_workers=3) as pool:
        result = list(pool.map(process, rows))
    (TARGET / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f"已从保留母版重建 {sum(not r['provisional'] for r in result)} 段角色录音。")
    for row in result:
        if 'processing' in row:
            level = row['processing']['mp3_after']
            print(f"{row['id']}: {level['lufs']:.2f} LUFS / TP {level['true_peak_dbfs']:.2f} dBFS")


if __name__ == '__main__':
    main()
