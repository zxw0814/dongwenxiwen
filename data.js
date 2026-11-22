window.GEO_DATA = {
  "models": [
    {
      "id": "GEO-TER-001",
      "title": "等高线地形模型",
      "kind": "terrain",
      "category": "地形",
      "chapter": "必修一 · 第一章",
      "level": "高中",
      "tags": [
        "等高线",
        "山脊",
        "山谷",
        "鞍部"
      ],
      "summary": "分层设色叠加等高线，可旋转观察山脊、山谷与坡度变化。",
      "legend": [
        "等高距 100 米",
        "绿色低地 → 棕色高山",
        "线条为等高线"
      ],
      "note": "先读等高距，再判地形部位，最后用疏密看坡度。",
      "updated": "2026-11-12"
    },
    {
      "id": "GEO-TER-002",
      "title": "陡坡与缓坡对比",
      "kind": "terrain-compare",
      "category": "地形",
      "chapter": "必修一 · 第一章",
      "level": "高中",
      "tags": [
        "坡度",
        "等高线疏密",
        "对比"
      ],
      "summary": "同一等高距下，等高线越密坡度越陡，可左右对照观察。",
      "legend": [
        "左：缓坡",
        "右：陡坡",
        "等高距相同"
      ],
      "note": "让学生先看线条疏密，再用手势比划坡度。",
      "updated": "2026-11-10"
    },
    {
      "id": "GEO-EAR-001",
      "title": "地球自转与昼夜交替",
      "kind": "globe",
      "category": "地球运动",
      "chapter": "必修一 · 第一章",
      "level": "高中",
      "tags": [
        "自转",
        "昼夜",
        "晨昏线"
      ],
      "summary": "可拖动旋转的地球，演示自转方向与昼夜半球。",
      "legend": [
        "灯光方向为太阳",
        "明暗交界为晨昏线",
        "自西向东自转"
      ],
      "note": "把地球停在某个经度，让学生说出昼夜状态。",
      "updated": "2026-11-08"
    },
    {
      "id": "GEO-EAR-002",
      "title": "太阳直射点回归运动",
      "kind": "globe",
      "category": "地球运动",
      "chapter": "必修一 · 第一章",
      "level": "高中",
      "tags": [
        "太阳高度",
        "回归线",
        "四季"
      ],
      "summary": "地球模型叠加纬线，配合直射点讲解四季变化。",
      "legend": [
        "赤道与回归线",
        "地轴倾角 23.5°",
        "直射点在南北回归线间移动"
      ],
      "note": "配合时间轴提问：此时北半球是什么季节？",
      "updated": "2026-11-06"
    },
    {
      "id": "GEO-ATM-001",
      "title": "气压带与风带",
      "kind": "static",
      "svg": "atmosphere",
      "category": "大气",
      "chapter": "必修一 · 第二章",
      "level": "高中",
      "tags": [
        "三圈环流",
        "气压带",
        "风带"
      ],
      "summary": "以示意图呈现七个气压带与六个风带的分布。",
      "legend": [
        "红色为低压带",
        "蓝色为高压带",
        "箭头为近地面风向"
      ],
      "note": "先记分布，再用「高低压相间」帮助记忆。",
      "updated": "2026-11-04"
    },
    {
      "id": "GEO-ATM-002",
      "title": "气温曲线与降水柱状图",
      "kind": "static",
      "svg": "climate",
      "category": "气候",
      "chapter": "必修一 · 第二章",
      "level": "高中",
      "tags": [
        "气候判读",
        "气温",
        "降水"
      ],
      "summary": "典型气候统计图，用于判读气候类型与季节分配。",
      "legend": [
        "曲线为月均温",
        "柱状为月降水",
        "左轴 ℃ / 右轴 mm"
      ],
      "note": "先看最冷月气温，再看降水季节分配。",
      "updated": "2026-11-02"
    },
    {
      "id": "GEO-OCE-001",
      "title": "洋流分布示意",
      "kind": "static",
      "svg": "ocean",
      "category": "海洋",
      "chapter": "必修一 · 第三章",
      "level": "高中",
      "tags": [
        "洋流",
        "环流",
        "寒暖流"
      ],
      "summary": "用箭头表示主要洋流方向，区分寒流与暖流。",
      "legend": [
        "红色箭头为暖流",
        "蓝色箭头为寒流",
        "虚线为赤道"
      ],
      "note": "结合渔场分布提问：寒暖流交汇处为什么多渔场？",
      "updated": "2026-10-30"
    },
    {
      "id": "GEO-HUM-001",
      "title": "人口金字塔",
      "kind": "static",
      "svg": "pyramid",
      "category": "人文",
      "chapter": "必修二 · 第一章",
      "level": "高中",
      "tags": [
        "人口结构",
        "增长模式",
        "老龄化"
      ],
      "summary": "左右对称的年龄性别结构图，用于判断人口增长模式。",
      "legend": [
        "左男右女",
        "横轴为人口占比",
        "纵轴为年龄段"
      ],
      "note": "先看底部宽度，再看顶部比例。",
      "updated": "2026-10-28"
    },
    {
      "id": "GEO-PROC-001",
      "title": "程序化 · 马荣火山（轻量版）",
      "kind": "procedural",
      "category": "地形",
      "chapter": "必修一 · 第一章",
      "level": "高中",
      "tags": [
        "img2threejs",
        "程序化",
        "轻量"
      ],
      "summary": "img2threejs 生成的纯代码模型，约 22KB、无外部贴图，秒开，适合低配设备与弱网教室。",
      "legend": [
        "程序化几何",
        "无外部贴图",
        "秒开"
      ],
      "note": "体积小、秒开、细节更概括；适合先讲结构，再结合真实地形数据或剖面图补充细节。",
      "updated": "2026-11-16",
      "preview": "models/mayon_proc_preview.png",
      "factory": "MayonFactory",
      "generated": true
    },
    {
      "id": "GEO-FOLD-001",
      "title": "褶皱山脉的形成",
      "kind": "fold",
      "category": "地形",
      "chapter": "必修一 · 第一章",
      "level": "高中",
      "tags": [
        "褶皱",
        "背斜",
        "向斜",
        "板块挤压"
      ],
      "summary": "可交互的三维地层块：拖动观察岩层，播放挤压过程，理解背斜与向斜的形成。",
      "legend": [
        "背斜：岩层向上拱起",
        "向斜：岩层向下弯曲",
        "箭头：水平挤压"
      ],
      "note": "先播放形成过程，再让学生指出背斜与向斜；用挤压滑杆停在中间状态提问。",
      "updated": "2026-11-16",
      "preview": "models/fold_mountain_preview.png",
      "generated": true
    }
  ],
  "analysisSamples": {
    "contour": {
      "label": "等高线地形图",
      "confidence": 92,
      "figureNote": "识别到闭合曲线、高程注记与陡崖符号，判断为等高线地形图。",
      "chapter": "必修一 · 第一章 宇宙中的地球",
      "kps": [
        "等高线判读",
        "山脊与山谷",
        "坡度与等高线疏密",
        "鞍部与陡崖"
      ],
      "hard": [
        "山脊与山谷的凸出方向容易混淆",
        "陡崖相对高度需要按公式计算"
      ],
      "misconceptions": [
        "把等高线向海拔高处凸出误判为山脊",
        "忽略等高距，直接相减图上距离"
      ],
      "models": [
        "GEO-TER-001",
        "GEO-TER-002"
      ],
      "script": "先读图名、比例尺和等高距，再沿等高线走向判断地形部位，最后用线条疏密比较坡度。"
    },
    "climate": {
      "label": "气温曲线与降水柱状图",
      "confidence": 87,
      "figureNote": "识别到 12 个月份坐标、折线与柱状组合，判断为气候统计图。",
      "chapter": "必修一 · 第二章 地球上的大气",
      "kps": [
        "气温曲线判读",
        "降水季节分配",
        "气候类型判断"
      ],
      "hard": [
        "最冷月气温与降水季节的组合判断",
        "南北半球季节相反"
      ],
      "misconceptions": [
        "只看降水总量忽略季节分配",
        "把地中海气候与亚热带季风气候混淆"
      ],
      "models": [
        "GEO-ATM-002",
        "GEO-ATM-001"
      ],
      "script": "先看最冷月气温定温度带，再看降水季节分配定类型，最后用两地对比验证。"
    },
    "pyramid": {
      "label": "人口金字塔",
      "confidence": 84,
      "figureNote": "识别到左右对称的横向条形结构与年龄段刻度，判断为人口金字塔。",
      "chapter": "必修二 · 第一章 人口的变化",
      "kps": [
        "人口年龄结构",
        "人口增长模式",
        "老龄化判断"
      ],
      "hard": [
        "区分增长型、稳定型与缩减型",
        "结合抚养比解释社会影响"
      ],
      "misconceptions": [
        "把塔基宽直接等同于人口总数大",
        "忽略横轴是占比而非绝对数量"
      ],
      "models": [
        "GEO-HUM-001"
      ],
      "script": "先看塔基宽度判断增长趋势，再看顶部比例判断老龄化，最后联系劳动人口与抚养比。"
    }
  },
  "questionSamples": [
    {
      "key": "contour",
      "label": "等高线相对高度",
      "text": "读某地等高线地形图（等高距 100 米），甲地位于山顶，乙地位于山谷，两地之间相隔 4 条等高线。判断甲、乙两地的相对高度范围，并说明理由。"
    },
    {
      "key": "climate",
      "label": "气候类型判断",
      "text": "下图为某地气温曲线与降水柱状图，最冷月均温约 8℃，降水集中在冬季。判断该地的气候类型，并说明判断依据。"
    },
    {
      "key": "pyramid",
      "label": "人口金字塔判读",
      "text": "下图为某国人口金字塔，塔基较窄、顶部比例较大。判断该国人口增长模式，并分析可能带来的社会经济问题。"
    }
  ],
  "questionAnalysis": {
    "contour": {
      "kps": [
        "相对高度计算",
        "山谷判读",
        "等高线判读"
      ],
      "hard": "把「相对高度」与「海拔」混为一谈，忘记先确定等高距。",
      "steps": [
        "读出甲、乙所在等高线的数值，确认等高距 d = 100 米。",
        "确定两地之间相隔的等高线条数 n = 4。",
        "套用公式 (n−1)d < ΔH < (n+1)d。",
        "代入得 300 米 < ΔH < 500 米，再用山谷位置校验。"
      ],
      "pitfalls": [
        "直接读图上距离并当成实际高差",
        "公式中的 n 取错，把等高线数当成交点"
      ],
      "modelId": "GEO-TER-001",
      "summary": "本题以等高线判读为外壳，真正考的是相对高度公式与山谷识别。",
      "answer": "300 米 < 相对高度 < 500 米（示例）"
    },
    "climate": {
      "kps": [
        "气温曲线判读",
        "降水季节分配",
        "气候类型判断"
      ],
      "hard": "最冷月气温与降水季节的组合判断，容易漏看南北半球。",
      "steps": [
        "看最冷月气温：约 8℃，属于亚热带或温带海洋性气候区。",
        "看降水季节：集中在冬季，夏季干燥。",
        "匹配气候类型：地中海气候。",
        "补充依据：雨热不同期，典型的地中海气候特征。"
      ],
      "pitfalls": [
        "只背气候名称，不会用气温与降水组合验证",
        "把冬雨型误判为温带海洋性气候"
      ],
      "modelId": "GEO-ATM-002",
      "summary": "气候判读的关键是「先定温度带，再定降水型」，两条线索交叉验证。",
      "answer": "地中海气候（示例）"
    },
    "pyramid": {
      "kps": [
        "人口年龄结构",
        "人口增长模式",
        "老龄化"
      ],
      "hard": "把塔基宽度与人口总量混为一谈，忽略横轴是占比。",
      "steps": [
        "看塔基：底部较窄，说明出生率较低。",
        "看顶部：老年人口比例较大，说明老龄化明显。",
        "判断模式：低出生、低死亡、低增长的现代型。",
        "分析影响：劳动力不足、养老负担加重。"
      ],
      "pitfalls": [
        "把占比图当成人口数量图",
        "只描述形状，不联系增长模式"
      ],
      "modelId": "GEO-HUM-001",
      "summary": "人口金字塔判读要抓两端：塔基看出生，塔顶看老龄化。",
      "answer": "现代型人口增长模式（示例）"
    }
  },
  "knowledgeOptions": [
    "等高线地形图的判读",
    "地球自转与昼夜交替",
    "太阳高度角的变化",
    "气压带与风带",
    "洋流分布规律",
    "人口增长模式"
  ],
  "courseware": {
    "title": "等高线地形图的判读",
    "subject": "人教版 · 必修一 · 第一章",
    "scenes": [
      {
        "id": "s1",
        "type": "intro",
        "title": "课堂导入",
        "text": "如果把你脚下的山地压成一张平面图，它会是什么样子？今天我们从一张等高线图开始，把平面的线条重新立起来。"
      },
      {
        "id": "s2",
        "type": "model",
        "title": "模型演示：地形部位",
        "modelId": "GEO-TER-001",
        "steps": [
          "等高线是海拔相同的点连成的线，等高距决定相邻两条线的高差。",
          "山脊：等高线向海拔低处凸出，脊线往往是分水岭。",
          "山谷：等高线向海拔高处凸出，谷线往往发育河流。",
          "鞍部：两个山顶之间的低地，常是交通通道。"
        ]
      },
      {
        "id": "s3",
        "type": "compare",
        "title": "对比与变式：坡度",
        "modelId": "GEO-TER-002",
        "text": "同一条等高距下，等高线越密集，坡度越陡；越稀疏，坡度越缓。请学生用手势比一比两种坡面。"
      },
      {
        "id": "s4",
        "type": "quiz",
        "title": "课堂练习",
        "quiz": {
          "q": "图中等高线向海拔高处凸出的部位是？",
          "options": [
            "山脊",
            "山谷",
            "鞍部",
            "陡崖"
          ],
          "answer": 1,
          "explain": "山谷处等高线向海拔高处凸出，谷线往往发育河流。"
        }
      },
      {
        "id": "s5",
        "type": "summary",
        "title": "小结",
        "text": "先读等高距与比例尺，再判地形部位，最后用线条疏密比较坡度。把这三步写进你的读图顺序里。"
      }
    ]
  },
  "chapters": [
    {
      "id": "CH01",
      "category": "地球与地图",
      "title": "地球与地图基础",
      "summary": "从地球形状与经纬网到地图三要素，用可旋转地球和地图工具建立空间定位基础。",
      "href": "chapters/ch01.html",
      "preview": "chapters/previews/ch01.png",
      "tags": [
        "经纬网",
        "地图三要素",
        "地球形状"
      ],
      "meta": "10 节 · 单文件离线"
    },
    {
      "id": "CH02",
      "category": "大气",
      "title": "地球上的大气",
      "summary": "从大气受热到热力环流、风与天气系统，用双层风场和气压场把大气运动讲成可操作的实验。",
      "href": "chapters/ch02.html",
      "preview": "chapters/previews/ch02.png",
      "tags": [
        "热力环流",
        "风",
        "天气系统"
      ],
      "meta": "10 节 · 单文件离线"
    },
    {
      "id": "CH03",
      "category": "水",
      "title": "地球上的水",
      "summary": "以水循环和洋流为主线，用流线、粒子和剖面观察水量交换与环流规律。",
      "href": "chapters/ch03.html",
      "preview": "chapters/previews/ch03.png",
      "tags": [
        "水循环",
        "洋流",
        "水量平衡"
      ],
      "meta": "10 节 · 单文件离线"
    },
    {
      "id": "CH04",
      "category": "地貌",
      "title": "喀斯特地貌",
      "summary": "地表—地下连续地质体，可拖动剖切面观察溶洞、地下河与岩溶过程。",
      "href": "chapters/ch04.html",
      "preview": "chapters/previews/ch04.png",
      "tags": [
        "溶洞",
        "地下河",
        "剖切"
      ],
      "meta": "10 节 · 单文件离线"
    },
    {
      "id": "CH05",
      "category": "地貌",
      "title": "褶皱山脉 · 喜马拉雅",
      "summary": "真实 SRTM 地形加上可拖动剖切面，用挤压和岩层硬度讲背斜、向斜与“背斜成谷、向斜成山”。",
      "href": "chapters/ch05.html",
      "preview": "chapters/previews/ch05.png",
      "tags": [
        "褶皱",
        "喜马拉雅",
        "背斜",
        "向斜",
        "剖切"
      ],
      "meta": "6 步 · 单文件离线"
    },
    {
      "id": "CH06",
      "category": "地貌",
      "title": "断层与地垒地堑",
      "summary": "用华山北坡与汾河盆地的真实 SRTM 地形、影像，结合 Blender 分层断块形变模型，观察断层崖、上下盘、地垒与地堑。",
      "href": "chapters/ch06.html",
      "preview": "chapters/previews/ch06.png",
      "tags": [
        "断层崖",
        "上下盘",
        "地垒",
        "地堑"
      ],
      "meta": "6 步 · 真实数据"
    },
    {
      "id": "CH07",
      "category": "地貌",
      "title": "河流地貌的发育",
      "summary": "用虎跳峡、荆江、长江口的真实 SRTM 地形与卫星影像，观察 V 形谷、曲流、牛轭湖与三角洲；演化与沉积生长为教学模拟。",
      "href": "chapters/ch07.html",
      "preview": "chapters/previews/ch07.png",
      "tags": [
        "V 形谷",
        "曲流",
        "牛轭湖",
        "三角洲"
      ],
      "meta": "6 步 · 真实数据"
    },
    {
      "id": "CH08",
      "category": "地貌",
      "title": "风沙地貌",
      "summary": "用沙丘坡形、颗粒跃移与沙丘迁移，区分风蚀地貌与风积地貌，并联系草方格固沙。",
      "href": "chapters/ch08.html",
      "preview": "chapters/previews/ch08.png",
      "tags": [
        "沙丘",
        "迎风坡背风坡",
        "风蚀",
        "草方格"
      ],
      "meta": "6 步 · 单文件离线"
    },
    {
      "id": "CH09",
      "category": "地貌",
      "title": "海岸侵蚀地貌",
      "summary": "实拍扫描的崖壁与海岸（Poly Haven CC0 摄影测量）+ 高精度岬角模型：拖动侵蚀时间，看海蚀洞、拱桥、海蚀柱与残墩的完整序列。",
      "href": "chapters/ch09.html",
      "preview": "chapters/previews/ch09.png",
      "tags": [
        "实拍扫描",
        "海蚀拱桥",
        "海蚀柱",
        "演化序列"
      ],
      "meta": "6 步 · 实拍扫描"
    },
    {
      "id": "CH10",
      "category": "水",
      "title": "洋流与海水运动",
      "summary": "用 HYCOM 表层流场、ETOPO1 海底地形和 Esri 卫星影像，观察副热带环流、西边界流、上升流与季风变化。",
      "href": "chapters/ch10.html",
      "preview": "chapters/previews/ch10.png",
      "tags": [
        "洋流",
        "西边界流",
        "上升流",
        "HYCOM"
      ],
      "meta": "6 步 · 真实数据"
    },
    {
      "id": "CH11",
      "category": "地貌",
      "title": "风沙地貌",
      "summary": "用巴丹吉林沙漠真实 SRTM 地形、Sentinel-2 影像与 NASA POWER 2024 小时风场，观察沙丘形态、风玫瑰、迎风坡/背风坡与迁移。",
      "href": "chapters/ch11.html",
      "preview": "chapters/previews/ch11.png",
      "tags": [
        "沙丘",
        "风玫瑰",
        "输沙势",
        "巴丹吉林"
      ],
      "meta": "6 步 · 真实数据"
    },
    {
      "id": "CH12",
      "category": "地貌",
      "title": "冰川地貌的形成",
      "summary": "用用户提供的冰川山地块体建模，拖动冰进程度看冰舌推进/后退，冰斗后退、刃脊与角峰显现、谷底由 V 形展宽为 U 形，冰退后终碛保留。",
      "href": "chapters/ch12.html",
      "preview": "chapters/previews/ch12.png",
      "tags": [
        "用户建模",
        "冰斗",
        "角峰",
        "U 形谷"
      ],
      "meta": "6 步 · 用户建模"
    },
    {
      "id": "CH13",
      "category": "地貌",
      "title": "丹霞地貌的形成",
      "summary": "用用户提供的丹霞红层块体做真实的顶点侵蚀：拖动侵蚀时间，台地沿节理被切出沟谷、崖壁后退、崖脚崩塌，最后分离成峰丛与石柱；右侧切换岩性、抬升、降水、节理，山体形态会随之改变。",
      "href": "chapters/ch13.html",
      "preview": "chapters/previews/ch13.png",
      "tags": [
        "用户建模",
        "红层",
        "真侵蚀",
        "峰丛"
      ],
      "meta": "6 步 · 真侵蚀"
    },
    {
      "id": "CH14",
      "category": "大气",
      "title": "台风的形成",
      "summary": "用用户提供的台风云系剖面模型，叠加暖湿气流、凝结潜热、地转偏向、眼壁与螺旋雨带；拖动形成阶段并切换海温、水汽、地转偏向力、风切变，观察台风结构与强度变化。",
      "href": "chapters/ch14.html",
      "preview": "chapters/previews/ch14.png",
      "tags": ["用户建模","台风眼","云墙","螺旋雨带"],
      "meta": "6 步 · 用户建模"
    }
  ]
};
