(() => {
  'use strict';

  const weeks = [
    {
      id: 1,
      title: '第一次见面',
      goal: '读准五个元音，用两句话说出名字和家乡。',
      lesson: '依次读 a、e、i、o、u，每个音都保持同一个口形。读 Luna 时，把 Lu 和 na 分开慢读，再连起来。介绍名字可以说 Me llamo Luna；介绍来自哪里用 ser de。说自己用 soy，问对方用 eres，介绍另一个人用 es。',
      examples: [
        ['Me llamo Lin y soy de Nankín.', '我叫林，来自南京。'],
        ['¿De dónde eres, Luna? — Soy de Lugo.', '卢娜，你来自哪里？——我来自卢戈。']
      ],
      words: [['hola', '你好'], ['el nombre', '名字'], ['la ciudad', '城市'], ['mucho gusto', '很高兴认识你']],
      questions: [
        {prompt: 'Luna 分成哪两个音节？', choices: ['Lun-a', 'Lu-na', 'L-u-na'], answer: 'Lu-na', why: '两个元音之间只有一个 n，n 跟后面的 a 合成第二个音节。'},
        {prompt: '填一个词。Yo ___ de Nankín.', answer: 'soy', why: '主语 yo 对应 soy，soy de 后面可以接家乡。'},
        {prompt: '介绍好友的家乡时，哪句合适？', choices: ['Mi amiga eres de Lima.', 'Mi amiga soy de Lima.', 'Mi amiga es de Lima.'], answer: 'Mi amiga es de Lima.', why: 'mi amiga 指第三人称单数，ser 用 es。'}
      ],
      task: '在语言交换会上用西语介绍名字和家乡，再问对方来自哪里。',
      model: 'Hola, me llamo Kai. Soy de Shanghái. ¿De dónde eres?'
    },
    {
      id: 2,
      title: '在课堂上开口',
      goal: '描述同学在做什么，听不清时请老师再说一次。',
      lesson: '把 hablar 的 -ar 去掉，得到 habl-，再按说话对象加词尾。说自己是 hablo，说你是 hablas，说她是 habla，说我们是 hablamos。否定时把 no 放在变位动词前。想让对方放慢语速，可以直接说 Más despacio, por favor。',
      examples: [
        ['En clase practicamos los números.', '我们在课堂上练习数字。'],
        ['¿Puedes repetir la pregunta, por favor?', '请你把问题再说一遍，好吗？']
      ],
      words: [['la pregunta', '问题'], ['hablar', '说话'], ['escuchar', '听'], ['más despacio', '慢一点']],
      questions: [
        {prompt: '你想请老师把问题再说一次，选哪句？', choices: ['¿De dónde eres?', '¿Puedes repetir la pregunta?', '¿Cómo te llamas?'], answer: '¿Puedes repetir la pregunta?', why: 'repetir 表示“重复”，la pregunta 是想再听一次的内容。'},
        {prompt: '用 escuchar 的正确形式填空。Nosotros ___ a la profesora.', answer: 'escuchamos', why: 'nosotros 的规则 -ar 词尾是 -amos。'},
        {prompt: '“我不说法语”怎么说？', choices: ['Hablo no francés.', 'No hablas francés.', 'No hablo francés.'], answer: 'No hablo francés.', why: 'yo 对应 hablo，否定词 no 紧挨在动词前面。'}
      ],
      task: '用西语写一件你在课堂上做的事，再向同桌提出一个请求。',
      model: 'En clase practico español. ¿Puedes hablar más despacio, por favor?'
    },
    {
      id: 3,
      title: '用一张照片介绍家人',
      goal: '说清家庭关系、年龄和一个人的特点。',
      lesson: '西语说年龄用 tener 加数字和 años，例如 tengo doce años。介绍一件东西归谁，mi 用在单数名词前，mis 用在复数名词前。形容词也要和它描述的人搭配，hermano tranquilo 换成 hermana 就是 hermana tranquila。',
      examples: [
        ['Mi abuela tiene setenta años.', '我的外婆七十岁。'],
        ['Mis primos viven en un pueblo pequeño.', '我的堂表兄弟姐妹们住在一个小镇上。']
      ],
      words: [['la hermana', '姐妹'], ['el abuelo', '祖父或外祖父'], ['la familia', '家庭'], ['tranquilo', '安静的、平静的']],
      questions: [
        {prompt: '怎么说“我十五岁”？', choices: ['Soy quince años.', 'Tengo quince años.', 'Estoy quince años.'], answer: 'Tengo quince años.', why: '说年龄使用 tener，第一人称单数是 tengo。'},
        {prompt: '用 mi 的单数或复数形式填空。___ hermanas viven aquí.', answer: 'mis', why: 'hermanas 是复数，所以 mi 也要变为 mis。'},
        {prompt: '选出整句搭配正确的介绍。', choices: ['Mi hermana es tranquila.', 'Mi hermana es tranquilos.', 'Mi hermana es tranquilo.'], answer: 'Mi hermana es tranquila.', why: 'hermana 是阴性单数，这里的形容词是 tranquila。'}
      ],
      task: '选一个真实或虚构的家庭成员，用西语介绍与你的关系、年龄和性格。',
      model: 'Nora es mi hermana. Tiene diez años. Es tranquila.'
    },
    {
      id: 4,
      title: '从车站找到图书馆',
      goal: '问街区里有没有某个地方，并指出它的位置。',
      lesson: '还在找“一家药店”时，用 hay una farmacia 来问是否存在。两个人已经在说同一家药店时，用 está 来定位它。主语是两个地点时改用 están。说“在……旁边”用 al lado de，de 遇到阳性单数冠词 el 合成 del。',
      examples: [
        ['¿Hay una biblioteca cerca de aquí?', '这附近有图书馆吗？'],
        ['La biblioteca está al lado del mercado.', '图书馆在市场旁边。']
      ],
      words: [['la estación', '车站'], ['la esquina', '街角'], ['el mercado', '市场'], ['enfrente de', '在……对面']],
      questions: [
        {prompt: '第一次问这里有没有邮局，哪句合适？', choices: ['¿Está una oficina de correos por aquí?', '¿Hay una oficina de correos por aquí?', '¿Es una oficina de correos por aquí?'], answer: '¿Hay una oficina de correos por aquí?', why: '问附近是否存在某类地点，使用 hay 加不定冠词。'},
        {prompt: '用 estar 填空。Las tiendas ___ junto a la estación.', answer: 'están', why: 'las tiendas 是复数，estar 用第三人称复数 están。'},
        {prompt: '哪一项能补全 El parque está enfrente ___ museo？', choices: ['de la', 'al', 'del'], answer: 'del', why: 'museo 是阳性名词，enfrente de 加 el museo 时，de el 合为 del。'}
      ],
      task: '用西语问附近有没有书店，再扮演路人，用一个参照物回答。',
      model: '¿Hay una librería cerca? Sí, la librería está enfrente de la estación.'
    },
    {
      id: 5,
      title: '点一份合口味的午餐',
      goal: '说明饮食喜好，并向服务员点餐。',
      lesson: '表达喜欢时，观察喜欢的东西。说一种食物时用 me gusta，复数食物用 me gustan，例如 me gustan las uvas。礼貌点单可以用 Para mí 加菜名，再补上 por favor。想去掉一种配料，就用 sin 加配料名。',
      examples: [
        ['Me gustan las aceitunas, pero no me gusta el queso.', '我喜欢橄榄，但不喜欢奶酪。'],
        ['Para mí, un bocadillo sin tomate, por favor.', '请给我一个不加番茄的三明治。']
      ],
      words: [['la carta', '菜单'], ['la sopa', '汤'], ['sin', '不加、没有'], ['la cuenta', '账单']],
      questions: [
        {prompt: '用 gustar 填空。Me ___ las naranjas.', answer: 'gustan', why: '这里让人喜欢的是复数的 las naranjas，动词用 gustan。'},
        {prompt: '你想喝不加糖的咖啡，选哪句？', choices: ['Un café con azúcar.', 'Un café sin azúcar.', 'Un café para azúcar.'], answer: 'Un café sin azúcar.', why: 'sin 表示去掉某种配料，con 表示加上某种配料。'},
        {prompt: '吃完饭想买单，应该说什么？', choices: ['La cuenta, por favor.', 'La sopa, por favor.', 'La carta, por favor.'], answer: 'La cuenta, por favor.', why: 'la cuenta 是账单，la carta 是点餐时看的菜单。'}
      ],
      task: '用西语点一份主食和一杯饮料，说明想去掉哪种配料。',
      model: 'Para mí, un bocadillo de queso sin tomate y un té, por favor.'
    },
    {
      id: 6,
      title: '把一天说成一条时间线',
      goal: '按照先后顺序说出起床、出门和休息的时间。',
      lesson: 'levantarse 表示起床。说自己起床时，把 se 换成 me，放在变位动词前，成为 me levanto；说你起床是 te levantas。说几点做某事用 a la una 或 a las 加其他整点。用 primero、después 把动作连起来。',
      examples: [
        ['Me levanto a las siete y media.', '我七点半起床。'],
        ['Primero desayuno y después salgo de casa.', '我先吃早饭，然后出门。']
      ],
      words: [['despertarse', '醒来'], ['ducharse', '淋浴'], ['primero', '首先'], ['después', '然后']],
      questions: [
        {prompt: '说“我一点钟吃午饭”应选哪句？', choices: ['Como a las una.', 'Como a la una.', 'Como en la una.'], answer: 'Como a la una.', why: '一点钟用单数 a la una，其他整点通常用 a las。'},
        {prompt: '填入与 tú 配套的代词。¿A qué hora ___ levantas?', answer: 'te', why: 'tú 的自复代词为 te，te levantas 表示“你起床”。'},
        {prompt: '中午十二点半是哪一项？', choices: ['Las doce y cuarto.', 'Las once y media.', 'Las doce y media.'], answer: 'Las doce y media.', why: 'y media 表示再加半小时，doce 是十二。'}
      ],
      task: '用西语写下起床、吃早饭和出门的顺序，并给其中一个动作注明时间。',
      model: 'Primero me levanto a las ocho. Después desayuno y salgo de casa.'
    },
    {
      id: 7,
      title: '在服装店试穿',
      goal: '询问尺码和价格，用代词指回已经提过的商品。',
      lesson: '问一件商品多少钱用 ¿Cuánto cuesta?，两件或多件用 ¿Cuánto cuestan?。已经说过 la falda，就可以用 la 指回它，换成 el abrigo 则用 lo。试穿衣服用 probarse，试穿一条裙子可以说 ¿Me la puedo probar?。',
      examples: [
        ['¿Tiene esta camisa en otra talla?', '这件衬衫有其他尺码吗？'],
        ['El abrigo me queda bien. Me lo llevo.', '这件大衣我穿着合身。我买下了。']
      ],
      words: [['la talla', '尺码'], ['el abrigo', '大衣'], ['la falda', '裙子'], ['el probador', '试衣间']],
      questions: [
        {prompt: '用 costar 填空。¿Cuánto ___ esas botas?', answer: 'cuestan', why: 'esas botas 是复数，costar 在这里变位为 cuestan。'},
        {prompt: '刚刚在谈 la falda，说“我买下它了”怎么说？', choices: ['Me lo llevo.', 'Me la llevo.', 'Me las llevo.'], answer: 'Me la llevo.', why: 'la falda 是阴性单数，所以直接宾语代词是 la。'},
        {prompt: '想问在哪里试穿，应该找什么？', choices: ['La cuenta.', 'El mercado.', 'El probador.'], answer: 'El probador.', why: 'probador 是商店里的试衣间。'}
      ],
      task: '用西语询问一件衣服的尺码和价钱，再决定是否购买。',
      model: '¿Tiene esta chaqueta en talla M? ¿Cuánto cuesta? Me queda bien. Me la llevo.'
    },
    {
      id: 8,
      title: '说明哪里不舒服',
      goal: '描述身体感受，说明接下来打算做什么。',
      lesson: '说哪里疼时，身体部位通常带定冠词。一个部位用 me duele la rodilla，多个部位用 me duelen las rodillas。说近期打算用 ir 的变位加 a 和动词原形，表达需要做的事用 tener que 加动词原形。',
      examples: [
        ['Hoy me duelen los pies.', '我今天双脚疼。'],
        ['Voy a llamar al centro de salud.', '我打算给社区医疗中心打电话。']
      ],
      words: [['la espalda', '背部'], ['la garganta', '咽喉'], ['la cita', '预约'], ['descansar', '休息']],
      questions: [
        {prompt: '用 doler 填空。Me ___ la espalda.', answer: 'duele', why: 'la espalda 是单数，对应 duele。'},
        {prompt: '“我的膝盖都疼”怎么说？', choices: ['Me duele las rodillas.', 'Me duelen las rodillas.', 'Me duelen la rodilla.'], answer: 'Me duelen las rodillas.', why: '复数名词 las rodillas 和复数动词 duelen 搭配。'},
        {prompt: '哪句表达“我打算预约”？', choices: ['Voy a pedir una cita.', 'Voy pedir una cita.', 'Tengo una cita ayer.'], answer: 'Voy a pedir una cita.', why: '近期计划的句型是 voy a 加动词原形，pedir una cita 就是预约。'}
      ],
      task: '用西语给朋友留一条消息，说明一个症状和一项计划。',
      model: 'Hoy me duele la garganta. Voy a pedir una cita por teléfono.'
    },
    {
      id: 9,
      title: '比较两处住处',
      goal: '比较房间和街区，为自己的选择给一个理由。',
      lesson: '比较两项事物时，把形容词放进 más… que 或 menos… que。表达程度一样用 tan… como。比较词本身不跟名词变，但形容词仍须一致。要在几个地方里选出最近的，可以说 el más cercano 或 la más cercana。',
      examples: [
        ['Esta calle es más tranquila que la avenida.', '这条街比那条大道安静。'],
        ['Mi barrio es tan verde como el tuyo.', '我的街区和你的一样绿意盎然。']
      ],
      words: [['el barrio', '街区'], ['el alquiler', '租金'], ['el balcón', '阳台'], ['luminoso', '明亮的']],
      questions: [
        {prompt: '填入一个连接词。Mi piso es más pequeño ___ el tuyo.', answer: 'que', why: '两者有程度差别时，比较结构是 más 加形容词再加 que。'},
        {prompt: '“两个房间一样明亮”应选哪句？', choices: ['Mi habitación es más luminosa como la tuya.', 'Mi habitación es tan luminosa como la tuya.', 'Mi habitación es tan luminoso que la tuya.'], answer: 'Mi habitación es tan luminosa como la tuya.', why: '一样明亮用 tan… como，habitación 配阴性 luminosa。'},
        {prompt: '三套公寓中“最便宜的那套”是哪个？piso 是阳性。', choices: ['el más barato', 'el menos barato', 'la más barata'], answer: 'el más barato', why: '定冠词 el 与 piso 一致，más barato 意为更便宜，这里从三套中选最便宜的一套。'}
      ],
      task: '用西语比较两个房间或街区，并说出你偏爱哪一个。',
      model: 'El piso del centro es más pequeño que el de la estación. Prefiero el del centro porque está cerca de mi trabajo.'
    },
    {
      id: 10,
      title: '约朋友出门',
      goal: '说明现在手头的事，与朋友约定时间和地点。',
      lesson: '表达此刻正在进行的动作，用 estar 的变位加副动词。hablar 变成 hablando，comer 变成 comiendo。发邀请常说 ¿Te apetece…? 并接动词原形。如果另有安排，可以先说明原因，再提议另一个见面时间。',
      examples: [
        ['Ahora estoy preparando la cena.', '我现在正在准备晚饭。'],
        ['¿Quedamos a las seis en la plaza?', '我们六点在广场碰面，好吗？']
      ],
      words: [['quedar', '约好见面'], ['el concierto', '音乐会'], ['la entrada', '门票'], ['esta tarde', '今天下午或傍晚']],
      questions: [
        {prompt: '用 estudiar 的副动词填空。Ahora estoy ___ en casa.', answer: 'estudiando', why: '以 -ar 结尾的规则动词去掉 -ar，接上 -ando。'},
        {prompt: '请选择一个自然的邀请。', choices: ['¿Te apetece ir al cine?', '¿Te apetece vas al cine?', '¿Te apetece yendo al cine?'], answer: '¿Te apetece ir al cine?', why: 'apetecer 后接要做的事时，使用动词原形 ir。'},
        {prompt: '朋友今天有事，想改约明天下午哪句最合适？', choices: ['Hasta ayer.', '¿Y mañana por la tarde?', 'Ayer fuimos al parque.'], answer: '¿Y mañana por la tarde?', why: 'mañana por la tarde 指明天下午，可以用来提出另一个时间。'}
      ],
      task: '先用西语介绍自己现在正在做什么，再邀请朋友晚些时候见面。',
      model: 'Ahora estoy leyendo. ¿Te apetece dar un paseo? Podemos quedar a las siete en el parque.'
    },
    {
      id: 11,
      title: '讲讲昨天发生的事',
      goal: '用简单过去时，把一次已经结束的行程讲清楚。',
      lesson: 'ayer 和 el sábado pasado 常用来引出已结束的事情。规则动词 hablar 的第一人称单数过去式是 hablé；comer 和 salir 则是 comí、salí。ir 有特殊形式，yo fui 表示“我去了”。用 luego 或 al final 引出下一步或结尾。',
      examples: [
        ['Ayer visité un mercado y compré pan.', '昨天我逛了一个市场，买了面包。'],
        ['Luego fui al río con mi hermana.', '后来我和姐姐去了河边。']
      ],
      words: [['ayer', '昨天'], ['luego', '随后'], ['el sábado pasado', '上周六'], ['al final', '最后']],
      questions: [
        {prompt: '用 visitar 的简单过去时填空。Ayer yo ___ a mi tío.', answer: 'visité', why: 'visitar 的第一人称单数简单过去时词尾为 -é，重音落在末尾。'},
        {prompt: '哪句在说一次已经结束的出行？', choices: ['Ahora voy al teatro.', 'Mañana voy a ir al teatro.', 'Ayer fui al teatro.'], answer: 'Ayer fui al teatro.', why: 'ayer 指昨天，fui 是 ir 的第一人称单数简单过去时。'},
        {prompt: '“昨天我吃了米饭”应选哪句？', choices: ['Ayer comí arroz.', 'Ayer como arroz.', 'Ayer comer arroz.'], answer: 'Ayer comí arroz.', why: 'comer 的第一人称单数简单过去时为 comí，过去的完整动作用这个形式。'}
      ],
      task: '用三句西语讲昨天的一次出行，依次说去了哪里、做了什么、最后怎样。',
      model: 'Ayer fui a la playa. Luego comí con mi prima. Al final volví a casa en autobús.'
    },
    {
      id: 12,
      title: '接待一位来访的朋友',
      goal: '把自我介绍、昨日经历和明日计划接成一段对话。',
      lesson: '先给听者一个时间标记，再选动词。介绍个人情况可以用 vivo，回顾昨天用 fui，说明明天的打算用 voy a 加动词原形。用 porque 给一句理由，最后问对方 ¿Y tú? 或提出具体问题，就能把独白变成对话。',
      examples: [
        ['Vivo cerca de la estación. Ayer fui al mercado.', '我住在车站附近，昨天去了市场。'],
        ['Mañana voy a visitar el museo. ¿Quieres venir conmigo?', '我明天打算去博物馆。你想和我一起去吗？']
      ],
      words: [['hoy', '今天'], ['mañana', '明天'], ['porque', '因为'], ['conmigo', '和我一起']],
      questions: [
        {prompt: '用 ir 的一个词填空，表示“昨天我去了车站”。Ayer ___ a la estación.', answer: 'fui', why: '句子里的“我”和“昨天”要求用 ir 的第一人称单数简单过去时 fui。'},
        {prompt: '哪句话能回答 ¿Qué vas a hacer mañana?？', choices: ['Ayer fui al parque.', 'Voy a enseñar mi barrio a una amiga.', 'Me llamo Lola.'], answer: 'Voy a enseñar mi barrio a una amiga.', why: '对方问明天的计划，voy a enseñar 表达打算带朋友看看自己的街区。'},
        {prompt: '要给“我想逛市场”补一个理由，选哪个连接词？Quiero visitar el mercado ___ me gusta cocinar.', choices: ['pero', 'porque', 'después'], answer: 'porque', why: 'porque 引出原因，后面说明喜欢做饭。'}
      ],
      task: '用西语招待一位来你所在城市的朋友。介绍住处，讲一件昨天的事，提出明天的安排，并邀请对方回应。',
      model: 'Hola, vivo al lado de la plaza. Ayer compré fruta en el mercado. Mañana voy a preparar una comida en casa. ¿Te apetece venir?'
    }
  ];

  const documents = [
    ['教案', 'lesson_plan'],
    ['练习册', 'workbook'],
    ['参考答案', 'answer_sheet'],
    ['补充词表', 'supplemental_vocabulary_list']
  ];
  const site = 'https://opensignal4214.github.io/Spanish-Courses/';
  window.SpanishWeeks = weeks.map(week => {
    // The publisher's Traditional Chinese index points to English materials from week 3.
    const translated = week.id <= 2;
    const folder = (translated ? 'tw/' : '') + 'Week_' + week.id + '_Spanish_Lesson/';
    const resources = documents.map(([name, file]) => ({
      label: name + (translated ? '（繁中）' : '（英文）'),
      url: site + folder + 'spanish_week_' + week.id + '_' + file + '.html'
    }));
    return {...week, resources};
  });
})();
