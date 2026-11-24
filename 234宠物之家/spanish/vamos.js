// Original Chinese lessons and exercises following the weekly topics of ¡Vamos!
(() => {
  'use strict';

  const source = { label: '¡Vamos! 原项目', url: 'https://therealyc92.github.io/vamos-spanish/' };
  const quiz = (prompt, choices, answer, why) => ({ prompt, choices, answer, why });

  window.VamosWeeks = [
    {
      id: 1, title: '第一声问候', goal: '听辨重音，用两句话和新同学打招呼。',
      lesson: '西语的五个元音 a、e、i、o、u 在重读和非重读音节中通常都读得清楚。hola 里的 h 不发音。听 café，注意写在 é 上的重音符号，再对比 casa 的重音在 ca。',
      examples: [['Hola, ¿qué tal?', '你好，最近怎么样？'], ['Muy bien, gracias. ¿Y tú?', '很好，谢谢。你呢？']],
      words: [['hola', '你好'], ['gracias', '谢谢'], ['hasta mañana', '明天见'], ['café', '咖啡']],
      questions: [
        quiz('hola 开头的 h 怎么读？', ['不发音', '读作西语的 j', '读作英语的 h'], '不发音', '从元音 o 开始读，整个词念作 o-la。'),
        quiz('听到 café 时，哪个音节更突出？', ['ca', 'fé', '两个都不重读'], 'fé', '重音符号标明这个词重读末尾的 fé。')
      ],
      task: '你在晨课门口见到同桌。先问好，再回应对方的问候。',
      model: '¡Buenos días! ¿Qué tal? — Bien, gracias. ¿Y tú?'
    },
    {
      id: 2, title: '从一张桌子学冠词', goal: '用冠词说出桌面上的单数和复数物品。',
      lesson: '把冠词和名词当成一组来记。el libro 变成复数是 los libros，la mesa 对应 las mesas。提到一个尚未指明的物品时，可以说 un libro 或 una mesa。',
      examples: [['Es una mochila.', '这是一个背包。'], ['Las llaves están aquí.', '那几把钥匙在这里。']],
      words: [['el libro', '书'], ['la mesa', '桌子'], ['la llave', '钥匙'], ['la mochila', '背包']],
      questions: [
        quiz('把 la llave 变成带定冠词的复数。', ['los llaves', 'las llave', 'las llaves'], 'las llaves', 'la 的复数是 las，llave 在词尾加 s。'),
        quiz('第一次提到桌上的一本书，用哪个说法？', ['una libro', 'un libro', 'unos libro'], 'un libro', 'libro 是阳性单数，搭配不定冠词 un。')
      ],
      task: '给同学描述书包。先说里面有一本书，再说钥匙也在里面。',
      model: 'Hay un libro en mi mochila. Las llaves también están en la mochila.'
    },
    {
      id: 3, title: '介绍自己和同伴', goal: '用 ser 说姓名、身份和来自哪里。',
      lesson: '介绍身份时，ser 随主语变化。yo 用 soy，tú 用 eres，él、ella 或 usted 用 es。表示籍贯时把 de 放在地名前面。名字可以直接接在 soy 后面。',
      examples: [['Soy Lin y soy de Xi’an.', '我叫林，来自西安。'], ['Esta es Inés. Es profesora.', '这是伊内斯，她是一位老师。']],
      words: [['ser de', '来自'], ['estudiante', '学生'], ['profesora', '女教师'], ['compañero', '男同学或男同事']],
      questions: [
        quiz('你对一位同龄人问“你来自哪里？”。', ['¿De dónde eres?', '¿De dónde soy?', '¿Quiénes son?'], '¿De dónde eres?', '对 tú 提问用 eres，de dónde 表示从哪里来。'),
        quiz('补全 Lucía ___ estudiante。', ['soy', 'eres', 'es'], 'es', 'Lucía 是第三人称单数，因此动词用 es。')
      ],
      task: '假装你叫安，在读大学。用两句西语介绍姓名、身份和家乡。',
      model: 'Soy An, estudiante de español. Soy de Shanghái.'
    },
    {
      id: 4, title: '约定日期和钟点', goal: '对话中说明年龄、日期和见面时间。',
      lesson: '西语用 tener 加数字再加 años 表示年龄。说整点时，一点用 es la una，两点及以后用 son las…。约在几点碰面时，时间前用 a。',
      examples: [['Tengo veinte años.', '我二十岁。'], ['La cita es el tres de mayo a las dos.', '约定时间是五月三日两点。']],
      words: [['hoy', '今天'], ['la una', '一点'], ['media hora', '半小时'], ['la fecha', '日期']],
      questions: [
        quiz('怎样说“我十八岁”？', ['Soy dieciocho años.', 'Tengo dieciocho años.', 'Son dieciocho años.'], 'Tengo dieciocho años.', '年龄用 tener，主语 yo 对应 tengo。'),
        quiz('对方问 ¿Qué hora es?，现在是一点半。', ['Son la una y media.', 'Es las una y media.', 'Es la una y media.'], 'Es la una y media.', '一点用单数 es la una，y media 表示又过半小时。')
      ],
      task: '给同伴留言，约在六月四日下午三点见面。',
      model: 'Nos vemos el cuatro de junio a las tres de la tarde.'
    },
    {
      id: 5, title: '说说平常做的事', goal: '用规则 -ar 动词描述自己和朋友的日常。',
      lesson: '把 estudiar 去掉 -ar，再按主语接词尾。yo estudio，tú estudias，ella estudia，nosotros estudiamos。句子里即使省略人称代词，词尾也能说明是谁在行动。',
      examples: [['Trabajo en una librería.', '我在一家书店工作。'], ['¿Estudias español los martes?', '你每周二学西语吗？']],
      words: [['estudiar', '学习'], ['trabajar', '工作'], ['caminar', '步行'], ['escuchar', '听']],
      questions: [
        quiz('“我们一起学习”应说 Juntos ___。', ['estudio', 'estudian', 'estudiamos'], 'estudiamos', 'nosotros 对应的 -ar 动词词尾是 -amos。'),
        quiz('补全 ¿Tú ___ música al caminar?', ['escuchas', 'escucha', 'escucho'], 'escuchas', 'tú 的现在时词尾是 -as，得到 escuchas。')
      ],
      task: '说说你周一常做什么，再问朋友平常在哪里学习。',
      model: 'Los lunes camino al trabajo. ¿Dónde estudias normalmente?'
    },
    {
      id: 6, title: '餐桌上的现在时', goal: '谈论三餐，用 -er 和 -ir 动词交换习惯。',
      lesson: 'comer 和 vivir 在 yo 形式都以 -o 结尾，tú 形式都以 -es 结尾。特别留意 nosotros 的区别，comemos 的结尾是 -emos，vivimos 的结尾是 -imos。',
      examples: [['Como arroz con verduras.', '我吃蔬菜配米饭。'], ['Vivimos cerca del mercado.', '我们住在市场附近。']],
      words: [['comer', '吃'], ['beber', '喝'], ['vivir', '居住'], ['la cena', '晚餐']],
      questions: [
        quiz('用现在时说我们的习惯。En casa, nosotros ___ agua con la cena。', ['beben', 'bebemos', 'bebimos'], 'bebemos', '这里描述平常的习惯，beber 的 nosotros 现在时是 bebemos。'),
        quiz('朋友问你住在哪里。补全 Yo ___ cerca de aquí。', ['vive', 'vives', 'vivo'], 'vivo', '去掉 vivir 的 -ir，第一人称单数再接 -o。')
      ],
      task: '向室友说你早餐吃什么、喝什么，再问对方喝不喝咖啡。',
      model: 'Por la mañana como pan y bebo leche. ¿Bebes café?'
    },
    {
      id: 7, title: '给街区标位置', goal: '介绍地点是什么，并说清它在哪里。',
      lesson: '用 ser 给人或事物归类，用 estar 描述人或建筑的位置。可以先用 hay 介绍某处有一个设施，再用 está 指明它的位置。al lado de 表示紧挨着。',
      examples: [['Es una biblioteca pública.', '这是一家公共图书馆。'], ['La biblioteca está detrás del teatro.', '图书馆在剧院后面。']],
      words: [['cerca de', '离……近'], ['delante de', '在……前面'], ['detrás de', '在……后面'], ['la plaza', '广场']],
      questions: [
        quiz('问一家特定的邮局在哪里，选哪句？', ['¿Qué es el correo?', '¿Dónde está la oficina de correos?', '¿De dónde eres?'], '¿Dónde está la oficina de correos?', '已知地点的位置通常用 dónde 和 estar 提问。'),
        quiz('补全 Mi hermana ___ médica。', ['es', 'está', 'hay'], 'es', '介绍职业、身份时用 ser。')
      ],
      task: '想象广场旁有一家书店。向游客介绍这家书店并说明方位。',
      model: 'Hay una librería en el barrio. Está al lado de la plaza.'
    },
    {
      id: 8, title: '下一站去哪里', goal: '说明目的地，再用 ir a 表达接下来的计划。',
      lesson: 'Voy al puerto 说的是目的地。Voy a visitar el puerto 表示打算做的事，visitar 保持不定式。目的地以 el 开头时，a 和 el 合成 al。',
      examples: [['Vamos a tomar el metro.', '我们打算坐地铁。'], ['Voy al centro a pie.', '我走路去市中心。']],
      words: [['la estación', '车站'], ['el billete', '车票'], ['a pie', '步行'], ['visitar', '参观']],
      questions: [
        quiz('补全 Mañana voy a ___ el museo。', ['visito', 'visitas', 'visitar'], 'visitar', 'ir a 后面用不定式表示计划，动词变位由 voy 承担。'),
        quiz('目的地是 el aeropuerto，怎么说“我去机场”？', ['Voy al aeropuerto.', 'Voy a la aeropuerto.', 'Voy del aeropuerto.'], 'Voy al aeropuerto.', '方向介词 a 加阳性定冠词 el 合为 al。')
      ],
      task: '你打算周六坐公交去博物馆。把目的地和出行计划各说一遍。',
      model: 'El sábado voy al museo. Voy a tomar el autobús.'
    },
    {
      id: 9, title: '在小餐馆点单', goal: '用 querer、poder 和 pedir 说明想要的菜并提出请求。',
      lesson: 'quiero 和 puedo 的词干元音发生变化。pedir 在第一人称单数变成 pido。拿不准一道菜时，可以先用 ¿Puedo…? 礼貌地询问。',
      examples: [['Quiero una sopa de tomate.', '我想要一份番茄汤。'], ['¿Puedo pedir pan para compartir?', '我可以点面包一起分着吃吗？']],
      words: [['pedir', '点菜；请求'], ['poder', '能；可以'], ['la sopa', '汤'], ['la cuenta', '账单']],
      questions: [
        quiz('补全 Yo ___ una mesa para dos。', ['quere', 'quiero', 'queremos'], 'quiero', 'querer 的 yo 现在时是 quiero，词干 e 变 ie。'),
        quiz('补全 Yo siempre ___ la sopa aquí。', ['pide', 'pedo', 'pido'], 'pido', 'pedir 的 yo 现在时是 pido，词干 e 变 i。')
      ],
      task: '为自己点一道菜，再问服务员可不可以刷卡。',
      model: 'Quiero el pescado, por favor. ¿Puedo pagar con tarjeta?'
    },
    {
      id: 10, title: '此刻正在做什么', goal: '用 estar 和动名词描述眼前的动作。',
      lesson: '先将 estar 随主语变位，再接表示动作过程的形式。hablar 变 hablando，comer 变 comiendo，escribir 变 escribiendo。用 ahora mismo 可以强调此刻。',
      examples: [['Estoy preparando la merienda.', '我正在准备点心。'], ['Los niños están escribiendo sus nombres.', '孩子们正在写自己的名字。']],
      words: [['ahora mismo', '此刻'], ['preparar', '准备'], ['escribir', '写'], ['esperar', '等待']],
      questions: [
        quiz('你在电话中说正在吃饭。', ['Soy comiendo.', 'Estoy comer.', 'Estoy comiendo.'], 'Estoy comiendo.', '正在发生的动作用 estar + 动名词，comer 对应 comiendo。'),
        quiz('补全 Mis amigos ___ esperando fuera。', ['están', 'está', 'estamos'], 'están', 'amigos 是第三人称复数，estar 用 están。')
      ],
      task: '想象正在等车。描述你和一位同行者眼下各在做什么。',
      model: 'Estoy esperando el autobús. Mi amiga está mirando el mapa.'
    },
    {
      id: 11, title: '记录已经结束的一天', goal: '用规则简单过去时报告昨天发生的事。',
      lesson: '简单过去时可以把做完的事逐件讲出来。-ar 动词第一人称单数常以 -é 结尾，-er 和 -ir 动词对应 -í。注意 hablo 是“我平时说”，habló 是“他或她说过”。',
      examples: [['Ayer compré fruta.', '昨天我买了水果。'], ['Clara recibió mi carta el lunes.', '克拉拉周一收到了我的信。']],
      words: [['ayer', '昨天'], ['anoche', '昨晚'], ['comprar', '买'], ['recibir', '收到']],
      questions: [
        quiz('填入“我昨天学了两个小时”。Ayer ___ dos horas。', ['estudio', 'estudié', 'estudia'], 'estudié', '动作已经结束，estudiar 的 yo 简单过去时是 estudié。'),
        quiz('ella 昨天在家吃过饭。补全 Ayer ella ___ en casa。', ['comí', 'come', 'comió'], 'comió', 'comer 的第三人称单数简单过去时为 comió，注意重音符号。')
      ],
      task: '用两句简单过去时，记录你昨天买了什么、又写了什么。',
      model: 'Ayer compré una postal. Después escribí un mensaje a mi prima.'
    },
    {
      id: 12, title: '讲一趟难忘的出行', goal: '用 fui、hice、tuve 讲已完成的经历。',
      lesson: 'ir 和 ser 的简单过去时形式相同，要从上下文判断含义。Fui a Toledo 表示去了那里，而 fui guía 表示曾当过向导。hacer 的 yo 是 hice，tener 的 yo 是 tuve。',
      examples: [['El domingo fui al puerto.', '周日我去了港口。'], ['Hice fotos y tuve tiempo para pasear.', '我拍了照片，还有时间散步。']],
      words: [['fui', '我去了；我曾是'], ['hice', '我做了'], ['tuve', '我曾有'], ['el paseo', '散步']],
      questions: [
        quiz('补全 Ayer nosotros ___ al lago。', ['vamos', 'fuimos', 'iremos'], 'fuimos', '昨天发生的动作，ir 的 nosotros 简单过去时用 fuimos。'),
        quiz('选出 hacer 的第一人称单数简单过去时。', ['hizo', 'hacé', 'hice'], 'hice', 'yo 是 hice，第三人称单数才是 hizo。')
      ],
      task: '描述上一个休息日去了哪里、做了什么。',
      model: 'Fui a la montaña con Ana. Hice una pausa junto al río.'
    },
    {
      id: 13, title: '回忆小时候', goal: '用过去未完成时描述习惯和背景。',
      lesson: '谈起过去反复发生的事或当时的状态，可以用过去未完成时。jugaba、vivía 都可以配 antes 或 de pequeño。ser 的形式 era 很常用。',
      examples: [['De niña vivía frente a un parque.', '我小时候住在公园对面。'], ['En verano jugábamos fuera todos los días.', '过去每到夏天我们天天在外面玩。']],
      words: [['antes', '以前'], ['a menudo', '经常'], ['el recuerdo', '回忆'], ['el patio', '庭院']],
      questions: [
        quiz('补全 De pequeño, cada tarde yo ___ en el parque，表达儿时惯例。', ['jugaré', 'juego', 'jugaba'], 'jugaba', '儿时反复做的事可用未完成时，yo jugaba。'),
        quiz('说儿时的房间很小，选哪个 ser 的未完成时？', ['era', 'soy', 'seré'], 'era', 'era 适合交代当时房间的状态。')
      ],
      task: '想起小时候常去的一处地方，说出过去的环境和一项习惯。',
      model: 'La biblioteca de mi barrio era pequeña. Allí leía cuentos cada sábado.'
    },
    {
      id: 14, title: '背景里发生了一件事', goal: '选择两种过去时，讲清背景与事件。',
      lesson: '把听者带进场景可以用未完成时，再用简单过去时推进故事。Cocinaba cuando llegó Leo 中，做饭是当时的背景，Leo 的到来是情节中的新事件。',
      examples: [['Dormía cuando sonó el teléfono.', '电话响时，我正在睡觉。'], ['Hacía frío y cerré la ventana.', '天很冷，于是我关上了窗。']],
      words: [['mientras', '在……的同时'], ['de repente', '突然'], ['sonar', '响起'], ['llegar', '到达']],
      questions: [
        quiz('补出持续的背景。Mientras yo ___ una carta, llamaron a la puerta。', ['escribiré', 'escribía', 'escribo'], 'escribía', '当时正在写信是背景，敲门是新发生的事件。'),
        quiz('补出新发生的动作。Caminaba por la calle cuando ___ a Eva。', ['veo', 'veré', 'vi'], 'vi', '突然看到 Eva 是一次相遇，ver 的 yo 简单过去时是 vi。')
      ],
      task: '你正在站台等车，突然看见了朋友。把两件事连成一句。',
      model: 'Esperaba el tren en el andén cuando vi a mi amigo Pablo.'
    },
    {
      id: 15, title: '电话里的 lo 和 la', goal: '用直接宾语代词简短回应邀请和询问。',
      lesson: '前面刚提过的宾语可以用 lo、la、los、las 代替，性和数跟原来的名词一致。只有一个变位动词时，这些代词一般放在动词前面。',
      examples: [['¿Tienes las entradas? — Sí, las tengo.', '票在你那里吗？——是的，在我这里。'], ['El mensaje es largo. Lo leo después.', '这条消息很长，我待会儿看。']],
      words: [['la entrada', '入场券'], ['la llamada', '电话'], ['el mensaje', '消息'], ['invitar', '邀请']],
      questions: [
        quiz('代替 la reserva。¿Confirmas la reserva? — Sí, ___ confirmo。', ['lo', 'las', 'la'], 'la', 'reserva 是阴性单数，所以用 la。'),
        quiz('代替 los mapas。¿Traes los mapas? — Sí, ___ traigo。', ['los', 'lo', 'las'], 'los', 'mapas 虽以 -a 构成词干，却是阳性，复数用 los。')
      ],
      task: '朋友问音乐会的门票和节目单带了没有。分别用代词回答。',
      model: '¿Tienes las entradas? — Sí, las tengo. ¿Y el programa? — También lo tengo.'
    },
    {
      id: 16, title: '聊喜欢的东西', goal: '用 gustar 表达偏好，并指出是谁有这种感受。',
      lesson: '在 me gustan las novelas 中，las novelas 决定动词用复数，me 表示感受到喜爱的人。一个事物或一项活动常用 gusta。给某人某物时也常用 le 标记接收者。',
      examples: [['Me gusta cocinar para mis amigos.', '我喜欢给朋友们做饭。'], ['A Lola le gustan las plantas.', '洛拉喜欢植物。']],
      words: [['gustar', '使人喜欢'], ['encantar', '使人十分喜爱'], ['interesar', '使人感兴趣'], ['regalar', '赠送']],
      questions: [
        quiz('补全 A mí me ___ los mercados al aire libre。', ['gusto', 'gustan', 'gusta'], 'gustan', '决定单复数的是 los mercados，所以用 gustan。'),
        quiz('补全 A Diego ___ interesa la fotografía。', ['lo', 'les', 'le'], 'le', 'Diego 是一个人，间接宾语代词用 le。')
      ],
      task: '说出自己喜欢做的一件事，以及家人喜欢的两样东西。',
      model: 'Me gusta bailar. A mi hermana le gustan los libros y las películas.'
    },
    {
      id: 17, title: '想象将来的生活', goal: '用简单将来时描述打算和预测。',
      lesson: '规则动词保留整个不定式再接将来时词尾。yo 用 -é，tú 用 -ás，nosotros 用 -emos。部分动词换词干，例如 tener 变 tendr-，得到 tendré。',
      examples: [['El año que viene aprenderé a navegar.', '明年我会学驾船。'], ['Tendremos más tiempo en agosto.', '八月我们会有更多时间。']],
      words: [['el futuro', '未来'], ['algún día', '有朝一日'], ['el sueño', '梦想'], ['aprender', '学习']],
      questions: [
        quiz('补全 Mañana te ___ un correo，意思是“我明天会给你写邮件”。', ['escribirás', 'escribiré', 'escribieron'], 'escribiré', 'escribir 加第一人称将来时词尾 -é。'),
        quiz('“我们将拥有”的单个动词形式是？', ['tendremos', 'tendríamos', 'teníamos'], 'tendremos', 'tener 的将来时使用 tendr- 加 -emos。')
      ],
      task: '说出明年你会去哪里，以及你希望学会做的一件事。',
      model: 'El año que viene viajaré a México. Allí aprenderé a preparar tortillas.'
    },
    {
      id: 18, title: '把请求说得更委婉', goal: '用条件式提出请求，给朋友一个温和的建议。',
      lesson: '礼貌求助常用 ¿Podría…? 或 ¿Podrías…? 前者可用于对 usted 的请求，后者针对 tú。给建议可以在 Yo, en tu lugar 后面接条件式，意思接近“换作我，我会……”。',
      examples: [['¿Podría indicarme la salida?', '请问您能给我指一下出口吗？'], ['Yo reservaría una mesa antes de ir.', '换作我，会先订桌再去。']],
      words: [['podría', '可以（委婉语气）'], ['me gustaría', '我想；我希望'], ['aconsejar', '建议'], ['la salida', '出口']],
      questions: [
        quiz('向工作人员礼貌询问能否帮忙，哪句使用条件式？', ['Me ayudó ayer.', 'Me ayuda cada lunes.', '¿Podría ayudarme?'], '¿Podría ayudarme?', 'podría 是 poder 的条件式，适合用 usted 委婉求助。'),
        quiz('按“换作我会……”的意思补全 Yo, en tu lugar, ___ antes。', ['salí', 'saldría', 'salgo'], 'saldría', 'salir 的条件式词干是 saldr-，yo 接 -ía。')
      ],
      task: '在酒店礼貌地请工作人员叫一辆出租车。',
      model: 'Disculpe, ¿podría llamar a un taxi para mí, por favor?'
    },
    {
      id: 19, title: '说出希望对方做的事', goal: '在愿望和要求之后使用现在虚拟式。',
      lesson: '主语不同时，quiero que 和 espero que 后常接虚拟式。比较 quiero entrar（我想进去）与 quiero que entres（我希望你进去）。规则 -ar 动词的虚拟式通常改用 e 系列词尾。',
      examples: [['Espero que descanses esta noche.', '希望你今晚好好休息。'], ['La tutora pide que lleguemos temprano.', '导师要求我们早点到。']],
      words: [['esperar que', '希望……'], ['pedir que', '请求……'], ['descansar', '休息'], ['temprano', '早']],
      questions: [
        quiz('补全 Quiero que tú ___ con nosotros。', ['viajas', 'viajes', 'viajar'], 'viajes', '我希望你旅行，两个主语不同，用 que 接 tú 的虚拟式 viajes。'),
        quiz('“我本人想睡觉”哪个表达最自然？', ['Quiero dormir.', 'Quiero que dormir.', 'Quiero que duermo.'], 'Quiero dormir.', '想做某事的人也是实际行动者，直接用不定式。')
      ],
      task: '朋友要参加演出。用希望句祝对方享受演出并休息好。',
      model: 'Espero que disfrutes del concierto y que descanses después.'
    },
    {
      id: 20, title: '表达怀疑与感受', goal: '根据态度，在直陈式和虚拟式之间作出选择。',
      lesson: '用 creo que 提出自己认可的判断，常接直陈式。用 dudo que 表示存疑，或用 me alegra que 表达感受时，从句常用虚拟式。先弄清说话人如何看待这件事，再决定动词形式。',
      examples: [['Creo que el museo está abierto.', '我觉得博物馆开着。'], ['Me alegra que estés aquí.', '你在这里，我很高兴。']],
      words: [['dudar', '怀疑'], ['alegrarse', '感到高兴'], ['creer', '相信；认为'], ['seguro', '确定的']],
      questions: [
        quiz('补全 Dudo que ___ entradas disponibles，表达对余票的怀疑。', ['hay', 'había', 'haya'], 'haya', 'dudo que 引出不确定的情况，haber 的现在虚拟式是 haya。'),
        quiz('补全 Creo que Clara ___ razón，表达你认同她。', ['tiene', 'tenga', 'tener'], 'tiene', '肯定形式 creo que 陈述自己认可的判断，这里用直陈式 tiene。')
      ],
      task: '谈论周末的户外音乐会。先陈述一个看法，再表达一项疑虑。',
      model: 'Creo que el grupo es excelente. Dudo que haga buen tiempo el sábado.'
    },
    {
      id: 21, title: '说明原因和用途', goal: '在原因、路径、对象和用途的语境中选用 por 或 para。',
      lesson: '说原因或途经的地方时常用 por，说用途、接收者或要达到的目标时常用 para。比较 camino por el parque（经过公园）与 estudio para el examen（为考试而学习）。',
      examples: [['Gracias por tu paciencia.', '谢谢你的耐心。'], ['Estas semillas son para mi abuelo.', '这些种子是给我爷爷的。']],
      words: [['por aquí', '经过这里；在这附近'], ['para ti', '给你'], ['la razón', '原因'], ['el destino', '目的地']],
      questions: [
        quiz('给朋友准备纪念品。Este regalo es ___ ti。', ['por', 'para', 'desde'], 'para', '收礼物的对象由 para 引出。'),
        quiz('表达“航班因风暴取消”。Cancelaron el vuelo ___ la tormenta。', ['para', 'hasta', 'por'], 'por', '风暴是取消航班的原因，用 por。')
      ],
      task: '介绍你正在准备的一份小礼物。说说送给谁、为什么谢谢这个人。',
      model: 'Este cuaderno es para mi profesora. Le doy las gracias por su apoyo.'
    },
    {
      id: 22, title: '用从句补充细节', goal: '用 que 和 donde 帮对方认出你描述的人或地方。',
      lesson: '先说名词，再用 que 接上有关这个人或事物的细节。如果要补充“在那个地方发生什么”，可以用 donde。这两个关系词在这里都没有重音符号。',
      examples: [['Busco el libro que dejé en el tren.', '我在找落在火车上的那本书。'], ['Volvimos al barrio donde crecí.', '我们回到了我长大的街区。']],
      words: [['el lugar', '地点'], ['el barrio', '街区'], ['crecer', '长大'], ['recomendar', '推荐']],
      questions: [
        quiz('那是我工作过的店。Esa es la tienda ___ trabajé。', ['quién', 'donde', 'cuál'], 'donde', '从句补充工作的地点，用关系副词 donde。'),
        quiz('这是你推荐给我的歌。Esta es la canción ___ me recomendaste。', ['donde', 'cuándo', 'que'], 'que', 'la canción 是 recomendaste 的直接宾语，用关系代词 que。')
      ],
      task: '向对方介绍最喜欢的一处地方，并说明你在那里做什么。',
      model: 'Me gusta la cafetería donde leo los domingos. Sirven un pan que me encanta.'
    },
    {
      id: 23, title: '把小事讲成一段故事', goal: '用连接词串起开端、意外和结局。',
      lesson: '用 al principio 或 primero 建立开端。转折处可以用 sin embargo 或 de pronto，结尾用 al final。听完自己的叙述，检查别人能否听出来先后顺序和意外发生在哪里。',
      examples: [['Primero buscamos la calle en el mapa.', '我们先在地图上找了那条街。'], ['Al final, una vecina nos acompañó.', '最后，一位邻居陪我们走了过去。']],
      words: [['primero', '首先'], ['de pronto', '突然'], ['sin embargo', '然而'], ['al final', '最后']],
      questions: [
        quiz('故事已讲到结局，用哪个短语开头合适？', ['Al final', 'Al principio', 'Antes de empezar'], 'Al final', 'al final 提示听者接下来是事情的结果。'),
        quiz('选出凸显转折的连接语。Parecía fácil. ___, tardamos dos horas。', ['Por ejemplo', 'Sin embargo', 'Es decir'], 'Sin embargo', '看起来容易却花了很久，两句话之间有转折。')
      ],
      task: '讲一次差点错过车的经历。依次交代起初的情况、意外和结局。',
      model: 'Al principio teníamos tiempo. De pronto, el autobús cambió de ruta. Al final llegamos justo a tiempo.'
    },
    {
      id: 24, title: '听懂不同地区的表达', goal: '识别同一事物的地区说法，并自然确认词义。',
      lesson: '同样是“手机”，在西班牙常听到 móvil，在许多拉美地区常说 celular。 ordenador 和 computadora 也都是“电脑”。遇到新说法时可以复述确认，不必立刻改变自己已经掌握的表达。',
      examples: [['¿Me pasas el móvil, por favor?', '能把手机递给我吗？'], ['¿Con “celular” te refieres al teléfono móvil?', '你说的 celular 是指手机吗？']],
      words: [['el móvil', '手机'], ['el celular', '手机'], ['el ordenador', '电脑'], ['la computadora', '电脑']],
      questions: [
        quiz('同伴问 ¿Tienes tu celular contigo?，他通常在问什么？', ['你有没有带充电线', '你有没有带手机', '你住在哪里'], '你有没有带手机', '在许多拉美地区，celular 是手机的常见说法。'),
        quiz('哪一组通常指同一种设备？', ['billete / mesa', 'ordenador / computadora', 'móvil / pantalla'], 'ordenador / computadora', '这两个词都能表示电脑，使用习惯因地区而异。')
      ],
      task: '同伴说了一个你不熟悉的地区用词。试着复述并询问它是否指电脑。',
      model: 'Perdona, cuando dices “ordenador”, ¿te refieres a una computadora?'
    },
    {
      id: 25, title: '卡壳了也能继续聊', goal: '在没听清、忘词或想确认意思时维持对话。',
      lesson: '没听清时可以请对方放慢速度。忘记一个名词时，用 sirve para… 解释用途；想确认时，用 ¿Quieres decir que…? 复述。每次只解决一个小障碍，对话就能继续。',
      examples: [['¿Puedes repetir la última parte más despacio?', '最后一段能慢些再说一遍吗？'], ['No recuerdo el nombre. Sirve para abrir botellas.', '我想不起名字，它是用来开瓶子的。']],
      words: [['repetir', '重复'], ['más despacio', '慢一点'], ['querer decir', '意思是'], ['servir para', '用于']],
      questions: [
        quiz('对方说得太快，你希望他再说一次。选出合适的话。', ['¿Puedes repetirlo más despacio?', '¿Cuánto es en total?', '¿Te gusta viajar?'], '¿Puedes repetirlo más despacio?', 'repetirlo 表示再说一遍，más despacio 表示更慢一些。'),
        quiz('想不起“雨伞”，哪句能借用途说明？', ['Está debajo del puente.', 'Me llamo Rosa.', 'Sirve para protegerse de la lluvia.'], 'Sirve para protegerse de la lluvia.', '说明用来挡雨，即使没有说出 paraguas，对方也可能猜到。')
      ],
      task: '假装你忘了“剪刀”怎么说。先承认忘词，再说明用途，请对方告诉你名字。',
      model: 'No recuerdo la palabra. Sirve para cortar papel. ¿Cómo se llama?'
    },
    {
      id: 26, title: '完成一次真实邀约', goal: '把自我介绍、过去经历、未来打算和协商连成一段对话。',
      lesson: '先说明共同话题，再用一个已完成的事件作铺垫，最后提出可以落实的安排。对方给出时间或地点时，复述关键信息确认。复听后检查动词时间和双方约定是否清楚。',
      examples: [['La última vez fuimos al cine. ¿Qué hacemos esta vez?', '上次我们去看了电影，这次做什么？'], ['Entonces, ¿quedamos a las seis junto al teatro?', '那么，我们六点在剧院旁边见吗？']],
      words: [['quedar', '约好见面'], ['proponer', '提议'], ['de acuerdo', '同意；好'], ['confirmar', '确认']],
      questions: [
        quiz('表达“上个月去过那家店，下周会再去”。哪组动词符合时间？', ['iré / fui', 'fui / volveré', 'voy / volví'], 'fui / volveré', 'fui 讲已完成的过去，volveré 说明将来会回去。'),
        quiz('同伴说 Nos vemos el jueves a las ocho en la plaza。你该如何核对约定？', ['¿Te gustan las montañas?', 'Nunca fui a clase.', 'Entonces, el jueves a las ocho en la plaza, ¿verdad?'], 'Entonces, el jueves a las ocho en la plaza, ¿verdad?', '复述星期、时间、地点，并用 ¿verdad? 请求确认。')
      ],
      task: '邀请新朋友周末外出。说说上次的活动，提一个不同的建议，再确定见面时间。',
      model: 'La semana pasada visité el museo. Este sábado podríamos pasear por el puerto. ¿Quedamos allí a las diez?'
    }
  ].map(week => ({ ...week, resources: [source] }));
})();
