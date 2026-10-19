"""仅提高屹耳台词的音量；始终从首次备份处理，重复执行不会叠加增益。依赖 ffmpeg/ffprobe。"""
from array import array
from pathlib import Path
import hashlib
import json
import math
import shutil
import subprocess
import sys
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio/tts/v1"
BACKUP = ROOT / "audio/tts/archive/v1-before-eeyore-volume"
RATE = 48000
TARGET_LUFS = -23.0
# 结合正文、转写时间及波形停顿定位；转场边缘使用 20ms 增益渐变。
REGIONS = {
    "page_05_worry": (5.93, 15.35),
    "page_07a_response_listen": (7.05, 11.05),
    "page_07b_response_stay": (11.15, 16.632),
    "page_11_ending": (5.95, 7.50),
    "optional_stones_complete": (0.0, 3.312),
}


def run(args):
    return subprocess.run(args, check=True, capture_output=True)


def measure(path, region):
    start, end = region
    result = run([
        "ffmpeg", "-hide_banner", "-i", str(path), "-af",
        f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS,loudnorm=print_format=json",
        "-f", "null", "-",
    ]).stderr.decode()
    data = json.JSONDecoder().raw_decode(result[result.rfind("{"):])[0]
    return {"lufs": float(data["input_i"]), "true_peak_dbfs": float(data["input_tp"])}


def adjust(source, target, region, gain_db, folder):
    info = json.loads(run([
        "ffprobe", "-v", "quiet", "-show_entries", "stream=channels", "-of", "json", str(source),
    ]).stdout)
    channels = info["streams"][0]["channels"]
    samples = array("d", run([
        "ffmpeg", "-v", "error", "-i", str(source), "-ar", str(RATE),
        "-f", "f64le", "-",
    ]).stdout)
    if sys.byteorder != "little":
        samples.byteswap()
    start, end = region
    first, last = int(start * RATE) * channels, min(len(samples), int(end * RATE) * channels)
    boost = 10 ** (gain_db / 20) - 1
    for i in range(first, last):
        envelope = min(1.0, ((i - first) // channels) / (RATE * .02),
                       ((last - 1 - i) // channels) / (RATE * .02))
        samples[i] *= 1 + boost * envelope
    assert max(abs(x) for x in samples) < 1, f"{source.name} 出现削波"
    pcm = array("h", (max(-32768, min(32767, round(x * 32768))) for x in samples))
    if sys.byteorder != "little":
        pcm.byteswap()
    wav_path = folder / (source.stem + ".wav")
    with wave.open(str(wav_path), "wb") as output:
        output.setparams((channels, 2, RATE, 0, "NONE", "not compressed"))
        output.writeframes(pcm.tobytes())
    if target.suffix == ".wav":
        shutil.copy2(wav_path, target)
    else:
        run(["ffmpeg", "-v", "error", "-y", "-i", str(wav_path),
             "-codec:a", "libmp3lame", "-b:a", "192k", str(target)])
    return len(samples) // channels


def main():
    BACKUP.mkdir(parents=True, exist_ok=True)
    report = {"target_lufs": TARGET_LUFS, "fade_ms": 20, "files": []}
    # 先保存全部原件，再处理；原件在 Vite 音频导入目录之外。
    for name in REGIONS:
        for ext in ("wav", "mp3"):
            source = AUDIO / f"{name}.{ext}"
            original = BACKUP / source.name
            if not original.exists():
                shutil.copy2(source, original)
    with tempfile.TemporaryDirectory(prefix="pooh-eeyore-") as temp:
        folder = Path(temp)
        for name, region in REGIONS.items():
            for ext in ("wav", "mp3"):
                target = AUDIO / f"{name}.{ext}"
                source = BACKUP / target.name
                before = measure(source, region)
                # 每个格式单独测量：交付的 MP3 和 WAV 原始响度并不一致。
                # 已足够响的独白 WAV 保持原样，不降低任何片段的音量。
                gain = round(min(max(0, TARGET_LUFS - before["lufs"]),
                                 max(0, -2.0 - before["true_peak_dbfs"])), 2)
                if gain:
                    frames = adjust(source, target, region, gain, folder)
                else:
                    shutil.copy2(source, target)
                    frames = None
                after = measure(target, region)
                whole = measure(target, (0, 60))
                assert math.isfinite(after["lufs"])
                assert whole["true_peak_dbfs"] < 0, f"{target.name} 真峰值超限"
                entry = {"file": target.name, "start": region[0], "end": region[1],
                         "gain_db": gain, "before": before, "after": after,
                         "whole_file": whole, "decoded_frames": frames,
                         "original_sha256": hashlib.sha256(source.read_bytes()).hexdigest()}
                report["files"].append(entry)
                print(f'{target.name}: +{gain:.2f} dB，'
                      f'{before["lufs"]:.2f} → {after["lufs"]:.2f} LUFS', flush=True)
    (AUDIO / "eeyore-volume-adjustment.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
