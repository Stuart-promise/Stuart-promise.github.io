"""Reformat four public-domain Chinese novels into lazily loaded chapter JSON.

Input: untouched UTF-8 files named <Gutenberg ebook id>.txt in --cache.
No paraphrasing, character conversion, truncation, or network calls at runtime.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOKS = [
    dict(id="xiyou", number=23962, title="西游记", author="吴承恩", genre="神魔冒险", expected=100,
         description="从花果山到西天，和悟空一起走过山川、妖国与八十一难。", credit="Leong Joana Kit Ieng"),
    dict(id="sanguo", number=23950, title="三国演义", author="罗贯中", genre="历史演义", expected=120,
         description="桃园结义，赤壁风云。跟随群雄的谋略与抉择，读一场乱世兴亡。", credit="Jian-Lun Huang"),
    dict(id="fengshen", number=23910, title="封神演义", author="陆西星（来源署名）", genre="神话传奇", expected=100,
         description="商周更替之际，哪吒、姜子牙与众仙登场，一卷写尽人间与仙界。", credit="Pei-Jun Hsiesh; revised by Richard Tonsing"),
    dict(id="liaozhai", number=51828, title="聊斋志异", author="蒲松龄", genre="志怪短篇", expected=496,
         description="狐仙、花妖与人间烟火。十二卷、四百九十六篇奇谭，适合随手读一篇。", credit="Chow Chih-Han"),
]


def plain(text):
    return re.sub(r"\s+", "", text)


def chinese_number(text):
    digits = dict(zip("零〇○一二三四五六七八九", [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
    if "十" not in text and "百" not in text:
        return int("".join(str(digits[c]) for c in text))
    result = current = 0
    for c in text:
        if c in digits:
            current = digits[c]
        else:
            result += (current or 1) * {"十": 10, "百": 100}[c]
            current = 0
    return result + current


def paragraphs(text):
    """Unwrap hard-wrapped prose; retain indented poetry as separate paragraphs."""
    result, current = [], []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            if current:
                result.append("".join(current))
                current = []
            continue
        indented = raw.startswith("　　") or raw.startswith("    ")
        if indented and current:
            result.append("".join(current))
            current = []
        current.append(line)
    if current:
        result.append("".join(current))
    assert result and all(result)
    assert plain("".join(result)) == plain(text), "Paragraph reflow changed source characters"
    return result


def source_body(text, number):
    start = re.search(r"\*\*\* START OF THE PROJECT GUTENBERG EBOOK[^\n]*\n", text)
    end = re.search(r"\*\*\* END OF THE PROJECT GUTENBERG EBOOK", text)
    assert start and end
    body = text[start.end():end.start()]
    # These are duplicate eBook production metadata, not text of the novels.
    body = re.sub(r"(?m)^Language: Chinese\s*$", "", body)
    body = re.sub(r"(?m)^Produced by Jian-Lun Huang\s*$", "", body)
    body = re.sub(r"(?m)^End of Project Gutenberg's Romance of the Three Kingdoms, by Guanzhong Luo\s*$", "", body)
    if number == 23910:
        # A literal HTML conversion artifact at the beginning/end of this TXT edition.
        body = re.sub(r"(?m)^/?p/?\s*$", "", body)
    return body.strip(), text[:start.end()] + "\n[The novel text is reformatted into the adjacent chapter JSON files.]\n\n" + text[end.start():]


def split_chapters(body, book):
    if book["id"] == "liaozhai":
        headings = list(re.finditer(r"(?m)^〈([^\n]+)〉[ \t　]*$", body))
        volumes = list(re.finditer(r"(?m)^卷[一二三四五六七八九十]+[ \t　]*$", body))
        assert len(volumes) == 12
        chapters = []
        for i, heading in enumerate(headings):
            volume = next(v.group().strip() for v in reversed(volumes) if v.start() < heading.start())
            end = headings[i + 1].start() if i + 1 < len(headings) else len(body)
            chunk = body[heading.end():end]
            # Volume headings are navigational metadata; retain them in chapter titles.
            chunk = re.sub(r"(?m)^卷[一二三四五六七八九十]+[ \t　]*$", "", chunk)
            chapters.append((f"{volume} · {heading.group(1)}", chunk))
        expected_content = re.sub(r"(?m)^卷[一二三四五六七八九十]+[ \t　]*$", "", body)
        rebuilt = "".join(f"〈{h.group(1)}〉" + c[1] for h, c in zip(headings, chapters))
    else:
        anchor = "" if book["id"] == "fengshen" else r"^[ \t　]*"
        headings = list(re.finditer(r"(?m)" + anchor + r"第([一二三四五六七八九十百〇○零]+)回[ \t　\xa0：:]+[^\n]+", body))
        assert [chinese_number(h.group(1)) for h in headings] == list(range(1, book["expected"] + 1))
        assert not body[:headings[0].start()].strip(), "Unexpected novel preface: preserve it before importing"
        chapters = []
        for i, heading in enumerate(headings):
            end = headings[i + 1].start() if i + 1 < len(headings) else len(body)
            chapters.append((re.sub(r"[ \t　\xa0]+", " ", heading.group().strip()), body[heading.end():end]))
        expected_content = body
        rebuilt = "".join(title + chunk for title, chunk in chapters)
    assert len(chapters) == book["expected"], (book["id"], len(chapters))
    assert plain(rebuilt) == plain(expected_content), "Chapter split lost or duplicated characters"
    return chapters


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, required=True)
    args = parser.parse_args()
    manifest, report = [], []
    for book in BOOKS:
        raw = (args.cache / f'{book["number"]}.txt').read_bytes()
        text = raw.decode("utf-8-sig").replace("\r\n", "\n")
        body, notice = source_body(text, book["number"])
        chunks = split_chapters(body, book)
        folder = ROOT / "books" / book["id"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "source-notice.txt").write_text(notice, encoding="utf-8")
        entries, chars = [], 0
        for i, (title, chunk) in enumerate(chunks, 1):
            ps = paragraphs(chunk)
            chars += sum(len(p) for p in ps)
            data = {"title": title, "paragraphs": ps}
            relative = f'books/{book["id"]}/{i:03}.json'
            (ROOT / relative).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
            entries.append({"title": title, "path": relative})
        source_url = f'https://www.gutenberg.org/ebooks/{book["number"]}'
        manifest.append({k: book[k] for k in ["id", "title", "author", "genre", "description"]} | {
            "language": "zh-Hant", "edition": "原版中文 · 古典原文", "characterCount": chars,
            "source": {"name": "Project Gutenberg", "url": source_url,
                       "license": "古典原文公有领域；来源站标注 Public domain in the USA",
                       "licenseUrl": "https://www.gutenberg.org/policy/license.html",
                       "noticePath": f'books/{book["id"]}/source-notice.txt', "credits": book["credit"]},
            "chapters": entries,
        })
        report.append({"id": book["id"], "number": book["number"], "sha256": hashlib.sha256(raw).hexdigest(),
                       "chapters": len(entries), "characters": chars, "sourceBytes": len(raw),
                       "first": entries[0]["title"], "last": entries[-1]["title"]})
        print(book["id"], len(entries), chars, entries[0]["title"], entries[-1]["title"])
    (ROOT / "books" / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (ROOT / "books" / "source-checks.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
