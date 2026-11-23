# 小说书库来源

## 古典书库

核验与获取日期：2026-11-14。书库使用古典中文原文，不收录现代改写或译本。原文以来源电子版字形保存，不做简繁转换、改写或节选。每次只载入正在阅读的一回/篇，读者无需连接第三方内容接口。

| 本站书名 | 来源电子版 | 原文编制/校订署名 | 本次导入 |
| --- | --- | --- | --- |
| 西游记 | [《西遊記》，电子书 23962](https://www.gutenberg.org/ebooks/23962) | Leong Joana Kit Ieng | 第1—100回 |
| 三国演义 | [《三國志演義》，电子书 23950](https://www.gutenberg.org/ebooks/23950) | Jian-Lun Huang | 第1—120回 |
| 封神演义 | [《封神演義》，电子书 23910](https://www.gutenberg.org/ebooks/23910) | Pei-Jun Hsiesh；Richard Tonsing 校订 | 第1—100回 |
| 聊斋志异 | [《聊齋志異》，电子书 51828](https://www.gutenberg.org/ebooks/51828) | Chow Chih-Han | 第1—12卷，共496篇 |

四个官方条目均标注 `Public domain in the USA`。古典原文作者均为古代作者。封神演义作者归属有争议，书架采用来源条目列出的陆西星署名，并明确标为“来源署名”。完整来源头部、制作署名、原有电子书许可尾部保存在各书的 `source-notice.txt` 中；目录数据也提供该本地文件路径与原站页面链接。来源名称用于出处与致谢，不作为本站书库的品牌或背书。

- [Project Gutenberg 使用与再分发说明](https://www.gutenberg.org/policy/license.html)
- [官方中文书目](https://www.gutenberg.org/browse/languages/zh)

## 内容转换与完整性

`scripts/build-books.py` 将原始 UTF-8 文本重排成章节 JSON。它仅拆分章节、合并原文本的硬换行、整理空白，以及移走电子书制作元数据。封神演义 TXT 首尾遗留的 `/p` 和 `p/` 为源文件排版转换标记，不是小说正文，转换时去除。聊斋原卷号保留在各篇目录标题中。

西游记、三国演义和封神演义校验回目编号完整连续；聊斋校验12卷与496篇。每本另核对去除排版空白后的源正文字符序列与重排结果完全一致，防止切章时遗漏或重复正文。保留来源版本中既有用字与异文，不声称已经重新校勘。原始文件 SHA-256、章节数与首尾回目记录于 `books/source-checks.json`。

目录在 `books/manifest.json`，章节路径相对阅读器目录，例如 `books/xiyou/001.json`。再生成时从上表官方条目的 Plain Text 链接取得原始文件，以对应电子书编号命名到独立缓存目录，运行：

```text
python scripts/build-books.py --cache <原始文件目录>
```

书库为免费阅读功能；无需购买、登录或上传私人书籍。本地保存阅读设置与位置的具体方式由阅读器负责，和原文来源无关。

## 社区书源

当前启用的来源以阅读服务 `/v1/reader/sources` 为准。下表记录已有社区适配器的出处。项目编写了固定适配器读取搜索、目录、公开文字章节，第三方书源脚本不会在用户浏览器执行。

| 书源 | GitHub出处 | 已验证内容 |
| --- | --- | --- |
| 番茄小说（社区书源） | [gs1147/fanqie-booksource 固定版本](https://github.com/gs1147/fanqie-booksource/tree/399910ec4f3f955a673a9999573f25cd4e0ef093) | 实时搜索、作品目录和公开章节。《十日终焉》目录收录 1496 章；手机尺寸实测前两章、翻页、字号调整和刷新续读。浏览器按公开章节的字体排版。 |
| 开心文学网 | [tickmao/Novel固定版本](https://github.com/tickmao/Novel/blob/8cadbeedcdc64007101a0efecec169f529db24b4/sources/legado/full.json)中“开心文学网”；原kxwx.org普通跳转至kxdu.net | 《诡秘之主》搜索、1726章有序目录、单章正文；作者搜索与下一页 |
| 错层小说 | [tickmao/Novel同一版本](https://github.com/tickmao/Novel/blob/8cadbeedcdc64007101a0efecec169f529db24b4/sources/legado/full.json)中cuoceng.org | 《诡秘之主》搜索、3页合并1417章目录、UUID章节正文 |
| 笔趣阁7 | [luanmuc/legado-book-sources固定版本](https://github.com/luanmuc/legado-book-sources/blob/8510e6d1f184523d4f774ff596a9aadaa04bc673/books.json)中“笔趣阁151”；biquge7.top普通跳转至biquge7.xyz | 《诡秘之主》《凡人修仙传》搜索、完整目录、单章正文；作者搜索及分页 |

合集内容与具体站点可用性分别核验，不把合集条数当成可用书源数。XIU2/Yuedu、aoaostar/legado与speauty/legado.sources也作为发现线索检查，但本次未从中启用未通过完整流程的来源。没有执行合集中的JavaScript、处理验证码或使用解密接口。

网文不作为全本静态文件打包进仓库，服务只按需读取当前搜索、目录和章节，内容来源在阅读目录显示。第三方来源的可访问性不等于作品再分发授权；源站变更可能影响可用性。
