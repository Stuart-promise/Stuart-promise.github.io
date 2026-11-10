# 万界传送门 1.0

横屏 Canvas 2D 肉鸽与餐厅经营。入口 `index.html`，无构建依赖。

- 现有 PetAccount 登录；专用 `/v1/wanjie` GET/POST 保存到自有服务器 SQLite wanjie 表。
- 服务端事务计算营业额、库存消耗、24小时离线上限、购买、培养、员工培养交换、地图与角色解锁。revision 防止跨标签/设备静默覆盖。
- 战斗模拟在浏览器进行，每20秒上传收获；刷新后可领取最近检查点。此版本不提供服务端战斗重演或强反作弊。
- 三图、固定专属武器、6武器/6被动、普通/高阶三选一、约7分钟首领与无尽模式。
- 图集统一加载约0.94 MB WebP；Canvas DPR 上限1.5、怪物100只加精英、投射物100、经验掉落110、效果40。
- 角色使用透明立绘图集加轻量位移动画；首版有少量角色共用形象，后续可替换独立美术。

验证：`node engine.test.mjs`。账号后端位于工作区 `pet234-account-service/wanjie.py`，测试 `test_wanjie.py`、`test-wanjie-browser.cjs`。本地测试数据库不可上传。

素材：内置 imagegen 生成。characters.webp 为8人概念图；sprites.webp 为保持角色身份和四列两行顺序、移除背景的透明编辑版；worlds.webp 为四格俯视环境图（森林、废土、赛博、餐厅）。生成提示要求Q版精细角色、清晰轮廓、无文字与装饰边框。原始PNG保存在本机生成目录，网页使用压缩WebP。
