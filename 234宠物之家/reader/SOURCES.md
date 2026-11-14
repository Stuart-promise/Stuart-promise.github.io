# 小说书库来源

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

## 网文发现与 GitHub 书源研究（1.0历史记录）

同日核验了以下官方 HTTPS 首页，入口清单保存在 `web-sources.json`。这里只提供发现与原站阅读入口，不复制、缓存或打包现代小说正文，不猜测搜索接口，不把原站的付费或登录章节标为本站免费内容。官网入口在本站打开外部网页；本站字号、自动翻页和夜间设置只用于本站阅读正文，不能控制另一个网站的排版。

| 官方平台 | 入口 | 核验结果 |
| --- | --- | --- |
| 起点中文网 | https://www.qidian.com/ | HTTPS 有响应，自动请求得到 202 验证页 |
| 番茄小说 | https://fanqienovel.com/ | 200，标题与官网书单可核验 |
| 晋江文学城 | https://www.jjwxc.net/ | 200，官网与完结/中短篇入口可核验 |
| 纵横中文网 | https://www.zongheng.com/ | 200，官网标题可核验 |
| 17K小说网 | https://www.17k.com/ | 200，官网分类/免费/完本入口可核验 |
| 七猫中文网 | https://www.qimao.com/ | 200，官网原创分类与榜单可核验 |
| 刺猬猫阅读 | https://www.ciweimao.com/ | 200，官网标题可核验 |
| SF轻小说 | https://book.sfacg.com/ | 200，官网标题可核验 |

核验只是当日可达性记录，平台后续验证、登录、付费及地区限制以原站为准。首页允许跨域不代表章节接口也允许跨域，更不代表授予小说再分发权。

核验的 GitHub 一手项目文档：

- [aoaostar/legado](https://github.com/aoaostar/legado)：README 将自身定义为阅读 App 的书源、订阅源、主题及排版配置集合。仓库里的 JSON 是解析规则；不直接包含可由本站自动获得授权的小说正文。本页只链接仓库，不执行第三方书源 JavaScript。
- [heye-lin/Legado_Web](https://github.com/heye-lin/Legado_Web)：README 的“限制”明确说明纯静态模式仍受 CORS 限制；在线书籍入库与正文缓存需要生产服务和 PostgreSQL。没有将它描述成可直接放入 GitHub Pages 的通用正文接口。
- [guohuiyuan/go-novel-dl](https://github.com/guohuiyuan/go-novel-dl)：README 的架构与启动说明显示 Web 界面复用 Go 后端与 SQLite 配置，需要运行服务。本次没有运行它、登录平台、下载现代小说或部署它到用户服务器。
- [krmanik/chinese-immersion-library](https://github.com/krmanik/chinese-immersion-library)：发现了可供静态网站读取的网文平台目录。其 [API 文档](https://github.com/krmanik/chinese-immersion-library/blob/main/docs/API.md) 和 [许可证](https://github.com/krmanik/chinese-immersion-library/blob/main/LICENSE) 明确区分 CC0 的名称、介绍及链接数据和各原站自有内容。`v1/index.json` 于核验时可访问且返回 `Access-Control-Allow-Origin: *`，网文分类有15条平台记录；它提供平台目录，不是小说正文 API。本站入口清单采用逐站核验后的八个官方链接，介绍重新编写，未导入整个目录。
- [gedoor/legado](https://github.com/gedoor/legado)：核验时原仓库已删除代码，仅保留公告，未用作可用程序或书源。

开源程序或规则的代码许可证并不等于其抓取目标中小说正文的版权许可。对于需要在本站直接显示的新作品，应分别核验作者/平台的公开许可或得到授权；本轮没有找到既能直接用于纯静态浏览器、又明确允许本站再分发主流现代网文全文的统一接口。


## 1.1站内网文直读

用户明确要求接入配套服务后，增加独立只读来源适配服务。当前启用[17K小说网](https://www.17k.com/)和[SF轻小说](https://book.sfacg.com/)，以官方搜索、目录与公开文字章节为来源，按需展示于本站阅读器。使用自行编写的httpx/HTMLParser适配代码，不执行GitHub集合中的第三方JavaScript，不部署通用下载器，也不将现代小说全本打包进GitHub仓库。

目录归属和VIP标记在服务端核对；登录/付费或验证受限内容明确返回相应状态。来源代码或官方网页公开可访问均不被表述成作品可任意再分发的授权。内容来源在阅读目录内标注，源站变化可能暂时影响搜索或章节读取。


## 1.2社区书源

2026-11-14，当前默认搜索使用以下3个第三方社区书源，搜索、目录、正文及书架操作均在本站完成。引用的GitHub JSON只用来发现站点及核对网页结构；程序为自行编写的固定适配器，不运行第三方规则脚本。

| 书源 | GitHub出处 | 已验证内容 |
| --- | --- | --- |
| 开心文学网 | [tickmao/Novel固定版本](https://github.com/tickmao/Novel/blob/8cadbeedcdc64007101a0efecec169f529db24b4/sources/legado/full.json)中“开心文学网”；原kxwx.org普通跳转至kxdu.net | 《诡秘之主》搜索、1726章有序目录、单章正文；作者搜索与下一页 |
| 错层小说 | [tickmao/Novel同一版本](https://github.com/tickmao/Novel/blob/8cadbeedcdc64007101a0efecec169f529db24b4/sources/legado/full.json)中cuoceng.org | 《诡秘之主》搜索、3页合并1417章目录、UUID章节正文 |
| 笔趣阁7 | [luanmuc/legado-book-sources固定版本](https://github.com/luanmuc/legado-book-sources/blob/8510e6d1f184523d4f774ff596a9aadaa04bc673/books.json)中“笔趣阁151”；biquge7.top普通跳转至biquge7.xyz | 《诡秘之主》《凡人修仙传》搜索、完整目录、单章正文；作者搜索及分页 |

合集内容与具体站点可用性分别核验，不把合集条数当成可用书源数。XIU2/Yuedu、aoaostar/legado与speauty/legado.sources也作为发现线索检查，但本次未从中启用未通过完整流程的来源。没有执行合集中的JavaScript、处理验证码或使用解密接口。

网文不作为全本静态文件打包进仓库，服务只按需读取当前搜索、目录和章节，内容来源在阅读目录显示。第三方来源的可访问性不等于作品再分发授权；源站变更可能影响可用性。

原17K/SF及起点、纵横、晋江适配代码保留用于已存书架的阅读兼容，不参与当前默认检索和来源下拉框。古典书库的原文许可和校验记录见本文前半部分。
