"""Build small wordbook audio indexes and lossless on-demand example shards.

Run with Python 3; --check verifies checked-in outputs without changing files.
Original dictionaries, audio indexes and example attribution remain authoritative.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / '234宠物之家'
OUTPUT = ROOT / 'assets' / 'vocabulary'
BOOKS = ('cet4', 'cet6', 'zhongkao', 'gaokao')


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def build():
    clips = read(ROOT / 'vocabulary-audio.json')
    examples = read(ROOT / 'vocabulary-examples.json')
    outputs = {}
    for book in BOOKS:
        words = {row[0] for row in read(ROOT / (book + '.json'))}
        sentences = {examples[w.lower()]['en'] for w in words if w.lower() in examples}
        outputs[book + '-audio.json'] = {text: clips[text] for text in sorted(words | sentences) if text in clips}
    shards = {key: {} for key in [*'abcdefghijklmnopqrstuvwxyz', 'other']}
    for word, example in examples.items():
        first = word[0].lower()
        shards[first if first in 'abcdefghijklmnopqrstuvwxyz' else 'other'][word] = example
    outputs.update(('examples-' + key + '.json', value) for key, value in shards.items())
    OUTPUT.mkdir(exist_ok=True, parents=True)
    for name, value in outputs.items():
        path = OUTPUT / name
        if '--check' in sys.argv:
            assert read(path) == value, 'Out-of-date resource: ' + name
        else:
            path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('Verified' if '--check' in sys.argv else 'Built', len(outputs), 'vocabulary resources')


if __name__ == '__main__':
    build()
