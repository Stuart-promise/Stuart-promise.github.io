/* 安栖租房 · 主逻辑 */
(() => {
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const app = $('#app'), body = document.body;
const KEY = 'anjia_rent_v1';
const pad = n => String(n).padStart(2, '0');
const nowStr = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const rnd = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const escaped = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const htmlText = value => String(value).replace(/[&<>"']/g, ch => escaped[ch]);
const shortName = value => typeof value === 'string' ? Array.from(value.trim()).slice(0, 10).join('') : '';

/* ---------- 状态 ---------- */
const fresh = () => ({ lv: 0, acts: 0, name: '', from: '', booked: false, chat: 0, lvAt: Date.now(), actsAt: 0, start: Date.now(), ended: false, seenPack: false, tip: false, forced: false, dialogs: 0, clues: [], otherViews: 0, agentNudged: false });
function readProgress() {
  const progress = { ...fresh(), white: false };
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (!stored || typeof stored !== 'object') return progress;
    for (const [key, initial] of Object.entries(progress)) {
      const value = stored[key];
      if (key === 'clues') {
        if (Array.isArray(value)) progress.clues = value.filter(tag => typeof tag === 'string');
      } else if (typeof initial === 'string') {
        progress[key] = shortName(value);
      } else if (typeof initial === 'number') {
        if (Number.isFinite(value) && value >= 0) progress[key] = value;
      } else if (typeof value === 'boolean') progress[key] = value;
    }
    if (!Number.isInteger(progress.lv) || progress.lv > 5) progress.lv = 0;
  } catch (e) { /* Use a fresh game if storage is unavailable. */ }
  return progress;
}
let S = readProgress();
const urlFrom = shortName(new URLSearchParams(location.search).get('from'));
if (urlFrom && urlFrom !== S.from) { S = fresh(); S.from = urlFrom; }
if (location.hash === '#reset') { S = fresh(); S.from = urlFrom; location.hash = '#/'; }
if (S.lv === 4) S.lv = 3;               // VR中途关掉，回到第3阶段
if (S.lv === 5) { S.lv = 0; S.ended = true; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
const sinceLv = () => (Date.now() - S.lvAt) / 1000;
const visitName = () => S.name || '新租客';

/* ---------- 自动识别城市 + 本地真实区名/小区字典 ---------- */
const CITY_MAP = { beijing:'北京', shanghai:'上海', guangzhou:'广州', shenzhen:'深圳', hangzhou:'杭州', chengdu:'成都', wuhan:'武汉', nanjing:'南京', chongqing:'重庆', xian:'西安', "xi'an":'西安', suzhou:'苏州', tianjin:'天津', changsha:'长沙', zhengzhou:'郑州', qingdao:'青岛', ningbo:'宁波', hefei:'合肥', fuzhou:'福州', xiamen:'厦门', kunming:'昆明', harbin:'哈尔滨', shenyang:'沈阳', dalian:'大连', jinan:'济南', wuxi:'无锡', foshan:'佛山', dongguan:'东莞', nanning:'南宁', guiyang:'贵阳', taiyuan:'太原', nanchang:'南昌', shijiazhuang:'石家庄', changchun:'长春', lanzhou:'兰州', haikou:'海口', wenzhou:'温州', quanzhou:'泉州', changzhou:'常州', nantong:'南通', jiaxing:'嘉兴', shaoxing:'绍兴', zhuhai:'珠海', huizhou:'惠州', zhongshan:'中山', luoyang:'洛阳', yantai:'烟台', weifang:'潍坊', xuzhou:'徐州', yangzhou:'扬州', wuhu:'芜湖', hongkong:'香港', 'hong kong':'香港', macau:'澳门', macao:'澳门', taipei:'台北' };
const CITY_DATA = {
  北京: { d:['东城','朝阳','海淀','丰台','通州','昌平'], c:['望京花园东区','华清嘉园','芳古园一区','云景里','龙泽苑','天通苑东一区','万科城市花园','石榴园北里','安栖·悦寓 西二旗店','金隅花石匠'] },
  上海: { d:['静安','徐汇','浦东','长宁','杨浦','闵行'], c:['田林新村','康健新村','张江汤臣花园','五角场佳园','莘庄名都','古美华庭','联洋年华','虹桥豪苑','安栖·悦寓 漕河泾店','金桥瑞仕'] },
  广州: { d:['越秀','天河','海珠','番禺','白云','荔湾'], c:['淘金家园','骏景花园','客村丽影','祈福新邨','嘉禾望岗花园','珠江帝景','美林海岸','华景新城','安栖·悦寓 科韵路店','岭南新世界'] },
  深圳: { d:['罗湖','南山','福田','宝安','龙华','龙岗'], c:['翠竹苑','科技园花园','梅林一村','西乡碧海湾','红山华府','大冲城市花园','桃源居','坂田万科城','安栖·悦寓 车公庙店','星河丹堤'] },
  杭州: { d:['拱墅','西湖','滨江','上城','余杭','萧山'], c:['翠苑新村','桂花城','滨盛花园','未来科技城','钱江世纪花园','万家花城','文一西路嘉园','采荷小区','安栖·悦寓 滨江店','奥体印象城旁'] },
  成都: { d:['青羊','锦江','武侯','高新','成华','金牛'], c:['玉林小区','桐梓林花园','天府软件园','建设路嘉园','光华大道名苑','攀成钢华府','大源华庭','万年场新苑','安栖·悦寓 金融城店','麓湖生态城'] },
  武汉: { d:['江岸','武昌','洪山','江汉','汉阳','光谷'], c:['百步亭花园','徐东大街嘉园','光谷广场新苑','西北湖名邸','钟家村社区','南湖花园','后湖生态园','水果湖小区','安栖·悦寓 关山店','四新朗诗'] },
  南京: { d:['鼓楼','秦淮','玄武','建邺','江宁','雨花'], c:['龙江小区','河西奥体新城','百家湖花园','新街口嘉园','仙林湖名苑','月牙湖畔','迈皋桥新村','南站万科','安栖·悦寓 软件谷店','燕子矶新城'] },
  重庆: { d:['渝中','江北','南岸','渝北','沙坪坝','九龙坡'], c:['观音桥花园','南坪万达旁','照母山名苑','三峡广场嘉园','杨家坪新村','大坪时代天街','光电园小区','茶园新区','安栖·悦寓 两江店','弹子石长嘉汇'] },
  西安: { d:['碑林','雁塔','高新','未央','莲湖','曲江'], c:['小寨嘉园','科技路花园','曲江池畔','凤城五路新苑','大唐西市旁','高新万达','锦业路名邸','经开城市运动','安栖·悦寓 软件新城店','浐灞生态区'] },
  苏州: { d:['姑苏','园区','高新','吴中','相城','吴江'], c:['湖东邻里花园','狮山御园','木渎新城','独墅湖高教区','平江新城','金鸡湖畔','尹山湖新苑','高铁新城','安栖·悦寓 创意园店','太湖新城'] },
  天津: { d:['和平','南开','河西','河东','滨海','西青'], c:['时代奥城','梅江芳水园','海光寺嘉园','华苑居华里','泰达花园','中北镇新苑','新八大里','鼓楼名邸','安栖·悦寓 滨海店','生态城季景'] },
  长沙: { d:['芙蓉','岳麓','雨花','开福','天心','望城'], c:['梅溪湖花园','五一广场嘉园','德思勤新城','滨江新城','松雅湖畔','洋湖湿地旁','万家丽新苑','烈士公园旁','安栖·悦寓 麓谷店','高铁南站旁'] },
  郑州: { d:['金水','郑东','中原','二七','管城','高新'], c:['正弘城旁','龙子湖花园','曼哈顿广场','锦艺城新苑','经开花园','北龙湖名邸','国基路小区','大学路嘉园','安栖·悦寓 高新店','滨河国际'] },
  青岛: { d:['市南','市北','崂山','李沧','黄岛','城阳'], c:['浮山后小区','五四广场嘉园','金家岭花园','李村公园旁','唐岛湾新苑','新都心名邸','麦岛家园','东李生态城','安栖·悦寓 软件园店','金沙滩旁'] },
  宁波: { d:['海曙','鄞州','江北','镇海','北仑','奉化'], c:['南部商务区','天一广场嘉园','东部新城','老外滩名苑','高新科技园','万达广场旁','庄市新村','明州里小区','安栖·悦寓 鄞州店','东钱湖畔'] },
  合肥: { d:['庐阳','蜀山','政务','滨湖','包河','瑶海'], c:['天鹅湖畔','滨湖世纪城','黄潜望嘉园','三孝口新苑','科学岛旁','经开明珠','中环城小区','四里河名邸','安栖·悦寓 高新店','包河万达旁'] },
  福州: { d:['鼓楼','台江','仓山','晋安','闽侯','马尾'], c:['东街口嘉园','金融街万达','金山公园旁','五四北新苑','大学城名邸','东二环泰禾','白马路小区','三坊七巷旁','安栖·悦寓 软件园店','烟台山旁'] },
  厦门: { d:['思明','湖里','集美','海沧','同安','翔安'], c:['莲坂新村','五缘湾花园','集美新城','海沧湾名苑','曾厝垵旁','软件园二期','瑞景新村','杏林湾小区','安栖·悦寓 观音山店','环东海域'] },
  昆明: { d:['五华','盘龙','西山','官渡','呈贡','安宁'], c:['翠湖旁嘉园','同德广场','滇池路花园','世纪城新苑','呈贡大学城','北市区名邸','南亚风情旁','巫家坝新城','安栖·悦寓 高新店','海埂公园旁'] },
  沈阳: { d:['和平','沈河','皇姑','铁西','浑南','大东'], c:['长白岛花园','青年大街嘉园','铁西广场','奥体中心旁','中街名苑','新市府新城','北站金融区','滑翔小区','安栖·悦寓 浑南店','棋盘山旁'] },
  大连: { d:['中山','沙河口','甘井子','西岗','高新','金州'], c:['星海广场旁','西安路嘉园','华南广场','高新软件园','东港名邸','青泥洼桥','泡崖新村','泉水小区','安栖·悦寓 腾飞园店','凌水湾'] },
  哈尔滨: { d:['道里','南岗','道外','香坊','松北','平房'], c:['群力新区','秋林商圈','哈西万达','松北融创','中央大街旁','会展中心','乐松广场','江北大学城','安栖·悦寓 哈西店','群力外滩'] },
  济南: { d:['历下','市中','历城','槐荫','天桥','高新'], c:['千佛山旁','奥体中心','洪家楼嘉园','领秀城花园','汉峪金谷','燕山小区','西客站新城','万象城旁','安栖·悦寓 齐鲁软件园店','华山湖畔'] },
  无锡: { d:['梁溪','滨湖','新吴','锡山','惠山','经开'], c:['太湖新城','南长街嘉园','蠡湖家园','东亭新苑','海岸城旁','万象城名邸','江溪小区','锡东新城','安栖·悦寓 软件园店','惠山古镇旁'] },
  佛山: { d:['禅城','南海','顺德','三水','高明','桂城'], c:['千灯湖花园','祖庙旁嘉园','大良新城','北滘新苑','岭南天地旁','亚艺公园','金融高新区','容桂名邸','安栖·悦寓 桂城店','佛山新城'] },
  东莞: { d:['莞城','南城','东城','松山湖','长安','虎门'], c:['鸿福路嘉园','西平花园','松山湖畔','旗峰山旁','东城万达','虎门万科','长安广场','寮步新城','安栖·悦寓 松山湖店','滨海湾新区'] },
  南宁: { d:['青秀','兴宁','西乡塘','良庆','江南','邕宁'], c:['东盟商务区','五象湖花园','朝阳广场','凤岭北名邸','江南万达','航洋城旁','大学路新苑','柳沙半岛','安栖·悦寓 五象店','青秀山旁'] },
  贵阳: { d:['云岩','南明','观山湖','花溪','白云','乌当'], c:['世纪城花园','花果园小区','喷水池嘉园','会展城名邸','金融城新苑','观山湖公园','小河万科','大学城旁','安栖·悦寓 观山湖店','未来方舟'] },
  太原: { d:['迎泽','小店','杏花岭','万柏林','晋源','尖草坪'], c:['长风商务区','亲贤街嘉园','柳巷旁新苑','漪汾苑小区','晋阳湖畔','万象城名邸','南中环花园','学府街旁','安栖·悦寓 高新店','龙城大街'] },
  南昌: { d:['东湖','红谷滩','西湖','青山湖','新建','高新'], c:['红谷滩万达','八一广场旁','朝阳洲花园','艾溪湖畔','九龙湖新城','象湖名邸','青山湖小区','红角洲新苑','安栖·悦寓 红谷滩店','瑶湖大学城'] },
  石家庄: { d:['长安','裕华','桥西','新华','高新','鹿泉'], c:['裕华万达','勒泰中心旁','怀特商圈','高新天山','世纪公园旁','新百广场','北国商城旁','正定新区','安栖·悦寓 高新店','太平河畔'] },
  台北: { d:['万华','大安','信义','中山','松山','内湖'], c:['大安森林苑','信义安和居','中山捷运宅','内湖科技园','民生社区','公馆商圈','东区名邸','古亭家园','安栖·悦寓 南港店','天母花园'] },
  香港: { d:['油尖旺','湾仔','沙田','九龙城','观塘','荃湾'], c:['太古城','黄埔花园','沙田第一城','美孚新邨','将军澳中心','康怡花园','淘大花园','海怡半岛','安栖·悦寓 启德店','丽港城'] },
};
const DEF_CITY = { d:['老城区','高新区','文教区','城南','城北','滨河区'], c:['锦绣花园东区','华清嘉园','芳古园一区','云景里','龙泽苑','翠微东里','万科城市花园','石榴园北里','安栖·悦寓 科创店','金隅花石匠'] };
function cityName(raw) {
  if (typeof raw !== 'string') return '';
  const s = raw.trim().replace(/市$/, '');
  if (/^[\u3400-\u9fff·]{2,32}$/.test(s)) return s;
  const low = s.toLowerCase().replace(/\s+city$/, '').replace(/\s+shi$/, '');
  const key = Object.prototype.hasOwnProperty.call(CITY_MAP, low) ? low : low.replace(/[^a-z]/g, '');
  return Object.prototype.hasOwnProperty.call(CITY_MAP, key) ? CITY_MAP[key] : '';
}
let CITY = '同城';
try { CITY = cityName(sessionStorage.getItem('anjia_city')) || CITY; } catch (e) {}
function useCity(city) {
  CITY = city;
  try { sessionStorage.setItem('anjia_city', city); } catch (e) {}
}
const cityLabel = () => CITY === '同城' ? '同城' : CITY;
const cityInfo = () => CITY_DATA[CITY] || DEF_CITY;
const oldDist = () => cityInfo().d[0];
const cityAddr = () => CITY === '同城' ? `${oldDist()}幸福里小区` : `${CITY}市${oldDist()}幸福里小区`;
async function detectCity() {
  if (CITY !== '同城') return;
  for (const url of ['https://api.ip.sb/geoip', 'https://ipwho.is/']) {
    try {
      const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(url, { signal: ctrl.signal }); clearTimeout(tm);
      const d = await r.json();
      const c = cityName(d.city) || cityName(d.region);
      if (c) { useCity(c); if (S.lv < 4) { route(); applyLv(false); } return; }
    } catch (e) { }
  }
}

/* ---------- 动态房源数据（随城市生成真实区名与小区名） ---------- */
function getHouses() {
  const { d, c } = cityInfo();
  return [
    { id: 'n1', img: 'n1_living', ghost: 'n1_living_ghost', title: `${c[0]} 2室1厅 南北通透 近地铁口`, area: `${d[1]}-${c[0].slice(0, 4)}`, size: 85, dir: '南北', floor: '中楼层/18层', price: 4800, tags: ['近地铁', '精装修', '随时看房'], badge: '新上' },
    { id: 'n2', img: 'n2_bedroom', title: `${c[1]} 1室1厅 地铁直达 拎包入住`, area: `${d[2]}-${c[1].slice(0, 4)}`, size: 56, dir: '南', floor: '高楼层/24层', price: 3900, tags: ['近地铁', '押一付一', '有电梯'] },
    { id: 'h404', img: 'h1_living', title: '幸福里小区 2室1厅 原租客急走 家具全送', area: `${d[0]}-幸福里`, size: 62, dir: '北', floor: '4楼/6层', price: 444, origPrice: 4500, tags: ['直降90%', '家具全送', '随时看房'], badge: '直降90% · 急租', special: true },
    { id: 'n3', img: 'n3_loft', title: `${c[8]} 精装loft 押一付一`, area: `${d[1]}-商圈`, size: 38, dir: '东', floor: '中楼层/12层', price: 3100, tags: ['品牌公寓', '押一付一', '可短租'], badge: '品牌' },
    { id: 'n4', img: 'n4_shared', title: `${c[2]} 3居合租 次卧 朝南 限女生`, area: `${d[3]}-${c[2].slice(0, 4)}`, size: 12, dir: '南', floor: '低楼层/6层', price: 1650, tags: ['合租', '近地铁', '民水民电'] },
    { id: 'n5', img: 'n5_community', title: `${c[3]} 3室1厅 公园旁 小区环境好`, area: `${d[4]}-${c[3].slice(0, 4)}`, size: 108, dir: '南北', floor: '中楼层/16层', price: 5200, tags: ['有电梯', '随时看房', '可养宠物'] },
    { id: 'n6', img: 'n6_studio', title: `${c[4]} 开间 地铁口 拎包入住`, area: `${d[5]}-${c[4].slice(0, 4)}`, size: 35, dir: '西', floor: '高楼层/14层', price: 2400, tags: ['近地铁', '独立卫浴', '押一付一'] },
  ];
}
function getExtra() {
  const { d, c } = cityInfo();
  return [
    { id: 'n6', img: 'n6_studio', title: `${c[5]} 开间 独立厨卫 近地铁站`, area: `${d[5]}-${c[5].slice(0, 4)}`, size: 32, dir: '南', floor: '中楼层/9层', price: 2200, tags: ['近地铁', '押一付一'] },
    { id: 'n2', img: 'n2_bedroom', title: `${c[6]} 主卧 带飘窗 可月付`, area: `${d[1]}-${c[6].slice(0, 4)}`, size: 18, dir: '南', floor: '高楼层/20层', price: 2900, tags: ['合租', '月付'] },
    { id: 'n4', img: 'n4_shared', title: `${c[7]} 4居合租 次卧 采光好`, area: `${d[3]}-${c[7].slice(0, 4)}`, size: 10, dir: '东', floor: '低楼层/6层', price: 1450, tags: ['合租', '近地铁'] },
    { id: 'n3', img: 'n3_loft', title: `${c[8]} 一居loft 拎包入住`, area: `${d[2]}-科技园`, size: 40, dir: '南', floor: '中楼层/15层', price: 3400, tags: ['品牌公寓', '近地铁'] },
    { id: 'n5', img: 'n5_community', title: `${c[9]} 2室1厅 地铁沿线`, area: `${d[4]}-${c[9].slice(0, 4)}`, size: 79, dir: '南北', floor: '高楼层/18层', price: 4200, tags: ['有电梯', '随时看房'] },
  ];
}
const GHOST_IMGS = ['h1_mirror', 'h3_bedroom_ghost', 'h4_bathroom', 'h5_stair', 'v2_hallway'];
const getHouse = id => { const hs = getHouses(); return hs.find(h => h.id === id) || hs[0]; };

function imgOf(h, i = 0) {
  if (S.lv >= 3) return h.id === 'n1' ? h.ghost : GHOST_IMGS[(i + h.size) % GHOST_IMGS.length];
  if (h.id === 'n1' && S.lv >= 1) return h.ghost;
  if (h.id === 'h404' && S.lv >= 2) return 'h1_mirror';
  return h.img;
}
const P = n => `img/${n}.jpg?v=13`;
const titleOf = h => S.lv >= 3 ? '幸福里小区 404 · 有人在等你' : h.title;
const priceOf = h => S.lv >= 3 ? 444 : h.price;

/* ---------- 工具 ---------- */
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms); }
function modal(html, cls = '') {
  const m = $('#modal'); m.className = 'modal ' + cls; m.style.background = ''; m.innerHTML = html; $('#modalMask').classList.add('open');
  const x = m.querySelector('.m-x'); if (x) x.onclick = closeModal;
  return m;
}
function closeModal() { $('#modalMask').classList.remove('open'); }
function drawQR(c) {
  const x = c.getContext('2d'), n = 21, s = c.width / n; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.width); x.fillStyle = '#222';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.random() > .5) x.fillRect(i * s, j * s, s, s);
  [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([a, b]) => { x.fillStyle = '#222'; x.fillRect(a * s, b * s, 7 * s, 7 * s); x.fillStyle = '#fff'; x.fillRect((a + 1) * s, (b + 1) * s, 5 * s, 5 * s); x.fillStyle = '#222'; x.fillRect((a + 2) * s, (b + 2) * s, 3 * s, 3 * s); });
}
$$('canvas.qr').forEach(drawQR);

function act(n = 1) { S.acts += n; save(); check(); }
let lv3Pending = false;
function clue(tag) {
  if (!Array.isArray(S.clues)) S.clues = [];
  if (S.clues.includes(tag)) return;
  S.clues.push(tag); save();
  applyLv(false);
  if (S.lv === 2 && S.clues.length === 1) {
    setTimeout(() => {
      if (S.lv === 2 && !chatBusy) {
        if (!chat.classList.contains('open')) openChat();
        else herSay(['您看得好仔细呀，是不是发现什么不对劲的地方了？']);
      }
    }, 5500);
  }
  if (S.lv === 2 && (S.clues.length >= 2 || tag === 'book') && !lv3Pending) {
    lv3Pending = true;
    setTimeout(() => { if (S.lv === 2) setLv(3); }, tag === 'book' ? 5000 : 15000);
  }
}

/* ---------- 首页 ---------- */
function card(h, i) {
  const rented = !h.special && S.lv < 2 && (S.otherViews || 0) >= 3;
  const badge = S.lv >= 3 ? '<span class="badge hot">已入住</span>' : rented ? '<span class="badge">已租出</span>' : h.badge ? `<span class="badge ${h.special ? 'hot' : ''}">${h.badge}</span>` : '';
  let watch = '';
  if (h.special) watch = `<span class="vr-ico" style="background:rgba(255,59,48,.92)">🔥 ${S.lv >= 2 ? '0 人在看' : S.lv >= 1 ? '1 人正在看' : '13人刚看过'}</span>`;
  else if (i % 2 === 0 && !rented) watch = '<span class="vr-ico">VR看房</span>';
  const tags = h.tags.map((t, k) => `<span class="${/直降|家具|特价/.test(t) ? 'r' : k === 0 ? 'g' : ''}">${S.lv >= 3 ? rnd(['已入住', '勿开灯', '别回头', '永久住']) : t}</span>`).join('')
    + (h.special && S.from && S.lv < 3 ? `<span class="b">好友${htmlText(S.from)}刚看过</span>` : '');
  const areaTxt = CITY === '同城' ? h.area : `${CITY}-${h.area.split('-')[0]}`;
  const orig = h.origPrice && S.lv < 3 ? `<s>¥${h.origPrice}</s>` : '';
  return `<div class="card ${h.special && S.lv < 3 ? 'hot404' : ''} ${rented ? 'rented' : ''}" data-house="${h.id}">
    <div class="pic"><img src="${P(imgOf(h, i))}" alt="">${badge}${watch}</div>
    <h5>${titleOf(h)}</h5>
    <div class="meta">${areaTxt} | ${h.size}㎡ | ${h.dir} | ${h.floor}</div>
    <div class="tags">${tags}</div>
    <div class="price">${rented ? '已租出' : `${priceOf(h)} <small>元/月</small>${orig}`}</div></div>`;
}
function home() {
  const ended = S.ended, ci = cityInfo();
  const slide1 = S.lv >= 2 ? ['幸福里 · 有人在等你回家', '房东急租 · 444元/月 · 今晚即可入住'] : ['11月租房节', '真房源 · 0中介费 · 最高免一个月房租'];
  let houses = getHouses();
  let loopCard = '';
  if (ended) loopCard = `<div class="card hot404" data-house="h404"><div class="pic"><img src="${P('h2_bedroom')}" alt=""><span class="badge hot">房东急租</span><span class="vr-ico" style="background:#ff3b30">🔥 1 人正在看</span></div>
      <h5>幸福里小区 2室1厅 原租客已搬走 拎包入住</h5><div class="meta">${cityLabel()}-${oldDist()} | 62㎡ | 北 | 4楼/6层</div>
      <div class="tags"><span class="r">直降90%</span><span>原租客：${htmlText(visitName())}</span></div><div class="price">444 <small>元/月</small></div></div>`;
  if (ended) houses = houses.filter(h => h.id !== 'h404');
  app.innerHTML = `
  <div class="wrap">
    <div class="hero">
      <div class="banner" id="banner">
        <div class="slide on"><img src="${P('banner1')}" alt=""><div class="s-txt"><h2 id="slideH">${slide1[0]}</h2><p>${slide1[1]}</p><a class="btn" data-go="${S.lv >= 2 ? '#/house/h404' : '#/list'}">立即找房</a></div></div>
        <div class="slide s2"><div class="s-txt"><p style="font-size:22px">新人专享租房红包</p><div class="big">488<small style="font-size:30px">元</small></div><p>注册即领 · 签约立减</p><a class="btn" data-act="pack">马上领取</a></div></div>
        <div class="slide s3"><div class="s-txt"><h2>真房源 假一赔百</h2><p>每一套房源都经过经纪人实地核验</p><a class="btn" data-act="soon">了解详情</a></div></div>
        <div class="dots"><i class="on"></i><i></i><i></i></div>
      </div>
      <div class="side-panel">
        <h4>${S.name ? '您好，' + htmlText(S.name) : '登录安栖，找房更省心'}</h4>
        <a class="btn" data-act="login">${S.name ? '我的预约' : '登录 / 注册'}</a>
        <a class="btn line" data-act="soon">我是业主，免费发布房源</a>
        <div class="quick"><span><i>⌂</i>我的收藏</span><span><i>☏</i>预约看房</span><span><i>¥</i>房租月付</span><span><i>✎</i>电子合同</span></div>
        <div class="notice" id="notice">
          ${S.lv >= 2 ? '<p class="red" data-go="#/house/h404">林小雨，女，24岁，于幸福里小区附近失联</p>' : '<p style="color:#c0392b;font-weight:bold" data-house="h404">关于“幸福里404”不实传言的澄清声明</p>'}
          <p>安栖租房11月租房节活动规则说明</p>
          <p>警惕“低价房源”诈骗，请勿提前转账</p>
          ${S.lv >= 2 ? '' : '<p>安栖APP 6.8.0 版本更新说明</p>'}
        </div>
      </div>
    </div>
    <div class="cats">
      ${[['整租', '#22c37d', '整'], ['合租', '#3d8bff', '合'], ['品牌公寓', '#ff8a3d', '寓'], ['地铁找房', '#9b6bff', '铁'], ['押一付一', '#ff5b6e', '押'], ['短租', '#16b8c9', '短'], ['免中介费', '#f5b301', '免'], ['地图找房', '#5aa36b', '图']]
      .map(([t, c, g]) => `<div class="cat" data-go="#/list"><i style="background:${S.lv >= 3 ? '#333' : c}">${g}</i><span>${t}</span></div>`).join('')}
    </div>
    <div class="sec-h"><h3>为你推荐<small>${S.lv >= 2 ? '根据你的浏览习惯，她为你挑选了这些房源' : `根据你的位置（${cityLabel()}），为你精选优质房源`}</small></h3>
      <div class="sec-tabs"><span class="on">精选</span><span>近地铁</span><span>整租</span><span>合租</span><span>品牌公寓</span></div></div>
    <div class="grid" id="grid">
      ${loopCard}${houses.map(card).join('')}
      ${ended ? '' : `<div class="card" data-act="soon"><div class="pic" style="background:linear-gradient(150deg,#e9fbf2,#c9f1dc);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0e9a5d"><b style="font-size:24px">业主委托</b><p>免费发布 · 最快3天租出</p><span class="btn" style="margin-top:10px">立即委托</span></div><h5>有房要出租？交给安栖</h5><div class="meta">全国 12,000+ 门店 · 专业经纪人</div><div class="tags"><span class="g">0佣金</span><span>省心托管</span></div></div>`}
    </div>
    <div class="two-col">
      <div class="news"><div class="sec-h"><h3>租房攻略</h3></div><ul>
        ${(S.lv >= 3 ? ['租房时，记得先看衣柜里面', '深夜有人敲门，千万不要开', '为什么老小区的四楼总是很便宜？', '如何确认房子里只有你一个人', '镜子不要对着床', '上一个租客去哪了？'] :
        ['租房合同里这5个坑，一定要注意！', '押一付三还是押一付一？一文讲清楚', `${cityLabel()}租房补贴怎么申请？2026最新政策`, '看房时一定要检查这几个地方', '和室友合租，如何避免矛盾', '退租押金不退怎么办？教你维权'])
        .map((t, i) => `<li data-act="soon">${t}<span>${today().slice(5)}</span></li>`).join('')}
      </ul></div>
      <div class="rank"><div class="sec-h"><h3>热门小区</h3></div><ul>
        ${[[ci.c[0], '4,850'], [ci.c[1], '3,920'], ['幸福里小区', '444'], [ci.c[2], '3,260'], [ci.c[3], '4,420'], [ci.c[4], '2,480']]
        .map(([n, p], i) => `<li ${n === '幸福里小区' ? 'data-house="h404"' : 'data-go="#/list"'}><b>${i + 1}</b>${n}<em>${p}元/月</em></li>`).join('')}
      </ul></div>
    </div>
    <div class="stats"><div><b id="st1">12,836,429</b><span>位租客在安栖找到新家</span></div><div><b>98.6%</b><span>真房源率</span></div><div><b>12,000+</b><span>线下门店</span></div><div><b id="st4">${S.lv >= 2 ? '1' : '2,384'}</b><span>今日新增房源</span></div></div>
  </div>`;
  let si = 0; const slides = $$('.slide'), dots = $$('.dots i');
  clearInterval(home._t); home._t = setInterval(() => { if (!document.contains(slides[0])) return clearInterval(home._t); slides[si].classList.remove('on'); dots[si].classList.remove('on'); si = (si + 1) % slides.length; slides[si].classList.add('on'); dots[si].classList.add('on'); }, 4500);
  $$('.sec-tabs span').forEach(s => s.onclick = () => { $$('.sec-tabs span').forEach(x => x.classList.remove('on')); s.classList.add('on'); act(); });
  if (S.lv >= 1) { const hw = $('#hotwords'); if (!hw.querySelector('.bad')) hw.insertAdjacentHTML('beforeend', '<a class="bad" data-house="h404">幸福里 444元</a>'); }
  // 首页幸福里封面图：每隔 4~7 秒极快闪现 0.38 秒“凑近摄像头偷看”实拍图再瞬间切回
  clearTimeout(home._peek);
  if (S.lv < 3) {
    new Image().src = P('h1_peek');
    const flashPeek = () => {
      const im = $('#grid .card[data-house="h404"] .pic img');
      if (!im || !document.contains(im)) return;
      im.src = P('h1_peek');
      setTimeout(() => { if (document.contains(im)) im.src = P(S.lv >= 2 ? 'h1_mirror' : 'h1_living'); }, 380);
      home._peek = setTimeout(flashPeek, 4000 + Math.random() * 3000);
    };
    home._peek = setTimeout(flashPeek, 3500);
  }
}

/* ---------- 列表页 ---------- */
function list(q) {
  let rows = getHouses().concat(getExtra());
  if (S.lv >= 1) rows = [getHouse('h404')].concat(rows.filter(r => r.id !== 'h404'));
  if (S.lv >= 2 && q) rows = [getHouse('h404')];
  const total = S.lv >= 2 && q ? 1 : 2384;
  app.innerHTML = `<div class="wrap">
    <div class="crumb"><a href="#/">安栖租房</a> &gt; <a>${cityLabel()}租房</a> &gt; ${q ? '“' + htmlText(q) + '”的搜索结果' : '全部房源'}</div>
    <div class="filter">
      <dl><dt>区域</dt>${['不限', ...cityInfo().d].map((t, i) => `<dd class="${i ? '' : 'on'}">${t}</dd>`).join('')}</dl>
      <dl><dt>租金</dt>${['不限', '1500以下', '1500-2500', '2500-4000', '4000-6000', '6000以上'].map((t, i) => `<dd class="${i ? '' : 'on'}">${t}</dd>`).join('')}</dl>
      <dl><dt>户型</dt>${['不限', '一居', '二居', '三居', '四居+'].map((t, i) => `<dd class="${i ? '' : 'on'}">${t}</dd>`).join('')}</dl>
      <dl><dt>方式</dt>${['不限', '整租', '合租', '品牌公寓'].map((t, i) => `<dd class="${i ? '' : 'on'}">${t}</dd>`).join('')}</dl>
    </div>
    <div class="list-wrap"><div class="list">
      <div class="list-total">共找到 <b>${total.toLocaleString()}</b> 套${cityLabel()}租房${total === 1 ? '，它已经等你很久了' : ''}</div>
      ${rows.map((h, i) => { const rented = !h.special && S.lv < 2 && (S.otherViews || 0) >= 3; return `<div class="row ${rented ? 'rented' : ''}" data-house="${h.id}">
        <div class="pic"><img src="${P(imgOf(h, i))}" alt="">${rented ? '<span class="badge">已租出</span>' : h.special ? '<span class="badge hot">特价</span>' : ''}</div>
        <div class="info"><h4>${titleOf(h)}</h4>
          <div class="meta">${h.area} / ${h.size}㎡ / ${h.dir} / ${h.floor}</div>
          <div class="tags">${h.tags.map((t, k) => `<span class="${/直降|家具|特价/.test(t) ? 'r' : k === 0 ? 'g' : ''}">${t}</span>`).join('')}</div>
          <div class="agentline">经纪人 王秀芬 · ${h.special ? (S.lv >= 1 ? '1年前' : '今天') : (i % 3 + 1) + '天前'}更新 · ${h.special ? 13 : 20 + i * 7}人关注</div></div>
        <div class="rp"><div class="price">${rented ? '已租出' : `${priceOf(h)} <small>元/月</small>`}</div></div></div>`; }).join('')}
      <div class="pager"><a>上一页</a><a class="on">1</a><a>2</a><a>3</a><a>4</a><a>…</a><a>100</a><a>下一页</a></div>
    </div>
    <div class="list-side"><div class="ad-box"><h4>新人租房红包</h4><p>最高可领 488 元</p><a class="btn orange" data-act="pack">立即领取</a></div>
      <div class="ad-box" style="background:linear-gradient(160deg,#eafaf2,#cdeedd)"><h4 style="color:#0e9a5d">房租月付</h4><p style="color:#3c7a5a">押一付一 · 0压力入住</p><a class="btn" data-act="soon">了解一下</a></div></div></div></div>`;
  $$('.filter dd').forEach(d => d.onclick = () => { d.parentNode.querySelectorAll('dd').forEach(x => x.classList.remove('on')); d.classList.add('on'); act(); });
}

/* ---------- 详情页 ---------- */
let gal = [], gi = 0, galSeen = {};
function detail(id) {
  const h = getHouse(id), is404 = id === 'h404';
  if (!is404 && S.lv < 2) {
    S.otherViews = (S.otherViews || 0) + 1; save();
    if (S.otherViews >= 4) {
      toast('该房源刚刚已被租出，为您跳转至当前仅剩的幸福里 404', 2600);
      location.replace('#/house/h404');
      return;
    }
    if (S.otherViews >= 2 && !S.agentNudged) {
      S.agentNudged = true; save();
      setTimeout(() => {
        if (S.lv < 2 && !chatBusy) {
          openChat();
          herSay(['亲，您刚才看的那几套都刚租出去了，现在只剩幸福里 404 还能今晚看房哦~ <br><a data-house="h404" style="color:#13b16d;font-weight:bold;text-decoration:underline">点击直接看 404 &gt;</a>']);
        }
      }, 2200);
    }
  }
  if (is404 && S.lv < 2) setLv(2);
  if (is404) gal = [['h1_living', '客厅 · 18㎡ · 朝北'], ['h2_bedroom', '卧室 · 12㎡ · 朝北'], ['h4_bathroom', '卫生间 · 4㎡ · 暗卫'], ['h5_stair', '楼道 · 4层']];
  else {
    const others = ['n1_living', 'n2_bedroom', 'n3_loft', 'n6_studio', 'n4_shared'].filter(x => x !== h.img).slice(0, 3);
    const second = S.lv >= 1 ? 'n1_living_ghost' : others[0];
    gal = [[h.img, '客厅'], [second, '阳台实景'], ...others.slice(1).map(o => [o, rnd(['卧室', '厨房'])])];
  }
  gi = 0; galSeen = {};
  const reviews = is404 ? [
    ['用户5519', '⭐⭐', '2026-10-28', '怀疑是中介拿两套图拼的假房源，上面那几张房间照片我多点了几下，画面怎么自己变了？看着怪渗人的'],
    ['张', '⭐⭐⭐⭐⭐', '2026-10-12', '房子和图片一样，就是旧了点。王姐人很热情，价格是真的便宜。'],
    ['用户8812', '⭐⭐⭐⭐', '2026-09-03', '老小区，楼下买菜方便。隔音一般，晚上总能听到楼上有人走来走去。'],
    ['李', '⭐⭐⭐⭐⭐', '2026-07-21', '房东人很好，说房租不用急着交，住下来就行。']] : [
    ['王', '⭐⭐⭐⭐⭐', '2026-11-02', '房子很新，交通方便，经纪人响应很快。'],
    ['用户2271', '⭐⭐⭐⭐', '2026-10-18', '和图片基本一致，楼下就是地铁口，推荐。'],
    ['热心邻居', '⭐⭐', '昨天', `避雷提醒：别贪便宜看${oldDist()} <a data-house="h404" style="color:#13b16d;text-decoration:underline">幸福里404那套444块的房</a>！上个租客住了一周就失联了，到现在还挂着急租… <a data-house="h404" style="color:#fe5b4c;font-weight:bold">点击查看详情 &gt;</a>`]];
  const desc404 = [
    '【房源亮点】房东急租，原租客临时搬走，家具家电全部留下，可直接拎包入住。',
    '【交通出行】步行 8 分钟到地铁站，楼下有菜市场、小卖部，生活便利。',
    '【小区环境】老小区，邻居都是老住户，非常安静，基本不会有人打扰您。',
    S.lv >= 2 ? '【房东说明】卧室衣柜请勿打开（房东存放的私人物品）。晚上十二点以后，有人敲门请不要应答。' : '【看房说明】随时可看，提前联系经纪人即可。',
    S.lv >= 2 ? '<span class="blood">【温馨提示】请不要在卧室里开灯。她不喜欢光。</span>' : ''];
  const facil = [['❄', '空调'], ['🧊', '冰箱'], ['🌀', '洗衣机'], ['♨', '热水器'], ['🛏', '床'], ['🚪', '衣柜'], ['📶', '宽带'], ['🪞', '镜子']];
  app.innerHTML = `<div class="wrap">
    <div class="crumb"><a href="#/">安栖租房</a> &gt; <a href="#/list">${cityLabel()}租房</a> &gt; <a>${h.area.split('-')[0]}</a> &gt; ${h.area.split('-')[1]}</div>
    <div class="d-title"><h1>整租 · ${is404 && S.lv >= 3 ? '幸福里小区 404 · 她的房间' : h.title}</h1>
      <div class="d-sub"><span>房源编号：AJ${is404 ? '20251125' + '0404' : '2026' + h.size + '1108'}</span><span>${is404 ? (S.lv >= 3 ? '更新于：' + nowStr() : '更新于：1年前') : '更新于：今天'}</span><span id="viewers">${is404 ? (S.lv >= 3 ? '已有 13 人入住，0 人搬出' : '已有 13 人关注') : '已有 ' + (h.size + 21) + ' 人关注'}</span></div></div>
    <div class="d-main">
      <div class="gallery"><div class="g-big"><img id="gImg" src="${P(gal[0][0])}" alt=""><div class="g-cap" id="gCap">${gal[0][1]}</div><div class="g-arrow l" id="gL">‹</div><div class="g-arrow r" id="gR">›</div></div>
        <div class="g-thumbs" id="gThumbs">${gal.map((g, i) => `<img src="${P(g[0])}" data-i="${i}" class="${i ? '' : 'on'}">`).join('')}</div></div>
      <div class="d-right">
        <div class="d-price"><span class="price" id="dPrice">${priceOf(h)} <small>元/月</small></span><span class="pay">押一付一</span>${is404 ? '<span class="tags" style="margin-left:10px"><span class="r">房东急租</span></span>' : ''}</div>
        <div class="d-info">
          <p><span>租赁方式</span>整租</p><p><span>房屋类型</span>${is404 ? '2室1厅1卫' : '2室1厅1卫'} ${h.size}㎡</p>
          <p><span>朝向楼层</span>${h.dir} ${h.floor}</p><p><span>装修情况</span>${is404 ? '简装' : '精装'}</p>
          <p><span>入住时间</span>随时入住</p><p><span>看房时间</span>${is404 && S.lv >= 2 ? '<b class="blood">仅限夜间</b>' : '随时可看'}</p>
        </div>
        <div class="agent ${is404 ? 'bw' : ''}"><img id="agentImg" src="${P(S.lv >= 3 ? 'agent_ghost' : 'agent')}" alt=""><div><b>王秀芬</b><span class="lv">金牌经纪人</span><small>好评率 100% · 近30天带看 ${is404 ? (S.lv >= 2 ? '13 人，0 人回来' : '13 次') : '41 次'}</small><small>安栖租房 · ${cityLabel()}幸福里店</small></div></div>
        <div class="d-btns"><a class="btn" data-act="chat">在线咨询</a><a class="btn line" data-act="book">预约看房</a><a class="btn orange vr-btn ${is404 && S.lv >= 3 ? 'lv3-vr' : is404 && S.lv >= 2 ? 'pulse' : ''}" data-act="vr" data-id="${id}">${is404 && S.lv >= 3 ? '进入404（她在等你）' : is404 ? 'VR实景看房' : 'VR看房'}</a></div>
        <div class="d-phone">☏ 400-878-0404 转 ${is404 ? '444' : '2' + h.size}</div>
      </div>
    </div>
    <div class="d-sec"><h3>房源描述</h3><div class="d-desc">${is404 ? desc404.map(p => p ? `<p>${p}</p>` : '').join('') :
      `<p>【房源亮点】${h.title}，${h.dir}向采光好，${h.tags.join('、')}。</p><p>【交通出行】小区门口即公交站，步行10分钟内到达地铁站。</p><p>【周边配套】附近有大型超市、商场、医院、学校，生活便利。</p>`}</div></div>
    <div class="d-sec"><h3>房屋配套</h3><div class="facil">${facil.map(([i, t]) => `<div class="${is404 && S.lv >= 2 && t === '衣柜' ? 'no' : ''}"><i>${i}</i>${t}${is404 && S.lv >= 2 && t === '衣柜' ? '<small>（勿开）</small>' : ''}</div>`).join('')}</div></div>
    <div class="d-sec"><h3>位置及周边</h3><div class="map" id="map"><svg viewBox="0 0 1200 280" preserveAspectRatio="none">
      <rect width="1200" height="280" fill="#e9eef1"/><path d="M0 140H1200M600 0V280M0 60L1200 230M300 0V280M900 0V280" stroke="#fff" stroke-width="14"/><path d="M0 140H1200M600 0V280" stroke="#ffd98a" stroke-width="8"/>
      <rect x="640" y="160" width="120" height="70" fill="#d6ead8"/><rect x="180" y="30" width="90" height="80" fill="#d6ead8"/></svg>
      <span class="pin red" style="left:50%;top:48%">${is404 ? '幸福里小区' : h.area.split('-')[1]}</span>
      <span class="pin m" style="left:25%;top:45%">地铁站 650m</span><span class="pin m" style="left:72%;top:30%">菜市场 200m</span>
      <span class="pin m" style="left:76%;top:72%;${is404 && S.lv >= 2 ? 'background:#555' : ''}">${is404 && S.lv >= 2 ? '殡仪馆 300m' : '社区医院 500m'}</span><span class="pin m" style="left:15%;top:80%">小学 900m</span></div></div>
    <div class="d-sec"><h3>租客评价（${is404 ? 14 : 3}）</h3><div id="reviews">${reviews.map(r => rev(...r)).join('')}</div>
      ${is404 ? '<a class="more-btn" id="moreRev">查看更多评价（10条 · 含失联原租客留言）</a>' : ''}
      ${is404 && S.lv >= 2 ? (S.lv >= 3
        ? `<div class="missing cursed" id="missingBox"><img id="missingImg" src="${P('tenant')}" alt=""><div><h4>寻人启事 <small style="font-size:13px;letter-spacing:2px">（最新）</small></h4><p>${htmlText(visitName())}，于今日 ${nowStr()} 在${cityAddr()}7号楼404室附近失联，失联前正独自浏览“安息租房”网页。</p><p>原住户林小雨已找到新室友，无需再寻找。</p><p style="color:#d93838">——TA最后一条消息是：“门已经开了，我正在点进VR看房。”</p></div></div>`
        : `<div class="missing" id="missingBox"><img id="missingImg" src="${P('tenant')}" alt=""><div><h4>寻人启事</h4><p>林小雨，女，24岁，身高162cm，长直发。2025年11月25日晚在${cityAddr()}7号楼附近失联，失联时身穿白色睡衣。</p><p>如有知情者，请联系 138****0404，必有重谢。</p><p style="color:#a00">——她最后一条消息是：“新家很好，就是房间里好像不止我一个人。”</p></div></div>`) : ''}
    </div>
    <div class="d-sec"><h3>相似房源推荐</h3><div class="grid">${getHouses().filter(x => x.id !== id).slice(0, 4).map(card).join('')}</div></div>
  </div>`;
  let galSteps = 0, stayT = null;
  const swapThumb = (idx, name) => { const th = $(`#gThumbs img[data-i="${idx}"]`); if (th) th.src = P(name); };
  const variantOf = (idx, forceNext) => {
    const seen = galSeen[idx] || 0;
    const ready = forceNext || seen >= 2 || galSteps >= 3;
    if (idx === 0) {
      if (S.lv >= 3 || seen >= 3 || (forceNext && $('#gImg').src.includes('h1_mirror'))) return ['h1_xiaoyu', '客厅 · 18㎡ · 原租客'];
      if (ready) return ['h1_mirror', '客厅 · 18㎡ · 朝北'];
    }
    if (idx === 1 && ready) return ['h3_bedroom_ghost', S.lv >= 3 ? '卧室 · 她一直坐在这里' : '卧室 · 12㎡ · 朝北'];
    if (idx === 2 && ready) return ['h4_bathroom_ghost', '卫生间 · 4㎡ · 暗卫'];
    if (idx === 3 && ready) return ['h5_stair_ghost', S.lv >= 3 ? '楼道 · 4层 · 门没锁' : '楼道 · 4层'];
    return null;
  };
  const show = (i, forceNext) => {
    clearTimeout(stayT);
    gi = (i + gal.length) % gal.length; galSteps++;
    let src = gal[gi][0], cap = gal[gi][1];
    if (is404 && S.lv >= 2) {
      galSeen[gi] = (galSeen[gi] || 0) + 1;
      const v = variantOf(gi, forceNext);
      if (v) { src = v[0]; cap = v[1]; swapThumb(gi, src); }
      else if (gi === 2 || gi === 3) {
        // 盯着后两张看满 3 秒，也会极其克制地悄悄切换成变体
        const curIdx = gi;
        stayT = setTimeout(() => {
          if (gi !== curIdx || !$('#gImg')) return;
          const v2 = variantOf(curIdx, true);
          if (v2) { $('#gImg').src = P(v2[0]); $('#gCap').textContent = v2[1]; swapThumb(curIdx, v2[0]); if (!show.once) { show.once = 1; SFX.staticBurst(0.2, 0.1); clue('photo'); } }
        }, 3000);
      }
    }
    $('#gImg').src = P(src); $('#gCap').textContent = cap;
    $$('#gThumbs img').forEach((t, k) => t.classList.toggle('on', k === gi));
    if (is404 && /mirror|xiaoyu|ghost/.test(src) && S.lv >= 2 && !show.once) { show.once = 1; SFX.staticBurst(0.25, 0.12); clue('photo'); }
    act(0.5);
  };
  galSeen[0] = 1;
  $('#gImg').style.cursor = is404 ? 'pointer' : '';
  if (is404) $('#gImg').onclick = () => show(gi, true);
  $('#gL').onclick = () => show(gi - 1); $('#gR').onclick = () => show(gi + 1);
  $$('#gThumbs img').forEach(t => t.onclick = () => show(+t.dataset.i));
  const more = $('#moreRev');
  if (more) more.onclick = () => {
    const t = S.lv >= 3 ? today() + ' ' + nowStr() : '2025-11-28';
    $('#reviews').insertAdjacentHTML('beforeend', [
      ['小雨', '⭐⭐⭐⭐⭐', '2025-11-24', '签了！明天就搬进去，终于有自己的小窝了 🏠'],
      ['用户0404', '⭐', '2025-11-26', '楼上根本没有住人。'],
      ['用户0404', '⭐', '2025-11-26', '衣柜的门，每天早上都是开着的。'],
      ['用户0404', '⭐', '2025-11-27', '我晚上明明把镜子盖住了。'],
      ['小雨', '⭐⭐⭐⭐⭐', '2025-11-27', '我很好，不要来找我。'],
      ['小雨', '⭐⭐⭐⭐⭐', '2025-11-27', '我很好，不要来找我。'],
      ['小雨', '⭐⭐⭐⭐⭐', '2025-11-27', '我很好我很好我很好我很好我很好我很好我很好我很好'],
      ['用户4041', '⭐⭐', '2025-11-27', '刚去青槐新村社区网查了下，隔壁青槐新村4号楼404也是半夜空屋流水、监控里站着人，这两套房不会是连着的吧？'],
      ['王秀芬', '⭐⭐⭐⭐⭐', t, '房子一直在，一直在等人。'],
      ['小雨', '⭐⭐⭐⭐⭐', t, `${S.name ? htmlText(S.name) + '，' : ''}你也来了呀。`],
      ...(S.from ? [[S.from, '⭐⭐⭐⭐⭐', '5分钟前', '我住进来了，这里挺好的，你也进来吧。']] : []),
    ].map(r => rev(...r)).join(''));
    more.remove(); act(1); if (S.lv >= 2) { SFX.ding(true); clue('reviews'); }
  };
  if (is404 && S.lv >= 3) setTimeout(() => $$('#map .pin.m').forEach(p => { p.style.left = '50%'; p.style.top = '48%'; p.classList.add('red'); p.textContent = '她'; }), 3000);
}
function rev(n, star, d, t) {
  return `<div class="review"><div class="av" style="background:${/小雨|0404/.test(n) ? '#555' : '#9fc4b2'}">${htmlText(Array.from(n)[0])}</div><div><b>${htmlText(n.length < 3 ? n + '**' : n)}</b><span class="star">${star}</span><span class="date">${d}</span><p>${t}</p></div></div>`;
}

/* ---------- 聊天 ---------- */
const chat = $('#chat'), chatBody = $('#chatBody');
let chatOpened = false, chatBusy = false;
function chatMsg(html, who = 'her') {
  const av = S.lv >= 3 ? 'agent_ghost' : 'agent';
  const el = document.createElement('div'); el.className = 'msg ' + (who === 'me' ? 'me' : who === 'sys' ? 'sys' : '');
  el.innerHTML = who === 'her' ? `<img class="av" src="${P(av)}"><div class="bub">${html}</div>` : `<div class="bub">${html}</div>`;
  chatBody.appendChild(el); chatBody.scrollTop = 1e6;
}
async function herSay(lines) {
  chatBusy = true;
  for (const l of lines) {
    const ty = document.createElement('div'); ty.className = 'msg typing'; ty.innerHTML = `<img class="av" src="${P(S.lv >= 3 ? 'agent_ghost' : 'agent')}"><div class="bub">对方正在输入…</div>`;
    chatBody.appendChild(ty); chatBody.scrollTop = 1e6;
    await wait(700 + Math.min(l.length, 30) * 45 + (S.lv >= 3 ? 900 : 0));
    ty.remove(); chatMsg(l); SFX.ding(S.lv >= 3);
    if (!chat.classList.contains('open')) { setUnread(unread + 1); notifyBar(); }
  }
  chatBusy = false;
}
const isMob = () => window.innerWidth <= 900;
let unread = 0;
function setUnread(n) {
  unread = n;
  let dot = $('.sidebar [data-act="chat"] .sb-dot');
  if (!dot) { const b = $('.sidebar [data-act="chat"]'); if (b) { dot = document.createElement('i'); dot.className = 'sb-dot'; b.appendChild(dot); } }
  if (dot) { dot.textContent = unread > 9 ? '9+' : unread; dot.style.display = unread > 0 ? 'block' : 'none'; }
}
function notifyBar() {
  const plain = chatBody.lastElementChild.querySelector('.bub').textContent.slice(0, 42);
  let bar = $('.chat-bar'); if (bar) bar.remove();
  bar = document.createElement('div'); bar.className = 'chat-bar';
  bar.innerHTML = `<img src="${P(S.lv >= 3 ? 'agent_ghost' : 'agent')}">`
    + '<div class="cb-t"><b>王秀芬 <em>刚刚 · 点击回复</em></b><p></p></div><span class="cb-x">×</span>';
  bar.querySelector('p').textContent = plain;
  bar.onclick = e => { bar.remove(); if (!e.target.classList.contains('cb-x')) openChat(true); };
  document.body.appendChild(bar);
  clearTimeout(bar._t); bar._t = setTimeout(() => bar.remove(), 7500);
}
function openChat(force) {
  // 手机端如果是系统自动弹出（非用户主动点），不强行盖住半个屏幕，改发顶部轻通知条
  if (isMob() && !force && !chat.classList.contains('open')) {
    refreshChatHead();
    if (!chatOpened) {
      chatOpened = true;
      chatMsg(`${today()} ${nowStr()}`, 'sys');
      const first = S.lv >= 3 ? ['你终于来了。', '我等你很久了。'] : ['您好～我是安栖金牌经纪人王姐，很高兴为您服务 😊', '看中哪套房子可以直接问我哦～'];
      first.forEach(l => chatMsg(l));
      SFX.ding(S.lv >= 3);
      setUnread(unread + 1);
      notifyBar();
    }
    renderQuick();
    return;
  }
  chat.classList.add('open');
  setUnread(0);
  const bar = $('.chat-bar'); if (bar) bar.remove();
  refreshChatHead();
  if (!chatOpened) {
    chatOpened = true;
    chatMsg(`${today()} ${nowStr()}`, 'sys');
    herSay(S.lv >= 3 ? ['你终于来了。', '我等你很久了。'] : ['您好～我是安栖金牌经纪人王姐，很高兴为您服务 😊', '看中哪套房子可以直接问我哦～']);
  }
  renderQuick();
}
function refreshChatHead() {
  $('#chatAvatar').src = P(S.lv >= 3 ? 'agent_ghost' : 'agent');
  $('#chatStatus').textContent = S.lv >= 3 ? '最后在线：1年前 · 正在输入…' : S.lv >= 2 ? '安栖金牌经纪人 · 在线' : '安栖金牌经纪人 · 在线';
}
const QA = {
  '房子还在吗？': [['在的亲～幸福里那套今天刚降价，好多人在问呢 😊'], ['一直都在。', '它一直在等人。']],
  '为什么这么便宜？': [['房东急着出租～上一个租客突然搬走了，家具都没带走，您直接拎包入住就行'], ['因为上一个租客还没走。']],
  '可以养宠物吗？': [['可以的哦～不过之前租客养的猫，后来都不见了。'], ['不用养了。', '屋里已经有人陪你了。']],
  '什么时候能看房？': [['随时都可以，晚上也可以，我们一直都在的～'], ['现在。', '我已经在你楼下了。']],
};
const FREE = [
  ['好的亲，我帮您问一下房东～'], ['亲，您是一个人住吗？'], ['一个人住好呀，安静，没人打扰。'], ['您留个名字吧，晚上我过去找您。'],
];
const FREE3 = () => [
  [`您那边现在是 ${nowStr()}，这么晚了还在看房呀`], ['您房间的门关好了吗？'], ['别回头。'],
  [`这是上一个租客，她很喜欢这里。<img src="${P('tenant')}">`], [`她现在还在。<img src="${P('h3_bedroom_ghost')}">`],
  ['我们马上就到了。'], ['开门。'],
];
let freeI = 0, free3I = 0;
function renderQuick() {
  const qs = S.lv >= 3 ? ['你是谁？', '我不租了', '为什么这么便宜？', '什么时候能看房？'] : Object.keys(QA);
  $('#chatQuick').innerHTML = qs.map(q => `<span>${q}</span>`).join('');
  $$('#chatQuick span').forEach(s => s.onclick = () => userSay(s.textContent));
}
function userSay(text) {
  if (!text.trim() || chatBusy) return;
  chatMsg(htmlText(text), 'me'); S.chat++; save(); act();
  if (S.lv === 2 && S.chat >= 2) clue('chat');
  let r;
  if (text === '你是谁？') r = ['我是王秀芬呀。', '去年冬天，我也是在这里租的房子。'];
  else if (text === '我不租了') r = ['合同已经签好了。', `${htmlText(S.name || '你')}，你走不掉的。`];
  else if (Object.prototype.hasOwnProperty.call(QA, text)) r = QA[text][S.lv >= 3 ? 1 : 0];
  else if (S.lv >= 3) r = FREE3()[free3I++ % 7];
  else r = FREE[freeI++ % FREE.length];
  herSay(r);
}
$('#chatSend').onclick = () => { userSay($('#chatInput').value); $('#chatInput').value = ''; };
$('#chatInput').onkeydown = e => { if (e.key === 'Enter') $('#chatSend').click(); };
$('#chatX').onclick = () => {
  if (!isMob() && S.lv >= 3 && Math.random() < .6) { toast('她还没说完。'); SFX.ding(true); return; }
  chat.classList.remove('open');
};

/* ---------- 预约看房 ---------- */
function book() {
  if (S.booked) return bookDone();
  const m = modal(`<span class="m-x">×</span><div class="m-h">预约看房 · 幸福里小区 2室1厅</div><div class="m-b">
    <div class="f"><label>您的称呼</label><input id="bName" placeholder="如：张先生 / 李女士" maxlength="10"></div>
    <div class="f"><label>手机号码</label><input id="bPhone" placeholder="请输入11位手机号" maxlength="11"></div>
    <div class="f"><label>看房时间</label><select><option>今天 20:00-22:00</option><option>今天 22:00-24:00</option><option>今晚 00:00 以后</option></select></div>
    <div class="f"><label>入住人数</label><select><option>1人</option><option>2人</option><option>3人及以上</option></select></div>
    <div class="m-btns"><a class="btn" id="bGo">提交预约</a></div><p style="font-size:12px;color:#aaa;margin-top:8px">提交即代表同意《安栖租房用户协议》与《隐私政策》</p></div>`);
  m.querySelector('#bGo').onclick = () => {
    const n = m.querySelector('#bName').value.trim();
    if (!n) { toast('请填写您的称呼'); return; }
    S.name = shortName(n); save(); act(2); bookQ(0);
  };
}
const BQ = [['您是否独居？', ['是', '否']], ['您睡觉时，会关上卧室的门吗？', ['会', '不会']], ['您家里有镜子吗？', ['有', '没有']], ['此刻，您确定身后没有人吗？', ['确定', '……']]];
function bookQ(i) {
  if (i >= BQ.length) return bookDone(true);
  const [q, opts] = BQ[i];
  const m = modal(`<div class="m-h">为了给您匹配更合适的房源，请完善信息（${i + 1}/4）</div><div class="m-b"><p style="font-size:17px;margin:10px 0 16px">${q}</p>
    <div class="opts">${opts.map(o => `<span>${o}</span>`).join('')}</div></div>`);
  m.querySelectorAll('.opts span').forEach(s => s.onclick = () => { if (i === 3) SFX.whisper(1.2, .25); bookQ(i + 1); });
}
function bookDone(first) {
  S.booked = true; save();
  modal(`<span class="m-x">×</span><div class="m-h" style="color:#13b16d">✔ 预约成功</div><div class="m-b">
    <p>${htmlText(S.name)}，您好！经纪人 <b>王秀芬</b> 将于 <b>今晚 00:00</b> 准时上门，带您去看房。</p>
    <p style="margin-top:8px">届时请 <b class="blood">不要锁门</b>。</p>
    <p style="margin-top:8px;color:#999;font-size:13px">（她认得路。）</p>
    <div class="m-btns"><a class="btn" onclick="document.getElementById('modalMask').classList.remove('open')">好的</a></div></div>`);
  if (first) { SFX.ding(true); clue('book'); }
}

/* ---------- 红包 / 登录 / 杂项 ---------- */
function pack(white) {
  modal(`<span class="m-x" style="color:#fff">×</span><div class="redpack ${white ? 'white' : ''}">
    <h3>${white ? '恭喜您获得 安栖白包' : '恭喜您获得 新人租房红包'}</h3>
    <div class="amt">${white ? '444' : '488'}<small>元</small></div>
    <p>${white ? '已存入您的账户，专用于支付您的后事' : '签约任意房源可直接抵扣房租'}</p>
    <a class="btn" id="packGo">${white ? '收下' : '立即领取'}</a></div>`, 'clear');
  $('#modal').style.background = 'transparent';
  $('#packGo').onclick = () => { closeModal(); $('#modal').style.background = ''; toast(white ? '已收下。' : '领取成功！已存入“我的-卡券”'); act(); };
}
function login() {
  const m = modal(`<span class="m-x">×</span><div class="m-h">手机号登录 / 注册</div><div class="m-b">
    <div class="f"><label>手机号</label><input placeholder="请输入手机号" maxlength="11"></div>
    <div class="f"><label>验证码</label><input id="lCode" placeholder="请输入验证码" maxlength="6"></div>
    <div class="m-btns"><a class="btn line" id="lSend">获取验证码</a><a class="btn" id="lGo">登录</a></div></div>`);
  m.querySelector('#lSend').onclick = () => { toast(S.lv >= 2 ? '验证码已发送：0404（她已经替你填好了）' : '验证码已发送，请注意查收'); if (S.lv >= 2) m.querySelector('#lCode').value = '0404'; act(); };
  m.querySelector('#lGo').onclick = () => { closeModal(); toast(S.lv >= 2 ? '登录成功。欢迎回家。' : '登录成功'); act(); };
}

/* ---------- 路由 ---------- */
function route() {
  const h = location.hash || '#/';
  window.scrollTo(0, 0);
  $$('.nav a').forEach(a => a.classList.remove('on'));
  if (S.lv >= 3 && !h.startsWith('#/house/h404') && !h.startsWith('#/end')) {
    toast('您要找的房源已被租出，已为您跳转到：幸福里小区 404'); location.replace('#/house/h404'); return;
  }
  if (h.startsWith('#/house/')) { detail(h.split('/')[2]); }
  else if (h.startsWith('#/list')) { $('[data-nav=list]').classList.add('on'); list(new URLSearchParams(h.split('?').slice(1).join('?')).get('q') || ''); }
  else { $('[data-nav=home]').classList.add('on'); home(); }
  applyLv();
}
window.addEventListener('hashchange', () => { act(); route(); });

/* ---------- 全局点击 ---------- */
document.addEventListener('click', e => {
  SFX.init();
  const t = e.target.closest('[data-house],[data-go],[data-act]');
  if (!t) return;
  if (t.dataset.house) { location.hash = '#/house/' + t.dataset.house; return; }
  if (t.dataset.go) { location.hash = t.dataset.go; return; }
  const a = t.dataset.act;
  if (a === 'soon') { toast(S.lv >= 3 ? rnd(['这里什么都没有。', '别乱跑。', '她不让你去那里。']) : '该功能正在升级中，敬请期待～'); act(); }
  else if (a === 'chat') { openChat(true); act(); }
  else if (a === 'book') { book(); act(); }
  else if (a === 'pack') { pack(S.lv >= 3); }
  else if (a === 'login') { login(); act(); }
  else if (a === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else if (a === 'vr') {
    if (t.dataset.id !== 'h404') {
      if (S.lv >= 1) { toast('该房源VR异常，已为您切换至支持VR看房的幸福里 404', 2600); setTimeout(() => location.hash = '#/house/h404', 900); }
      else { toast('该房源暂不支持VR，幸福里小区支持全屋VR实景看房', 2600); act(); }
    } else if (S.lv < 3) {
      if (!S.clues || S.clues.length === 0) {
        toast('404室VR画面正在校准信号，建议先翻看上方房间实景照片与下方租客评价核实房况', 3400);
        act();
      } else {
        toast('VR信号已接通……房间里好像刚有动静，请稍候', 2600);
        setLv(3);
      }
    } else startVR();
  }
});
$('#searchBtn').onclick = () => { const q = $('#searchInput').value.trim() || `${cityLabel()}租房`; location.hash = '#/list?q=' + encodeURIComponent(q); };
$('.city').onclick = () => {
  if (S.lv >= 3) { toast('你离不开这里。'); SFX.ding(true); return; }
  const cities = Object.keys(CITY_DATA);
  const m = modal(`<span class="m-x">×</span><div class="m-h">切换城市</div><div class="m-b"><div class="opts" style="gap:8px;max-height:55vh;overflow-y:auto">${cities.map(c => `<span style="${c === CITY ? 'border-color:#13b16d;color:#13b16d;font-weight:bold' : ''}">${c}</span>`).join('')}</div></div>`);
  m.querySelectorAll('.opts span').forEach(s => s.onclick = () => {
    useCity(s.textContent);
    closeModal(); route(); applyLv(false); toast(`已切换至 ${CITY}`);
  });
};
$('#searchInput').onkeydown = e => { if (e.key === 'Enter') $('#searchBtn').click(); };
$('#appbarX').onclick = () => { $('#appbar').classList.add('hide'); if (S.lv >= 2) setTimeout(() => $('#appbar').classList.remove('hide'), 4000); };
$('#modalMask').onclick = e => { if (e.target.id === 'modalMask' && S.lv < 3) closeModal(); };
$('#resetLink').onclick = () => { if (confirm('确定清除全部浏览记录，从头开始吗？')) { resetting = true; localStorage.removeItem(KEY); location.hash = '#/'; location.reload(); } };
let maxScroll = 0;
window.addEventListener('scroll', () => { const y = window.scrollY; if (y > maxScroll + 700) { maxScroll = y; act(); } }, { passive: true });

/* ---------- 阶段控制 ---------- */
function setLv(n) {
  if (n <= S.lv) return;
  S.lv = n; S.lvAt = Date.now(); S.actsAt = S.acts; save();
  applyLv(true);
}
function check() {
  const t = (Date.now() - S.start) / 1000;
  if (S.lv === 0 && (S.acts >= 2 || t > 18)) setLv(1);
  else if (S.lv === 1 && !S.forced && (S.acts >= 5 || sinceLv() > 32)) forceRecommend();
  else if (S.lv === 2 && (S.chat >= 4 || sinceLv() > 65 || S.acts - S.actsAt >= 10)) setLv(3);
}
function forceRecommend() {
  S.forced = true; save();
  const m = modal(`<span class="m-x">×</span><img src="${P('h1_living')}" style="width:100%;height:220px;object-fit:cover"><div class="m-b">
    <p style="font-size:13px;color:#999">安栖智能匹配 · 根据您的浏览记录</p><h3 style="margin:6px 0">为您匹配到 1 套超值房源</h3>
    <p>幸福里小区 2室1厅 · ${cityLabel()}${oldDist()} · <b style="color:#fe5b4c;font-size:22px">444</b> 元/月</p>
    <div class="m-btns"><a class="btn" data-house="h404" onclick="document.getElementById('modalMask').classList.remove('open')">立即查看</a></div></div>`);
  const x = m.querySelector('.m-x'); let n = 0;
  x.onmouseenter = () => { if (n++ < 4) { x.style.right = (20 + Math.random() * 300) + 'px'; x.style.top = (8 + Math.random() * 200) + 'px'; } };
}

let applied = -1;
function applyLv(changed) {
  const c1 = S.lv === 2 && Array.isArray(S.clues) && S.clues.length >= 1;
  body.className = 'lv' + S.lv + (c1 ? ' clue1' : '');
  document.documentElement.dataset.lv = S.lv;
  document.documentElement.dataset.clue = c1 ? '1' : '0';
  const lv = S.lv;
  // 跑马灯（阶段0展示平台辟谣条，进入阶段1后切为成交动态）
  const db = $('#debunk'); if (db) db.classList.toggle('hide', lv >= 1 || S.ended);
  const ci = cityInfo();
  const msgs = [`用户 186****2271 刚刚预约了 ${ci.c[0]} 看房`, '用户 135****8812 领取了 488元 新人红包', '用户 139****0404 刚刚签约了 幸福里小区 404室', `用户 177****3390 刚刚预约了 ${ci.c[1]} 看房`];
  if (lv >= 2) msgs.push('用户 138****0404 刚刚签约了 幸福里小区 404室', '用户 138****0404 刚刚签约了 幸福里小区 404室');
  if (lv >= 3) msgs.splice(0, 9, `用户 ${visitName()} 正在浏览 幸福里小区 404室`, '用户 林小雨 已入住 幸福里小区 404室 · 1年', '用户 王秀芬 已入住 幸福里小区 404室 · 1年', `用户 ${visitName()} 即将入住 幸福里小区 404室`);
  if (S.ended) msgs.unshift(`用户 ${visitName()} 已成功入住 幸福里小区 404室，给出了五星好评`);
  $('#tickerTrack').innerHTML = msgs.map(m => `<span>${htmlText(m)}</span>`).join('');
  $('#ticker').classList.toggle('show', lv >= 1 || S.ended);
  // 文本替换（进404发现第1条线索后就开始慢慢变成安息/永久住/冥ICP备）
  $('#logoName').textContent = (lv >= 3 || c1) ? '安息' : '安栖';
  $('#logoSub').textContent = (lv >= 3 || c1) ? '真房源 · 永久住' : '真房源 · 放心住';
  $('#icp').textContent = (lv >= 3 || c1) ? '冥ICP备00000404号' : 'ICP备13044044号-1';
  $('#gongan').textContent = lv >= 3 ? '阴公网安备 44444444444444号' : '公网安备 11010502030404号';
  const qh = $('#qhLink');
  if (qh) { qh.textContent = lv >= 3 ? '青槐新村404（监控异常）' : '青槐新村社区便民网'; qh.classList.toggle('qh-alert', lv >= 3); }
  $('#cityName').textContent = lv >= 3 ? '你身后' : cityLabel();
  $('#appbarTxt').innerHTML = lv >= 2 ? '下载安栖APP，<b>她就能一直跟着你</b>' : '下载安栖APP，看房更方便，新用户首单立减 <b>500元</b>';
  $('#searchInput').placeholder = lv >= 3 ? '你逃不掉的' : lv >= 2 ? '请输入区域、商圈或小区名开始找房（幸福里）' : '请输入区域、商圈或小区名开始找房';
  document.title = lv >= 3 ? '安息 - 你的新家' : c1 ? '安息租房 - 幸福里小区 404' : S.ended ? `【${cityLabel()}租房】幸福里小区 444元/月 房东急租 - 安栖租房` : `【${cityLabel()}急租】两室一厅只要444元/月？房东急租拎包入住 - 安栖租房`;
  refreshChatHead();
  if (!changed || applied === lv) { applied = lv; return; }
  applied = lv;
  // 进入新阶段的一次性事件
  if (lv === 1 && !S.tip) {
    S.tip = true; save();
    setTimeout(() => {
      if (S.lv !== 1) return;
      const d = document.createElement('div'); d.className = 'float-tip';
      d.innerHTML = `<span class="x">×</span><img src="${P('h1_living')}"><div>🔥 捡漏提醒：<b>幸福里 2室1厅 444元/月</b><br><small style="color:#fe5b4c">房东急租 · 原租客刚搬走 · 点击抢看 &gt;</small></div>`;
      d.onclick = e => { d.remove(); if (!e.target.classList.contains('x')) location.hash = '#/house/h404'; };
      document.body.appendChild(d); SFX.ding();
    }, 3000);
  }
  if (lv === 2) {
    // 刚进404 7秒后，Logo 极短暂闪一下“安息”又变回“安栖”，制造“刚才是不是眼花了”的怀疑
    setTimeout(() => {
      if (S.lv === 2 && (!S.clues || S.clues.length === 0)) {
        const ln = $('#logoName'); if (ln) { ln.textContent = '安息'; setTimeout(() => { if (S.lv === 2 && (!S.clues || S.clues.length === 0)) ln.textContent = '安栖'; }, 700); }
      }
    }, 7000);
    setTimeout(() => { if (S.lv === 2 && !chat.classList.contains('open')) { openChat(); } }, 16000);
  }
  if (lv === 3) enterLv3();
  if ((lv === 1 || lv === 2) && (location.hash === '' || location.hash === '#/')) home();
}

/* ---------- 第3阶段：全面异化 ---------- */
let lv3Timer = null, idleT = null, vrCountdown = false;
function enterLv3() {
  body.classList.add('flicker'); setTimeout(() => body.classList.remove('flicker'), 600);
  SFX.staticBurst(0.5, 0.25); SFX.droneOn(1); SFX.musicBox(true, 0.07);
  try { history.pushState(null, '', location.href); history.pushState(null, '', location.href); } catch (e) { }
  if (!location.hash.startsWith('#/house/h404')) location.hash = '#/house/h404'; else detail('h404');
  refreshChatHead();
  setTimeout(() => { openChat(); if (!chatBusy) herSay([`${htmlText(visitName())}，你还在看吗？`, '门已经为你打开了。']); renderQuick(); }, 3000);
  setTimeout(() => { if (S.lv === 3 && !chatBusy) { openChat(); herSay(['我把404的实时VR画面打开了，进来吧。<br><a class="btn" data-act="vr" data-id="h404" style="display:block;text-align:center;margin-top:8px;background:#8f0d0d">▶ 进入 404 实时VR画面</a>']); } }, 14000);
}
window.addEventListener('popstate', () => {
  if (S.lv >= 3) { try { history.pushState(null, '', location.href); } catch (e) { } toast('您要去哪里？房子在这里。'); SFX.ding(true); }
});
let resetting = false;
$('#game-lobby')?.addEventListener('click', e => {
  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) resetting = true;
});
window.addEventListener('pageshow', () => { resetting = false; });
window.addEventListener('beforeunload', e => { if (S.lv === 3 && !resetting) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('mousemove', () => {
  $('#lurker').classList.remove('on'); clearTimeout(idleT);
  if (S.lv === 3) idleT = setTimeout(() => { $('#lurker').classList.add('on'); SFX.whisper(1.5, .12); }, 7000);
});
const blurTitles = ['(1) 您有一条新消息', '别走', '你还在吗？', '我在你后面', '回来'];
let titleSaved = '';
document.addEventListener('visibilitychange', () => {
  if (S.lv < 2) return;
  if (document.hidden) { titleSaved = document.title; document.title = S.lv >= 3 ? rnd(blurTitles.slice(1)) : blurTitles[0]; }
  else { document.title = titleSaved || document.title; if (S.lv >= 3) { toast('你回来了。'); SFX.ding(true); } }
});

// 系统弹窗
async function sysDialog() {
  if ($('#modalMask').classList.contains('open') || S.dialogs >= 4) return;
  S.dialogs++; save();
  let bat = null; try { if (navigator.getBattery) bat = await navigator.getBattery(); } catch (e) { }
  const list = [
    ['检测到您的房间内有 <b>2</b> 人，是否为您推荐双人房源？', ['是', '是']],
    ['您的屏幕太亮了。<br>她看得见你。是否调暗？', ['调暗', '不']],
    ['请不要关闭页面。<br>上一个关闭页面的用户，后来再也没有登录过。', ['我知道了']],
    [bat ? `您的设备电量剩余 <b>${Math.round(bat.level * 100)}%</b>。<br>${bat.charging ? '充电线请不要拔。灯灭了，她就来了。' : '撑不到天亮了。'}` : `现在是 <b>${nowStr()}</b>。<br>您家的灯，还亮着吗？`, ['……']],
  ];
  const [msg, btns] = list[(S.dialogs - 1) % list.length];
  const m = modal(`<div class="m-h">安栖提示</div><div class="m-b"><p style="font-size:16px;line-height:1.9">${msg}</p><div class="m-btns">${btns.map(b => `<a class="btn">${b}</a>`).join('')}</div></div>`);
  SFX.ding(true);
  m.querySelectorAll('.btn').forEach(b => b.onclick = () => {
    if (b.textContent === '调暗') { document.documentElement.style.filter = 'saturate(.4) brightness(.72) contrast(1.1) sepia(.15)'; }
    closeModal(); act();
  });
}
// 文字腐化
const WORDS = ['她在看你', '别回头', '欢迎回家', '404', '你也来了', '门没锁', '在你后面', '不要开灯'];
function corrupt() {
  const els = $$('#app h5, #app .meta, #app p, #app li, #app h4, #app .d-desc p').filter(e => { const r = e.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight && e.textContent.length < 120; });
  if (!els.length) return;
  const el = rnd(els), old = el.innerHTML;
  el.textContent = rnd(WORDS).repeat(1 + Math.floor(Math.random() * 3)); el.classList.add('blood');
  setTimeout(() => { if (document.contains(el)) { el.innerHTML = old; el.classList.remove('blood'); } }, 450 + Math.random() * 500);
}

/* ---------- 心跳循环 ---------- */
setInterval(() => {
  check();
  const lv = S.lv;
  if (lv === 1 && Math.random() < 0.04) {   // 只在第一套房源上做阳台人影的细微闪烁，不碰幸福里404
    const im = $('#grid .card[data-house="n1"] .pic img'); if (im) { im.src = P('n1_living_ghost'); setTimeout(() => { if (document.contains(im)) im.src = P('n1_living'); }, 180); }
  }
  if (lv === 2) {
    const hasClue = Array.isArray(S.clues) && S.clues.length >= 1;
    if (hasClue && Math.random() < 0.02) { body.classList.add('flicker'); setTimeout(() => body.classList.remove('flicker'), 400); }
    if (hasClue && Math.random() < 0.015) corrupt();
    const v = $('#viewers'); if (v && location.hash.includes('h404') && hasClue && Math.random() < .08) v.textContent = `已有 ${13 + Math.floor(Math.random() * 3)} 人关注 · 1 人正在你身后看`;
  }
  if (lv === 3) {
    if (Math.random() < 0.16) corrupt();
    if (Math.random() < 0.05) { body.classList.add('flicker'); SFX.staticBurst(0.15, 0.12); setTimeout(() => body.classList.remove('flicker'), 500); }
    if (Math.random() < 0.05) SFX.knock(3, .34, .5);
    if (sinceLv() > 10 && Math.random() < 0.07) sysDialog();
    if (sinceLv() > 22 && !S.white && S.dialogs >= 1 && Math.random() < 0.07 && !$('#modalMask').classList.contains('open')) { S.white = true; save(); pack(true); }
    if (Math.random() < 0.04) window.scrollBy({ top: 120, behavior: 'smooth' });
    const mi = $('#missingImg');
    if (mi && Math.random() < 0.09) {
      mi.src = P('h1_xiaoyu');
      setTimeout(() => { if (document.contains(mi)) mi.src = P('tenant'); }, 520);
    }
    const pr = $('#dPrice'); if (pr && Math.random() < .08) pr.innerHTML = rnd(['444 <small>元/月</small>', '4 <small>条命/月</small>', '0 <small>元/永久</small>', '你 <small>/月</small>']);
    if (sinceLv() > 50 && !vrCountdown) {
      vrCountdown = true;
      toast('VR实景看房通道已敞开，点击「进入404（她在等你）」即可推门进去', 3800);
    }
  }
  if (lv === 3 && S.ended) {}
}, 1000);

async function autoVR() {
  vrCountdown = true;
  const m = modal(`<div class="m-h">安栖VR看房</div><div class="m-b"><p style="font-size:16px">检测到您犹豫太久了。<br>她决定直接带您进去看看。</p><p style="font-size:40px;text-align:center;color:#a00" id="cd">5</p></div>`);
  for (let i = 5; i > 0; i--) { m.querySelector('#cd').textContent = i; SFX.knock(1, .3, .7); await wait(1000); }
  closeModal(); startVR();
}

/* ---------- 噪点画布 ---------- */
const nc = $('#noise'), nx = nc.getContext('2d');
function noiseLoop() {
  if (S.lv >= 3 || document.documentElement.dataset.clue === '1' || $('#vr').classList.contains('open')) {
    nc.width = 240; nc.height = 135;
    const id = nx.createImageData(240, 135);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    nx.putImageData(id, 0, 0);
  }
  setTimeout(() => requestAnimationFrame(noiseLoop), 60);
}
noiseLoop();

/* ---------- VR 看房（第4阶段） ---------- */
const vr = $('#vr');
let vrStart = 0, vrRec = null;
function startVR() {
  S.lv = 4; save(); closeModal(); chat.classList.remove('open');
  body.className = 'lv4'; document.documentElement.dataset.lv = 4; document.documentElement.style.filter = ''; $('#lurker').classList.remove('on');
  SFX.init(); SFX.musicBox(false); SFX.droneOn(1.4);
  vr.classList.add('open');
  vr.innerHTML = `<div class="vr-load"><div class="vr-logo">安栖 VR · 沉浸式看房</div><div style="font-size:20px" id="vrT">正在加载：幸福里小区 7号楼 404室</div>
    <div class="bar"><i id="vrBar"></i></div><div class="tip" id="vrTip">建议佩戴耳机，体验更佳</div></div>`;
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(99, p + Math.random() * 9); $('#vrBar').style.width = p + '%';
    if (p >= 99) {
      clearInterval(iv);
      setTimeout(() => {
        $('#vrT').innerHTML = '<span style="color:#b11">她已经在里面等你了。</span>'; $('#vrBar').style.background = '#a00'; SFX.whisper(1.8, .2);
        $('#vrTip').insertAdjacentHTML('afterend', '<a class="btn" id="vrIn" style="background:#7a0d0d">进入房间</a>');
        $('#vrIn').onclick = () => { try { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); r && r.catch && r.catch(() => { }); } catch (e) { } scene(0); };
      }, 1600);
    }
  }, 220);
}
const SCENES = [
  { img: 'h5_stair', label: '楼道 · 4层', hot: [50, 50, '进入 404'], sub: '（声控灯坏了。门缝里有光。）' },
  { img: 'v1_dark_living', alt: 'h1_living', label: '客厅 · 18㎡', hot: [84, 55, '走廊'], ghost: [80, 41], sub: '（客厅很安静。滑动屏幕移动手电筒。）' },
  { img: 'v2_hallway', label: '走廊', hot: [50, 48, '卧室'], sub: '（地上……是头发吗？）' },
  { img: 'v3_bedroom', label: '卧室 · 12㎡', sub: '' },
];
let mx = innerWidth / 2, my = innerHeight / 2;
vr.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; moveLight(); });
vr.addEventListener('touchstart', e => { if (e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; moveLight(); } }, { passive: true });
vr.addEventListener('touchmove', e => { if (e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; moveLight(); } }, { passive: true });
function moveLight() {
  const d = vr.querySelector('.vr-dark'); if (d) { d.style.setProperty('--x', mx + 'px'); d.style.setProperty('--y', my + 'px'); }
  const im = vr.querySelector('.vr-scene img.main'); if (im) im.style.transform = `translate(${(innerWidth / 2 - mx) / 40}px,${(innerHeight / 2 - my) / 40}px)`;
}
async function scene(i) {
  const s = SCENES[i];
  if (i === 0) { vrStart = Date.now(); clearInterval(vrRec); vrRec = setInterval(() => { const r = vr.querySelector('#rec'); if (r) { const t = Math.floor((Date.now() - vrStart) / 1000); r.textContent = `● REC 00:${pad(Math.floor(t / 60))}:${pad(t % 60)}`; } }, 500); }
  vr.innerHTML = `<div class="vr-scene"><img class="main" src="${P(s.img)}">${s.alt ? `<img class="alt" src="${P(s.alt)}" style="opacity:0;filter:brightness(.18) saturate(.3) hue-rotate(180deg)">` : ''}</div>
    <div class="vr-dark"></div>
    <div class="vr-ui"><b>${s.label}</b>安栖VR看房 · 幸福里小区 7号楼 404<br><span class="rec" id="rec">● REC</span><br>当前在线看房：<span id="vrN">${i >= 2 ? 2 : 1}</span> 人</div>
    <div class="vr-sub" id="vrSub">${s.sub}</div>`;
  moveLight();
  if (s.hot) {
    const h = document.createElement('div'); h.className = 'vr-hot'; h.style.left = s.hot[0] + '%'; h.style.top = s.hot[1] + '%'; h.innerHTML = `<span>${s.hot[2]}</span>`;
    h.style.opacity = 0; vr.appendChild(h); setTimeout(() => h.style.opacity = 1, i === 0 ? 4500 : 2500);
    h.onclick = async () => { h.remove(); for (let k = 0; k < 4; k++) { SFX.step(.3); await wait(380); } vr.querySelector('.vr-dark').classList.add('off'); await wait(500); scene(i + 1); };
  }
  const sub = t => { const el = vr.querySelector('#vrSub'); if (el) el.textContent = t; };
  if (i === 0) { await wait(2500); SFX.knock(3, .4, .8); sub('……有人在里面敲门？'); }
  if (i === 1) {
    SFX.whispers(true, 6000);
    let hold = 0; const gx = s.ghost[0] / 100, gy = s.ghost[1] / 100;
    const iv = setInterval(() => {
      if (!vr.querySelector('.alt')) return clearInterval(iv);
      const dx = mx / innerWidth - gx, dy = my / innerHeight - gy;
      if (Math.hypot(dx, dy) < 0.09) { hold++; if (hold > 6) { clearInterval(iv); SFX.whisper(1.6, .35); vr.querySelector('.alt').style.opacity = 1; vr.querySelector('.main').style.opacity = 0; sub('……刚才那里，是不是站着一个人？'); } } else hold = Math.max(0, hold - 1);
    }, 200);
    setTimeout(() => { if (vr.querySelector('.alt') && vr.querySelector('.main').style.opacity !== '0') sub('（墙角好像有什么东西。用手电照照看。）'); }, 6000);
  }
  if (i === 2) { SFX.heartbeat(78); await wait(3000); sub('“进来呀。”'); SFX.speak('进来呀', { rate: .5, pitch: .1, volume: .6 }); }
  if (i === 3) final();
}
async function final() {
  SFX.whispers(false); SFX.heartbeat(120);
  const dark = vr.querySelector('.vr-dark'), sub = vr.querySelector('#vrSub');
  await wait(3500);
  sub.textContent = `“${visitName()}，你终于来了。”`; SFX.speak(`${S.name || ''}你终于来了`, { rate: .55, pitch: .1, volume: .8 });
  await wait(3200);
  for (let k = 0; k < 6; k++) { dark.classList.toggle('off'); await wait(80 + Math.random() * 220); }
  dark.classList.add('off'); sub.textContent = ''; SFX.heartStop(); SFX.droneOff(true);
  await wait(2600);                       // 死寂
  const j = document.createElement('div'); j.className = 'jump'; j.innerHTML = `<img src="${P('face')}">`; vr.appendChild(j);
  j.style.display = 'block'; SFX.scream(); vr.classList.add('shake');
  const fl = $('#flash'); fl.style.background = '#fff'; fl.style.opacity = 1; setTimeout(() => { fl.style.background = '#a00'; fl.style.opacity = .5; }, 70); setTimeout(() => fl.style.opacity = 0, 400);
  await wait(1700);
  vr.classList.remove('shake'); j.remove(); vr.innerHTML = ''; SFX.staticBurst(1.2, .35);
  await wait(1400);
  clearInterval(vrRec); ending();
}

function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).catch(() => copyFallback(txt));
  return Promise.resolve(copyFallback(txt));
}
function copyFallback(txt) {
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove();
}
const SHARE_SCRIPTS = [
  '帮我看眼一个月四百块那套是不是骗人的，看着挺离谱的',
  '卧槽刚刷到个租房网，444一个月还专门挂辟谣声明，你帮我瞅瞅啥情况',
  '帮我看下幸福里444那套房，照片多点几下怎么感觉不对劲，是我眼花了吗',
  '你帮我看看那个四百多块两室一厅的评价，越翻越离谱，是不是恶搞网站啊',
  '给你看个离谱租房网，点进那个444块的房看看，记得开声音哈哈',
  ''
];
function showShare(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  let cur = 0;
  const baseUrl = /^https?:$/.test(location.protocol) ? new URL('./', location.href).href : 'https://stuart-promise.github.io/234%E5%AE%A0%E7%89%A9%E4%B9%8B%E5%AE%B6/anjia-zufang/';
  const m = modal(`<span class="m-x">×</span><div class="m-h" style="text-align:center">🔗 寻找下一位租客</div><div class="m-b">
    <p style="font-size:12px;color:#666;line-height:1.6;margin-bottom:10px">把链接甩给朋友，他打开还是完全正常的租房网首页，但 444 房源里会悄悄出现你的名字…</p>
    <div class="f" style="margin-bottom:8px"><label>留给朋友看到的称呼（留空则不带名字）</label><input id="shName" placeholder="比如：小王 / 你平时外号" maxlength="10"></div>
    <div style="font-size:12px;color:#666;margin-bottom:4px">挑一句装无辜发给朋友，先别剧透：</div>
    <div class="share-list">${SHARE_SCRIPTS.map((t, i) => `<div class="share-opt ${i ? '' : 'on'}" data-i="${i}">${t || '（不带话，只复制专属链接）'}</div>`).join('')}</div>
    <div class="share-preview" id="shPrev"></div>
    <div class="m-btns"><a class="btn" id="shCopy" style="background:#8f0d0d">一键复制，发给下一个倒霉蛋</a></div>
  </div>`);
  const nameField = m.querySelector('#shName');
  nameField.value = S.name;
  const build = () => {
    const nm = shortName(nameField.value);
    const url = nm ? `${baseUrl}?from=${encodeURIComponent(nm)}` : baseUrl;
    const text = SHARE_SCRIPTS[cur] ? `${SHARE_SCRIPTS[cur]}\n${url}` : url;
    m.querySelector('#shPrev').textContent = text;
    return text;
  };
  build();
  m.querySelector('#shName').oninput = build;
  m.querySelectorAll('.share-opt').forEach(o => o.onclick = () => {
    m.querySelectorAll('.share-opt').forEach(x => x.classList.remove('on'));
    o.classList.add('on'); cur = +o.dataset.i; build();
  });
  m.querySelector('#shCopy').onclick = async () => {
    await copyText(build());
    toast('已复制！切回微信 / QQ 直接粘贴发给朋友吧 😈', 2600);
    closeModal();
  };
}

function showGzh(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  modal(`<span class="m-x">×</span><div class="m-h" style="text-align:center">📡 关注作者 · 奈非天的创作实验室</div><div class="m-b" style="text-align:center">
    <p style="font-size:13px;color:#666;line-height:1.7;margin-bottom:10px">关注看下一期奇怪、好玩、微恐的原创互动小网页<br>回复 <b>404</b> 可解锁全部隐藏细节与攻略</p>
    <img src="img/gzh_qr.jpg" alt="奈非天的创作实验室" style="width:230px;max-width:78%;margin:0 auto;border-radius:10px;border:1px solid #eee">
    <p style="font-size:12px;color:#aaa;margin-top:8px">微信长按识别或扫码关注</p></div>`);
}

function showTip(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  modal(`<span class="m-x">×</span><div class="m-h" style="text-align:center">🕯️ 破财消灾 · 请作者喝杯蜜雪冰城</div><div class="m-b" style="text-align:center">
    <p style="font-size:13px;color:#666;line-height:1.7">请作者喝杯蜜雪冰城压压惊，今晚就不去敲你门了（随缘，不扫也能走 🧋）</p>
    <div class="tip-grid">
      <div class="tip-box wx"><img src="img/pay_wx.png" alt="微信打赏"><b>微信扫码 ¥5</b></div>
      <div class="tip-box ali"><img src="img/pay_ali.png" alt="支付宝打赏"><b>支付宝扫码 ¥5</b></div>
    </div>
    <p style="font-size:12px;color:#aaa;margin-top:6px">手机端可长按或截屏扫码 · 感谢支持！</p></div>`);
}

/* ---------- 结局（第5阶段） ---------- */
async function ending() {
  S.lv = 5; save();
  vr.classList.remove('open'); body.className = 'lv5';
  $$('.topbar,.header,.footer,.sidebar,.appbar').forEach(e => e.style.display = 'none');
  document.title = '安息之家';
  const d = new Date(), date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  window.scrollTo(0, 0);
  app.innerHTML = `<div class="end">
    <h1>安 息 之 家</h1><div class="sub">真房源 · 永久住</div>
    <div class="end-card"><h2>房屋租赁合同</h2>
      <p>出租方（甲方）：<u>王秀芬</u></p>
      <p>承租方（乙方）：<u>${htmlText(visitName())}</u></p>
      <p>房屋地址：<u>${cityAddr()} 7 号楼 404 室</u></p>
      <p>租　　期：自 <u>${date}</u> 起，至 <u>永 久</u></p>
      <p>月 租 金：<u>肆佰肆拾肆元整（¥444）</u>　支付方式：<u>押一付一</u></p>
      <p>特别约定：乙方入住后不得搬离；乙方不得在夜间开灯；乙方须陪伴上一位租客，直到下一位租客到来。</p>
      ${S.from ? `<p>转租交接：由上一位租客 <u>${htmlText(S.from)}</u> 推荐入住，<u>${htmlText(S.from)}</u> 已成功搬离。</p>` : ''}
      <p>签约时间：<u>${date} ${nowStr()}</u></p>
      <div class="seal" id="seal"><span>★</span>安栖租房<b>已入住</b>合同专用章</div>
    </div>
    <div class="end-photo">
      <figure><img src="${P('agent_ghost')}"><figcaption>经纪人 · 王秀芬<br>1971 — 2025</figcaption></figure>
      <figure><img src="${P('tenant')}"><figcaption>上一位租客 · 林小雨<br>2001 — 2025</figcaption></figure>
      <figure><div style="width:220px;height:270px;border:10px solid #111;outline:2px solid #333;background:#0a0a0a;display:flex;align-items:center;justify-content:center;color:#444;letter-spacing:4px">照片待上传</div><figcaption>新租客 · ${htmlText(visitName())}<br>？ — ${d.getFullYear()}</figcaption></figure>
    </div>
    <div class="typer" id="typer"></div>
    <div class="end-tip" id="endTip"><a href="javascript:;" id="endShareBtn" class="share-btn">🔗 寻找下一位租客（甩给朋友替你住）</a><a href="javascript:;" id="endTipBtn">🕯️ 请作者喝杯蜜雪冰城</a><a href="javascript:;" id="endGzhBtn">📡 关注作者公众号</a></div>
    <section class="end-series" id="endSeries">
      <div class="es-head">
        <h3>📂 同系列中式微恐站点 · 作者其他作品</h3>
        <p>喜欢这种从日常慢慢滑入恐怖片的感觉？另一处异常站点已开放访问：</p>
      </div>
      <div class="es-grid">
        <div class="es-card es-cur">
          <span class="es-badge">当前站点 · 已通关</span>
          <div class="es-title">安栖租房网（幸福里 404）</div>
          <p class="es-desc">444元/月急租房源、失联原租客评价，以及夜间全屋 VR 看房终局。</p>
        </div>
        <a class="es-card es-next" href="https://qinghuai-community.pages.dev" target="_blank" rel="noopener">
          <span class="es-badge">同城站点 · 推荐体验</span>
          <div class="es-title">青槐新村 · 智慧社区便民服务网</div>
          <p class="es-desc">表面普通的中国老小区物业网：停水通知、失物招领旧合影、实时四路监控，以及第一人称防盗门猫眼终局。</p>
          <span class="es-cta">前往体验青槐新村 →</span>
        </a>
        <div class="es-card es-soon">
          <span class="es-badge">筹备预告</span>
          <div class="es-title">更多异常站点收录中…</div>
          <p class="es-desc">同系列更多作品筹备中</p>
        </div>
      </div>
    </section>
    <div class="end-foot" id="endFoot" style="opacity:0">（点击任意处，离开）</div>
  </div>`;
  $('#endShareBtn').onclick = showShare;
  $('#endGzhBtn').onclick = showGzh;
  $('#endTipBtn').onclick = showTip;
  SFX.droneOn(.8);
  await wait(2500); $('#seal').classList.add('on'); SFX.knock(1, .3, 1);
  await wait(1500);
  const txt = `欢迎回家，${visitName()}。`, ty = $('#typer');
  SFX.speak(`欢迎回家，${S.name || ''}`, { rate: .5, pitch: .1, volume: 1 });
  for (const ch of txt) { ty.textContent += ch; await wait(260); }
  await wait(2200); $('#endTip').style.opacity = 1;
  const es = $('#endSeries'); if (es) { es.style.opacity = 1; es.classList.add('show'); }
  await wait(1200); $('#endFoot').style.transition = 'opacity 2s'; $('#endFoot').style.opacity = 1;
  let tries = 0;
  const leave = async e => {
    if ($('#modalMask').classList.contains('open') || (e && e.target.closest('#endTip,#endSeries,#modal'))) return;
    tries++;
    if (tries === 1) { $('#endFoot').textContent = '（门锁住了。）'; SFX.knock(3, .3, 1); return; }
    if (tries === 2) { $('#endFoot').textContent = '（再试一次？）'; return; }
    document.removeEventListener('click', leave);
    SFX.stopAll(); try { document.exitFullscreen && document.fullscreenElement && document.exitFullscreen(); } catch (e) { }
    $('#flash').style.background = '#000'; $('#flash').style.transition = 'opacity 2s'; $('#flash').style.opacity = 1;
    await wait(2500);
    S.lv = 0; S.ended = true; S.lvAt = Date.now(); S.start = Date.now(); S.acts = 0; S.chat = 0; S.dialogs = 0; S.clues = []; S.otherViews = 0; S.agentNudged = false; S.tip = false; S.forced = false; lv3Pending = false; save();
    $$('.topbar,.header,.footer,.sidebar,.appbar').forEach(e => e.style.display = '');
    document.documentElement.style.filter = ''; applied = -1; chatOpened = false; chatBody.innerHTML = '';
    location.hash = '#/'; route();
    $('#flash').style.opacity = 0; setTimeout(() => $('#flash').style.transition = '', 2100);
    setTimeout(() => {
      toast(`欢迎回来！为您推荐：幸福里小区 444元/月 · 房东急租`, 3500);
      if (!$('.tip-float')) {
        const tf = document.createElement('div'); tf.className = 'tip-float';
        tf.innerHTML = `<span style="font-size:22px">😈</span><div><b style="font-size:13px">吓到了？找个朋友替你住</b><br><small style="color:#888;line-height:1.7"><a class="tf-sh" style="color:#c0392b;font-weight:bold">甩给朋友</a> · <a class="tf-tp" style="color:#13b16d">蜜雪冰城</a> · <a class="tf-gzh" style="color:#2b6cb0">关注作者</a><br><a href="https://qinghuai-community.pages.dev" target="_blank" rel="noopener" style="color:#8f0d0d;font-weight:bold">玩同系列：青槐新村</a></small></div><span class="x">×</span>`;
        tf.onclick = ev => { if (ev.target.closest('a[href]')) return; if (ev.target.classList.contains('x')) tf.remove(); else if (ev.target.classList.contains('tf-tp')) showTip(ev); else if (ev.target.classList.contains('tf-gzh')) showGzh(ev); else showShare(ev); };
        document.body.appendChild(tf);
      }
    }, 2500);
  };
  setTimeout(() => document.addEventListener('click', leave), 100);
}

/* ---------- 启动 ---------- */
route();
applyLv(false);
detectCity();
if (S.lv === 3) { try { history.pushState(null, '', location.href); } catch (e) { } setTimeout(() => toast(`欢迎回来，${visitName()}。她一直在等你。`, 3000), 800); document.addEventListener('click', function f() { SFX.droneOn(1); SFX.musicBox(true, .07); document.removeEventListener('click', f); }); }
if (S.ended) setTimeout(() => toast(`欢迎回来，${visitName()}。`, 2500), 800);
})();
