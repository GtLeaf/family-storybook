"""按源代码字表生成两种本地 WOFF2；修改中文后运行。依赖 fonttools[woff]。"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
text = ''.join(p.read_text() for p in (ROOT / 'src').rglob('*') if p.suffix in ('.ts', '.tsx') and '.test.' not in p.name)
text += ''.join(chr(i) for i in range(32, 127)) + '＋—…。“”‘’！？；：、（）／·'
for family, weight, out in [('noto-sans-sc', 400, 'story-sans'), ('noto-serif-sc', 600, 'story-serif')]:
    base = ROOT / 'node_modules' / '@fontsource' / family / 'files'
    source = base / f'{family}-chinese-simplified-{weight}-normal.woff2'
    font = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff2'
    worker = subset.Subsetter(options=options)
    worker.populate(text=text)
    worker.subset(font)
    target = ROOT / 'public' / 'fonts' / f'{out}.woff2'
    target.parent.mkdir(exist_ok=True)
    font.save(target)
    missing = set(map(ord, text)) - set(font.getBestCmap())
    chinese_missing = [chr(c) for c in missing if 0x4e00 <= c <= 0x9fff]
    if chinese_missing:
        raise RuntimeError(f'{family}: 缺少中文字符 {chinese_missing}')
    print(f'{target.name}: {target.stat().st_size:,} bytes')
