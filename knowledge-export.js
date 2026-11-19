(function () {
  "use strict";

  var building = false;

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function currentPayload() {
    var value = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : "";
    };
    var resultTitle = document.querySelector("#kResult h3");
    var topic = resultTitle ? resultTitle.textContent.trim() : value("kTopic");
    return {
      topic: topic || value("kTopic") || "地理知识点",
      chapter: value("kChapter") || "必修一 · 第一章",
      level: value("kLevel") || "高中",
      focus: value("kFocus") || "理解核心概念与空间关系",
      difficulty: value("kDifficulty") || "把抽象概念与可见证据对应起来",
      viz: value("kViz") || "terrain",
      compare: !!(document.getElementById("kCompare") && document.getElementById("kCompare").checked)
    };
  }

  function sceneTypeFor(payload) {
    var text = [payload.topic, payload.focus, payload.difficulty].join(" ");
    if (/地球|太阳|昼夜|晨昏|公转|自转|太阳高度/.test(text)) return "globe";
    if (/大气|气压|热力环流|天气|气温|锋面|气旋/.test(text)) return "atmosphere";
    if (/断层|地垒|地堑|岩层错动|板块挤压|褶皱/.test(text)) return "fault";
    if (/河流|河谷|冲积扇|三角洲|曲流|凹岸|凸岸|下切/.test(text)) return "river";
    if (/风沙|沙丘|风蚀|风力搬运/.test(text)) return "aeolian";
    if (/海岸|海蚀|海浪|波浪|沙滩|海积/.test(text)) return "coastal";
    if (/水循环|洋流|径流|流域|湖泊|地下水/.test(text)) return "water";
    if (/人口|城市|城镇|产业|农业|工业|交通|区位|区域|环境/.test(text)) return "human";
    if (payload.viz === "globe") return "globe";
    return "terrain";
  }

  function sceneProfile(type, payload) {
    var profiles = {
      terrain: {
        anchor: "海拔、坡度、起伏方向；所有数值为教学示意",
        observe: "先看地形轮廓与分层设色，再找山脊、山谷、陡坡和缓坡。",
        operate: "拖动场景旋转，调整场景参数，比较不同高度与起伏下的空间关系。",
        pattern: "同一个地形部位，要同时用位置、等高线疏密和高程证据判断。",
        transfer: "换一个坡向或起伏条件，原来的判断是否仍成立？请说出证据。"
      },
      globe: {
        anchor: "太阳方向、昼夜半球、纬度与晨昏线",
        observe: "先确定太阳方向和光照方向，再判断昼夜半球与晨昏线位置。",
        operate: "调整参数，观察地球、太阳方向和明暗交界线的联动变化。",
        pattern: "昼夜状态由太阳光照方向与地球自转共同决定，不能只看经度。",
        transfer: "同一纬度在一天中的不同时刻，太阳高度和昼夜状态会怎样变化？"
      },
      atmosphere: {
        anchor: "温度、气压、风向、垂直分层与水平运动",
        observe: "先看地面冷热差异，再追踪空气的垂直运动和水平运动。",
        operate: "切换冷热源或调整参数，观察气压变化、环流方向和箭头变化。",
        pattern: "热力环流从冷热不均开始，气压差推动空气运动，风再受偏转和摩擦影响。",
        transfer: "如果把冷热源对调，近地面气压和风向会怎样改变？"
      },
      water: {
        anchor: "水量、流速、流向、季节变化与流域关系",
        observe: "先找水体、流向和补给关系，再观察水量的季节变化。",
        operate: "调整流量或季节参数，观察水面、流向与曲线是否同步变化。",
        pattern: "水体变化要同时看补给来源、季节和人类活动，不能只凭一张图判断。",
        transfer: "若流域降水减少或用水增加，水量平衡会先在哪一环出现变化？"
      },
      human: {
        anchor: "空间分布、比例、区位因素与时间变化",
        observe: "先看空间分布与比例，再寻找影响布局的主导区位因素。",
        operate: "调整指标或区域参数，观察柱体、分布和解释文本的联动。",
        pattern: "人文地理结论要区分事实、机制和价值判断，不能把相关性直接当成因果。",
        transfer: "如果交通、市场或资源条件发生变化，空间布局会怎样调整？"
      },
      fault: {
        anchor: "断层面、岩层错动方向与位移量；教学示意",
        observe: "先找断层面，再比较两侧岩层的连续性和上下位移。",
        operate: "调整挤压参数，观察上盘相对下盘错动后形成的地垒与地堑。",
        pattern: "断层地貌的结论来自岩层错动方向和相对位移，不能只看现在的起伏。",
        transfer: "如果岩层位移方向相反，地垒和地堑的位置会怎样改变？"
      },
      river: {
        anchor: "坡度、河谷形态、流速、凹岸与凸岸",
        observe: "沿河从上到下观察河谷宽窄、坡度和水流方向。",
        operate: "调整流速参数，观察下切侵蚀、侧蚀和凸岸堆积的变化。",
        pattern: "河流地貌由流量、坡度和岩性共同控制，侵蚀与堆积常在同一河段同时发生。",
        transfer: "若上游坡度减小，河流的侵蚀和堆积会分别怎样调整？"
      },
      aeolian: {
        anchor: "风向、沙丘坡度、粒径与迁移距离",
        observe: "先判断风向，再比较沙丘迎风坡和背风坡的坡度。",
        operate: "调整风速，观察颗粒跃移、沙丘迁移和坡形变化。",
        pattern: "风沙地貌的形态取决于风向、风速和沙源，迎风坡缓、背风坡陡。",
        transfer: "如果植被覆盖增加或风速减弱，沙丘迁移会怎样变化？"
      },
      coastal: {
        anchor: "波浪作用、海蚀崖、海蚀平台与堆积地貌",
        observe: "先分清水域和陆地的交界，再寻找崖壁、凹槽和平台。",
        operate: "提高波浪侵蚀强度，观察海蚀崖后退和海蚀平台展宽。",
        pattern: "海岸地貌是波浪侵蚀与堆积共同作用的结果，岩性和海平面也会改变形态。",
        transfer: "若海岸岩性变软或海平面上升，海蚀崖和平台会怎样变化？"
      }
    };
    var profile = profiles[type] || profiles.terrain;
    profile.topic = payload.topic;
    profile.focus = payload.focus;
    profile.difficulty = payload.difficulty;
    return profile;
  }

  function quizFor(type, payload) {
    var quizzes = {
      terrain: {
        q: "判断坡度陡缓时，最可靠的直接证据是什么？",
        options: ["颜色深浅", "等高线疏密", "图幅大小", "文字标题"],
        answer: 1,
        explain: "同一等高距下，等高线越密，坡度越陡。"
      },
      globe: {
        q: "判断某地处于昼半球还是夜半球，首先应确认什么？",
        options: ["当地经度", "太阳光照方向", "城市数量", "地表植被"],
        answer: 1,
        explain: "昼夜半球的边界由太阳光照方向和地球球面共同决定。"
      },
      atmosphere: {
        q: "热力环流中，近地面空气由高压流向低压，直接推动它的是？",
        options: ["气温本身", "水平气压梯度力", "地转偏向力", "植被覆盖"],
        answer: 1,
        explain: "水平气压梯度力是形成风的直接原因，其他力主要改变风向或速度。"
      },
      water: {
        q: "判断河流某季节流量变化时，最需要结合哪组信息？",
        options: ["河流名字", "补给类型与降水季节", "地图比例尺", "城市人口"],
        answer: 1,
        explain: "流量变化取决于补给来源及其季节分配。"
      },
      human: {
        q: "分析产业区位选择时，下列哪项最关键？",
        options: ["只看地图颜色", "比较多个区位因素及其权重", "只看企业名称", "只看土地面积"],
        answer: 1,
        explain: "区位选择通常由多个因素共同决定，需要比较主导因素和限制条件。"
      },
      fault: {
        q: "判断地垒和地堑时，最关键的直接证据是什么？",
        options: ["地表颜色", "两侧岩层的相对位移方向", "植被类型", "河流长度"],
        answer: 1,
        explain: "地垒是中间岩块相对上升，地堑是中间岩块相对下降，核心证据是岩层位移。"
      },
      river: {
        q: "河流凹岸通常以侵蚀为主，最直接的原因是什么？",
        options: ["水深更浅", "流速较快、水流冲向凹岸", "植被更多", "坡度更小"],
        answer: 1,
        explain: "弯道水流受惯性影响冲向凹岸，凹岸流速快、侵蚀强；凸岸流速慢、堆积强。"
      },
      aeolian: {
        q: "新月形沙丘通常哪一侧更陡？",
        options: ["迎风坡", "背风坡", "两侧一样陡", "与风向无关"],
        answer: 1,
        explain: "沙粒越过丘顶后在背风侧堆积，背风坡通常更陡。"
      },
      coastal: {
        q: "海蚀崖不断后退，主要与哪种作用有关？",
        options: ["波浪侵蚀", "风力堆积", "河流沉积", "冰川搬运"],
        answer: 0,
        explain: "波浪冲击、磨蚀和溶蚀会掏空崖脚，导致上部岩体崩塌，海蚀崖后退。"
      }
    };
    return quizzes[type] || quizzes.terrain;
  }

  function buildSpec(payload) {
    var type = sceneTypeFor(payload);
    var profile = sceneProfile(type, payload);
    var quiz = quizFor(type, payload);
    var title = payload.topic || "地理知识点";
    return {
      title: title,
      book: payload.level || "高中",
      chapter: payload.chapter,
      coreQ: "怎样用可观察、可操作的证据解释「" + title + "」？",
      summary: "围绕“" + payload.focus + "”构建的交互式教学课件。先观察、再操作、最后用证据解释；" + payload.difficulty + "是本节课需要突破的关键。",
      sceneType: type,
      scene: type,
      steps: [
        {
          name: "情境导入",
          title: "先从一个真实空间问题开始",
          question: "如果只能保留一个观察角度，你会先看哪里？",
          action: "旋转场景，找到最醒目的地形、水体、光照或空间分布。",
          observation: profile.observe,
          conclusion: "先建立空间位置，再解释地理过程。",
          anchor: profile.anchor
        },
        {
          name: "空间定位",
          title: "把名称和位置对应起来",
          question: "图中的关键部位分别位于哪里？",
          action: "对照标注与场景，指出至少两个关键部位。",
          observation: "位置、方向和尺度关系开始变得清晰。",
          conclusion: "地理概念必须落在具体空间位置上。",
          anchor: profile.anchor
        },
        {
          name: "交互验证",
          title: "改变条件，观察什么在变",
          question: "参数变化后，哪些读数或形态先发生变化？",
          action: profile.operate,
          observation: "场景形态、标注和曲线随参数同步变化。",
          conclusion: "把变化过程与地理机制联系起来，而不是只记结论。",
          anchor: profile.anchor
        },
        {
          name: "寻找规律",
          title: "从变化中提炼判断依据",
          question: "变化背后共同遵循的规律是什么？",
          action: "连续调整参数，比较至少两种状态，记录相同点与不同点。",
          observation: profile.pattern,
          conclusion: "规律要能被重复观察，并能解释新的情形。",
          anchor: profile.anchor
        },
        {
          name: "迁移应用",
          title: "换一个情境再判断",
          question: profile.transfer,
          action: "先预测，再旋转场景或切换参数验证自己的判断。",
          observation: "同一地理原理可以迁移到不同区域和不同尺度。",
          conclusion: "从“会看”走向“会用”，并说明证据链。",
          anchor: profile.anchor
        },
        {
          name: "课堂自测",
          title: "用一道题检查证据意识",
          question: quiz.q,
          action: "选择答案，并说出你依据的场景证据。",
          observation: "答案不是终点，判断依据才是。",
          conclusion: "能用证据解释结论，才算真正掌握。",
          anchor: profile.anchor
        }
      ],
      misconceptions: [
        payload.difficulty,
        "只记结论，不看位置、方向和尺度",
        "把演示模型当成实测数据，忽略教学示意的边界"
      ],
      quiz: [quiz]
    };
  }

  function hydrateTemplate(template, threeSource, spec) {
    var values = {
      __TITLE__: escapeHTML(spec.title),
      __BOOK__: escapeHTML(spec.book),
      __CHAPTER__: escapeHTML(spec.chapter),
      __SCENE__: escapeHTML(spec.scene),
      __COREQ__: escapeHTML(spec.coreQ),
      __SUMMARY__: escapeHTML(spec.summary)
    };
    var html = template;
    Object.keys(values).forEach(function (key) {
      html = html.split(key).join(values[key]);
    });
    var specJSON = JSON.stringify(spec)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
    html = html.split("__SPEC__").join(specJSON);
    html = html.split("__THREE__").join(threeSource);
    return html;
  }

  function showMessage(text, isError) {
    var el = document.getElementById("chapterBuildToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "chapterBuildToast";
      el.style.cssText = "position:fixed;right:22px;bottom:22px;z-index:9999;max-width:360px;padding:11px 14px;border:1px solid rgba(73,214,197,.38);background:#0b1723;color:#dbe7f0;font:13px/1.6 'Microsoft YaHei',sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.28)";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.borderColor = isError ? "rgba(255,107,107,.55)" : "rgba(73,214,197,.38)";
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.hidden = true; }, 3200);
  }

  function previewChapter(spec) {
    var url = "chapter_preview.html#" + encodeURIComponent(JSON.stringify(spec));
    var popup = window.open(url, "_blank");
    if (!popup) showMessage("浏览器拦截了新标签页，请允许弹窗后重试。", true);
    return popup;
  }

  async function buildChapter(openPreview) {
    if (building) return;
    if (openPreview) {
      var previewSpec = buildSpec(currentPayload());
      previewChapter(previewSpec);
      showMessage("已打开课堂预览：可切换步骤、拖动滑杆并完成自测。");
      return;
    }
    building = true;
    var buttons = document.querySelectorAll("#kExportChapter, #kPreviewChapter");
    buttons.forEach(function (button) { button.disabled = true; });
    var popup = openPreview ? window.open("", "_blank") : null;
    if (popup) {
      popup.document.write("<!doctype html><meta charset='utf-8'><title>正在打包课件</title><body style='background:#050d15;color:#dbe7f0;font:15px sans-serif;padding:40px'>正在打包单文件交互课件…</body>");
    }
    try {
      var responses = await Promise.all([
        fetch("templates/chapter_template.html", { cache: "no-store" }),
        fetch("vendor/three.min.js", { cache: "no-store" })
      ]);
      if (!responses[0].ok || !responses[1].ok) throw new Error("课件模板或 Three.js 资源加载失败");
      var payload = currentPayload();
      var spec = buildSpec(payload);
      var template = await responses[0].text();
      var threeSource = await responses[1].text();
      var html = hydrateTemplate(template, threeSource, spec);
      var blob = new Blob([html], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      if (openPreview) {
        if (popup) popup.location.href = url;
        else window.open(url, "_blank");
        showMessage("课件已完成，可在新标签页中操作和验证。");
      } else {
        var fileName = (payload.topic || "地理知识点").replace(/[\\/:*?"<>|]+/g, "-") + "-交互课件.html";
        var link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        showMessage("已导出 " + fileName);
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    } catch (error) {
      if (popup) popup.close();
      showMessage("导出失败：" + error.message + "。请先运行 web/start_server.bat，再通过本地地址打开页面。", true);
    } finally {
      building = false;
      buttons.forEach(function (button) { button.disabled = false; });
    }
  }

  window.__GEO_CHAPTER_EXPORT__ = { buildSpec: buildSpec, hydrateTemplate: hydrateTemplate, sceneTypeFor: sceneTypeFor, previewChapter: previewChapter };
  document.addEventListener("click", function (event) {
    var preview = event.target.closest("#kPreviewChapter");
    if (preview) {
      event.preventDefault();
      buildChapter(true);
      return;
    }
    var exportButton = event.target.closest("#kExportChapter");
    if (exportButton) {
      event.preventDefault();
      buildChapter(false);
    }
  });
})();
