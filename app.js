/* ============================================================
   东问西问 XW GEO · 教学演示工作台 — 交互逻辑
   本地优先：后端可用时调用接口，离线时回退演示；知识点结果可导出单文件课件
   ============================================================ */
(function () {
  "use strict";

  var DATA = window.GEO_DATA;
  var hasThree = typeof window.THREE !== "undefined";
  var view = document.getElementById("view");
  var modal = document.getElementById("modal");
  var modalTitle = document.getElementById("modalTitle");
  var modalEyebrow = document.getElementById("modalEyebrow");
  var modalBody = document.getElementById("modalBody");
  var classroom = document.getElementById("classroom");
  var classroomStage = document.getElementById("classroomStage");
  var toastEl = document.getElementById("toast");
  var rail = document.getElementById("rail");
  var railScrim = document.getElementById("railScrim");

  var state = {
    view: "library",
    query: "",
    category: "全部",
    level: "全部",
    prefill: null,
    models: DATA.models.slice(),
    apiOnline: false,
    providers: null,
    saveTimer: null,
    courseware: clone(DATA.courseware),
    activeSceneId: DATA.courseware.scenes[0].id,
    classroom: { index: 0, step: 0, open: false },
    timers: [],
    viewers: [],
    contour: null,
    toastTimer: null
  };

  var VIEW_NAMES = {
    dashboard: "工作台",
    library: "课件库",
    analysis: "识图分析",
    knowledge: "知识点模型化",
    question: "题目模型化",
    courseware: "课件编排",
    prep: "备课包"
  };

  var FLOWS = [
    { view: "analysis", code: "01", name: "识图分析", desc: "上传课本插图，识别图型、知识点与易错点。" },
    { view: "knowledge", code: "02", name: "知识点模型化", desc: "输入知识点与重难点，生成可交互三维场景。" },
    { view: "question", code: "03", name: "题目模型化", desc: "上传题目，拆解考点、步骤与易错点。" },
    { view: "courseware", code: "04", name: "课件编排", desc: "把模型、对比与练习排成一节课。" },
    { view: "prep", code: "05", name: "备课包", desc: "导出教案、模型清单与课堂提示。" }
  ];

  var SCENE_NAMES = { intro: "导入", model: "模型", compare: "对比", quiz: "练习", summary: "小结" };

  // 只开放课件库，其余教学工具先锁住
  var LOCKED = { analysis: 1, knowledge: 1, question: 1, courseware: 1, prep: 1 };
  var SOON_COPY = {
    analysis: "上传课本插图，自动识别图型、知识点与易错点。",
    knowledge: "输入知识点与重难点，生成可交互的三维场景。",
    question: "粘贴题目，拆解考点、步骤与易错点。",
    courseware: "把模型、对比与练习编排成一节完整的课。",
    prep: "一键导出教案、模型清单与课堂提示。"
  };
  function reducedMotion() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

  /* ------------------------------------------------------------
     工具
     ------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function allModels() { return state.models; }
  function getModel(id) { return allModels().filter(function (m) { return m.id === id; })[0]; }
  function localId(prefix) {
    var max = 0;
    state.models.forEach(function (m) {
      if (m.id && m.id.indexOf(prefix) === 0) {
        var n = parseInt(m.id.slice(prefix.length), 10);
        if (!isNaN(n)) max = Math.max(max, n);
      }
    });
    return prefix + String(max + 1).padStart(3, "0");
  }
  function dedupeModels() {
    var seen = {};
    state.models = state.models.filter(function (m) {
      if (!m || !m.id || seen[m.id]) return false;
      seen[m.id] = true;
      return true;
    });
  }
  function updateModelCount() {
    var el = document.getElementById("railModelCount");
    if (el) el.textContent = (DATA.chapters || []).length;
  }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function persistModel(model) {
    if (!state.apiOnline || !window.GeoAPI) return;
    GeoAPI.saveModel(model).catch(function () { toast("模型保存到后端失败，当前仅存于页面"); });
  }
  function prettyModel(id) {
    if (!id) return "模型";
    var name = String(id);
    if (name.indexOf("glm-5-3-flash") === 0) return "GLM-5.3-Flash";
    if (name.indexOf("glm") === 0) return "GLM";
    if (name.indexOf("qwen") === 0) return "Qwen-VL";
    if (name.indexOf("deepseek") === 0) return "DeepSeek";
    return name.replace(/-\d{6,}$/, "");
  }
  function providerSummary(providers) {
    if (!providers) return "已连接";
    var vision = providers.vision ? providers.vision.mode : "demo";
    var text = providers.text ? providers.text.mode : "demo";
    if (vision === "mock" || text === "mock") return "假模型联调 · 不消耗额度";
    var v = vision === "real" ? prettyModel(providers.vision && providers.vision.model) : "演示";
    var t = text === "real" ? prettyModel(providers.text && providers.text.model) : "演示";
    if (v === "演示" && t === "演示") return "演示模式 · 未配置模型 Key";
    return "识图 " + v + " · 解析 " + t;
  }
  function persistCourseware() {
    if (!state.apiOnline || !window.GeoAPI) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      GeoAPI.saveCourseware(state.courseware).catch(function () { toast("课件保存失败，请检查后端服务"); });
    }, 450);
  }
  function after(ms, fn) { var id = setTimeout(fn, ms); state.timers.push(id); return id; }
  function clearTimers() { state.timers.forEach(clearTimeout); state.timers = []; }
  function toast(msg) {
    clearTimeout(state.toastTimer);
    toastEl.textContent = msg;
    toastEl.hidden = false;
    state.toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  /* ------------------------------------------------------------
     SVG 缩略图
     ------------------------------------------------------------ */
  function terrainSVG() {
    return "<svg viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>" +
      "<rect width='400' height='240' fill='#dfe7d2'/>" +
      "<path d='M0 186 Q70 150 140 170 T280 158 T400 182 V240 H0 Z' fill='#7fa35c' opacity='.55'/>" +
      "<g fill='none' stroke='#2d4a52' stroke-width='1.1' opacity='.6'>" +
      "<path d='M112 124 C150 78 250 74 292 118 C338 166 292 206 202 206 C114 206 72 166 112 124 Z'/>" +
      "<path d='M140 128 C170 94 232 92 262 124 C294 158 260 184 202 184 C146 184 112 158 140 128 Z'/>" +
      "<path d='M166 132 C186 108 220 108 238 132 C256 156 234 168 202 168 C170 168 150 154 166 132 Z'/>" +
      "<path d='M184 136 C194 124 212 124 220 136 C228 148 216 154 202 154 C188 154 178 148 184 136 Z'/>" +
      "</g>" +
      "<path d='M202 154 L202 104' stroke='#b45f2e' stroke-width='1.4'/>" +
      "<text x='208' y='106' font-family='monospace' font-size='8' fill='#2d4a52'>500</text>" +
      "<text x='300' y='122' font-family='monospace' font-size='8' fill='#2d4a52'>400</text>" +
      "<text x='72' y='170' font-family='monospace' font-size='8' fill='#2d4a52'>200</text>" +
      "</svg>";
  }
  function terrainCompareSVG() {
    return "<svg viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>" +
      "<rect width='400' height='240' fill='#dfe7d2'/>" +
      "<rect x='200' width='200' height='240' fill='#d6dfc6'/>" +
      "<path d='M0 240 L200 64 L400 240 Z' fill='#7fa35c' opacity='.35'/>" +
      "<g fill='none' stroke='#2d4a52' stroke-width='1' opacity='.55'>" +
      "<path d='M20 220 L180 84'/><path d='M48 220 L184 104'/><path d='M76 220 L188 124'/><path d='M104 220 L192 144'/><path d='M132 220 L196 164'/><path d='M160 220 L200 184'/>" +
      "</g>" +
      "<g fill='none' stroke='#2d4a52' stroke-width='1' opacity='.65'>" +
      "<path d='M216 220 L232 84'/><path d='M244 220 L248 84'/><path d='M272 220 L264 84'/><path d='M300 220 L280 84'/><path d='M328 220 L296 84'/><path d='M356 220 L312 84'/><path d='M384 220 L328 84'/>" +
      "</g>" +
      "<text x='70' y='52' font-family='monospace' font-size='9' fill='#2d4a52'>缓坡 / 等高线稀疏</text>" +
      "<text x='262' y='52' font-family='monospace' font-size='9' fill='#2d4a52'>陡坡 / 等高线密集</text>" +
      "<line x1='200' y1='24' x2='200' y2='216' stroke='#b45f2e' stroke-width='1' opacity='.5'/>" +
      "</svg>";
  }
  function globeSVG() {
    return "<svg viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>" +
      "<rect width='400' height='240' fill='#102329'/>" +
      "<circle cx='200' cy='120' r='86' fill='#3f6d76'/>" +
      "<path d='M200 34 A86 86 0 0 1 200 206 A56 86 0 0 0 200 34 Z' fill='#0c191d' opacity='.55'/>" +
      "<g fill='none' stroke='#eef1ea' stroke-width='.8' opacity='.35'>" +
      "<ellipse cx='200' cy='120' rx='86' ry='30'/><ellipse cx='200' cy='120' rx='86' ry='60'/><ellipse cx='200' cy='120' rx='86' ry='84'/>" +
      "<ellipse cx='200' cy='120' rx='30' ry='86'/><ellipse cx='200' cy='120' rx='60' ry='86'/>" +
      "</g>" +
      "<line x1='200' y1='20' x2='200' y2='220' stroke='#b45f2e' stroke-width='1.2' opacity='.8'/>" +
      "<circle cx='332' cy='52' r='12' fill='#d9c15b' opacity='.85'/>" +
      "</svg>";
  }
  function atmosphereSVG() {
    return "<svg viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>" +
      "<rect width='400' height='240' fill='#e7ece2'/>" +
      "<g font-family='monospace' font-size='9' fill='#2d4a52'>" +
      "<rect x='20' y='24' width='360' height='26' fill='#c1584a' opacity='.55'/><text x='28' y='41'>极地东风 · 低压</text>" +
      "<rect x='20' y='52' width='360' height='26' fill='#4f7a6b' opacity='.45'/><text x='28' y='69'>盛行西风 · 高压</text>" +
      "<rect x='20' y='80' width='360' height='26' fill='#c1584a' opacity='.55'/><text x='28' y='97'>东北信风 · 低压</text>" +
      "<rect x='20' y='108' width='360' height='26' fill='#4f7a6b' opacity='.45'/><text x='28' y='125'>赤道低压带</text>" +
      "<rect x='20' y='136' width='360' height='26' fill='#c1584a' opacity='.55'/><text x='28' y='153'>东南信风 · 低压</text>" +
      "<rect x='20' y='164' width='360' height='26' fill='#4f7a6b' opacity='.45'/><text x='28' y='181'>盛行西风 · 高压</text>" +
      "<rect x='20' y='192' width='360' height='26' fill='#c1584a' opacity='.55'/><text x='28' y='209'>极地东风 · 低压</text>" +
      "</g>" +
      "<g stroke='#14262c' stroke-width='1.2' fill='none' opacity='.7'>" +
      "<path d='M60 60 l30 8'/><path d='M150 88 l30 -8'/><path d='M250 116 l30 8'/><path d='M330 144 l30 -8'/>" +
      "</g>" +
      "</svg>";
  }
  function climateSVG() {
    var bars = "";
    var rains = [18, 22, 30, 42, 62, 88, 120, 110, 96, 64, 40, 24];
    for (var i = 0; i < 12; i++) {
      var h = rains[i] * 0.62;
      bars += "<rect x='" + (48 + i * 26) + "' y='" + (196 - h) + "' width='14' height='" + h + "' fill='#4f7a6b' opacity='.75'/>";
    }
    return "<svg viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>" +
      "<rect width='400' height='240' fill='#eef1ea'/>" +
      "<line x1='40' y1='196' x2='372' y2='196' stroke='#2d4a52' stroke-width='1'/>" +
      bars +
      "<polyline points='55,150 81,142 107,130 133,116 159,100 185,88 211,82 237,86 263,94 289,106 315,120 341,134' fill='none' stroke='#b45f2e' stroke-width='1.8'/>" +
      "<g font-family='monospace' font-size='8' fill='#5b747a'>" +
      "<text x='48' y='214'>1月</text><text x='204' y='214'>7月</text><text x='338' y='214'>12月</text>" +
      "<text x='8' y='100'>℃</text><text x='380' y='196'>mm</text>" +
      "</g>" +
      "<text x='264' y='58' font-family='monospace' font-size='9' fill='#2d4a52'>雨热同期</text>" +
      "</svg>";
  }
  function oceanSVG() {
    return "<svg viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>" +
      "<rect width='400' height='240' fill='#dfe8e6'/>" +
      "<path d='M84 62 C130 40 190 52 214 82 C242 116 226 156 182 174 C138 192 92 168 82 132 C74 106 62 74 84 62 Z' fill='#a9bda2' opacity='.7'/>" +
      "<path d='M296 86 C330 78 360 96 356 124 C352 152 322 164 300 148 C278 132 272 96 296 86 Z' fill='#a9bda2' opacity='.7'/>" +
      "<g stroke='#b45f2e' stroke-width='1.6' fill='none'>" +
      "<path d='M60 130 q60 -34 120 -8'/><path d='M320 110 q20 36 -8 60'/>" +
      "</g>" +
      "<g stroke='#3d7385' stroke-width='1.6' fill='none'>" +
      "<path d='M70 180 q70 26 140 4'/><path d='M300 180 q30 -20 60 -10'/>" +
      "</g>" +
      "<line x1='40' y1='120' x2='368' y2='120' stroke='#5b747a' stroke-width='.8' stroke-dasharray='4 4'/>" +
      "<g font-family='monospace' font-size='8' fill='#2d4a52'>" +
      "<text x='44' y='112'>赤道</text><text x='44' y='208'>暖流 →</text><text x='44' y='222'>寒流 →</text>" +
      "</g>" +
      "</svg>";
  }
  function pyramidSVG() {
    var rows = [
      [8, 6], [11, 9], [14, 12], [17, 15], [18, 17], [16, 17], [13, 15], [10, 13], [8, 11], [6, 10], [4, 8], [3, 7]
    ];
    var bars = "";
    rows.forEach(function (r, i) {
      var y = 34 + i * 14;
      bars += "<rect x='" + (190 - r[0] * 4) + "' y='" + y + "' width='" + (r[0] * 4) + "' height='10' fill='#4f7a6b' opacity='.75'/>";
      bars += "<rect x='210' y='" + y + "' width='" + (r[1] * 4) + "' height='10' fill='#b45f2e' opacity='.55'/>";
    });
    return "<svg viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>" +
      "<rect width='400' height='240' fill='#eef1ea'/>" + bars +
      "<line x1='200' y1='24' x2='200' y2='212' stroke='#2d4a52' stroke-width='1'/>" +
      "<g font-family='monospace' font-size='8' fill='#5b747a'>" +
      "<text x='150' y='226'>男</text><text x='238' y='226'>女</text>" +
      "<text x='14' y='40'>老年</text><text x='14' y='194'>少年</text>" +
      "</g>" +
      "</svg>";
  }
  function staticSVG(key) {
    if (key === "climate") return climateSVG();
    if (key === "ocean") return oceanSVG();
    if (key === "pyramid") return pyramidSVG();
    return atmosphereSVG();
  }
  function svgFor(model) {
    if (!model) return terrainSVG();
    if (model.kind === "glb") return "<img src='" + esc(model.preview || "") + "' alt='" + esc(model.title || "") + "' loading='lazy'>";
    if (model.kind === "globe") return globeSVG();
    if (model.kind === "terrain-compare") return terrainCompareSVG();
    if (model.kind === "static") return staticSVG(model.svg);
    return terrainSVG();
  }

  /* ------------------------------------------------------------
     3D 查看器
     ------------------------------------------------------------ */
  function heightAt(u, v) {
    var a = Math.sin(u * 2.2 + 1.1) * Math.cos(v * 1.9 + 0.4);
    var b = Math.sin(u * 4.6 + 3.5) * Math.cos(v * 4.1 + 2.0) * 0.55;
    var c = Math.sin(u * 9.0 + 6.2) * Math.cos(v * 8.3 + 3.7) * 0.22;
    var h = (a + b + c + 1.77) / 3.54;
    var d = Math.sqrt(u * u + v * v);
    h = h * 0.72 + Math.max(0, 1 - d * 0.78) * 0.28;
    return clamp(h, 0, 1);
  }
  function lerpEdge(x0, z0, h0, x1, z1, h1, L) {
    var t = Math.abs(h1 - h0) < 1e-9 ? 0.5 : (L - h0) / (h1 - h0);
    return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
  }
  function buildContours(scale, freq) {
    var N = 48, step = 10 / N, out = [], H = [];
    var SEG = { 0: [], 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]], 15: [] };
    for (var j = 0; j <= N; j++) {
      H[j] = [];
      for (var i = 0; i <= N; i++) {
        var x = -5 + i * step, z = -5 + j * step;
        H[j][i] = heightAt((x / 5) * freq, (z / 5) * freq) * 2.2 * scale;
      }
    }
    var maxH = 2.2 * scale;
    for (var L = 0.3; L < maxH; L += 0.33) {
      for (var jj = 0; jj < N; jj++) {
        for (var ii = 0; ii < N; ii++) {
          var x0 = -5 + ii * step, z0 = -5 + jj * step, x1 = x0 + step, z1 = z0 + step;
          var h0 = H[jj][ii], h1 = H[jj][ii + 1], h2 = H[jj + 1][ii + 1], h3 = H[jj + 1][ii];
          var cse = (h0 > L ? 1 : 0) | (h1 > L ? 2 : 0) | (h2 > L ? 4 : 0) | (h3 > L ? 8 : 0);
          var segs = SEG[cse];
          if (!segs.length) continue;
          var edge = function (e) {
            if (e === 0) return lerpEdge(x0, z0, h0, x1, z0, h1, L);
            if (e === 1) return lerpEdge(x1, z0, h1, x1, z1, h2, L);
            if (e === 2) return lerpEdge(x1, z1, h2, x0, z1, h3, L);
            return lerpEdge(x0, z1, h3, x0, z0, h0, L);
          };
          for (var s = 0; s < segs.length; s++) {
            var p1 = edge(segs[s][0]), p2 = edge(segs[s][1]);
            out.push(p1[0], L + 0.012, p1[1], p2[0], L + 0.012, p2[1]);
          }
        }
      }
    }
    return out;
  }

  function webglAvailable() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  var Viewers = {
    createTerrain: function (container, opts) {      opts = opts || {};
      if (!hasThree || !webglAvailable()) {
        container.innerHTML = svgFor({ kind: "terrain" });
        return;
      }
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(opts.bg || 0x0f2025);
      var camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      var renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      var scale = opts.scale || 1;
      var freq = opts.freq || 1;
      var geo = new THREE.PlaneGeometry(10, 10, 120, 120);
      geo.rotateX(-Math.PI / 2);
      var pos = geo.attributes.position;
      var palette = ["#4f7a4b", "#7fa35c", "#d9c15b", "#b07b45", "#8a5a44", "#f2f3ee"].map(function (h) { return new THREE.Color(h).convertSRGBToLinear(); });
      var colors = [];
      for (var i = 0; i < pos.count; i++) {
        var x = pos.getX(i), z = pos.getZ(i);
        var h = heightAt((x / 5) * freq, (z / 5) * freq);
        pos.setY(i, h * 2.2 * scale);
        var idx = Math.min(palette.length - 1, Math.floor(Math.min(0.999, h) * palette.length));
        var c = palette[idx];
        colors.push(c.r, c.g, c.b);
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02 }));
      scene.add(mesh);

      var cgeo = new THREE.BufferGeometry();
      cgeo.setAttribute("position", new THREE.Float32BufferAttribute(buildContours(scale, freq), 3));
      scene.add(new THREE.LineSegments(cgeo, new THREE.LineBasicMaterial({ color: 0x16282d, transparent: true, opacity: 0.6 })));

      scene.add(new THREE.HemisphereLight(0xf7f8f0, 0x1b3036, 0.62));
      var sun = new THREE.DirectionalLight(0xfff4df, 1.0);
      sun.position.set(7, 10, 5);
      scene.add(sun);

      var center = new THREE.Vector3(0, 0.8, 0);
      var theta = Math.PI * 0.25, phi = Math.PI * 0.34, radius = 11;
      function updateCamera() {
        camera.position.set(
          center.x + radius * Math.sin(phi) * Math.cos(theta),
          center.y + radius * Math.cos(phi),
          center.z + radius * Math.sin(phi) * Math.sin(theta)
        );
        camera.lookAt(center);
      }
      updateCamera();

      var el = renderer.domElement;
      el.style.touchAction = "none";
      var dragging = false, lastX = 0, lastY = 0;
      el.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
      el.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        theta -= (e.clientX - lastX) * 0.008;
        phi = clamp(phi - (e.clientY - lastY) * 0.006, 0.18, 1.45);
        lastX = e.clientX; lastY = e.clientY;
        updateCamera();
      });
      el.addEventListener("pointerup", function () { dragging = false; });
      el.addEventListener("pointercancel", function () { dragging = false; });
      el.addEventListener("wheel", function (e) {
        e.preventDefault();
        radius = clamp(radius + e.deltaY * 0.01, 7, 18);
        updateCamera();
      }, { passive: false });

      var ro = new ResizeObserver(function () {
        var w = container.clientWidth, hgt = container.clientHeight;
        if (!w || !hgt) return;
        renderer.setSize(w, hgt);
        camera.aspect = w / hgt;
        camera.updateProjectionMatrix();
      });
      ro.observe(container);

      var alive = true, raf;
      function loop() {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        renderer.render(scene, camera);
      }
      loop();

      state.viewers.push({
        destroy: function () {
          alive = false;
          cancelAnimationFrame(raf);
          ro.disconnect();
          renderer.dispose();
          geo.dispose();
          cgeo.dispose();
          if (el.parentNode) el.parentNode.removeChild(el);
        }
      });
    },

    createGlobe: function (container, opts) {
      opts = opts || {};
      if (!hasThree || !webglAvailable()) {
        container.innerHTML = svgFor({ kind: "globe" });
        return;
      }
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(opts.bg || 0x0f2025);
      var camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 2.4, 8.6);
      camera.lookAt(0, 0, 0);
      var renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      var group = new THREE.Group();
      scene.add(group);
      var sphereGeo = new THREE.SphereGeometry(2.2, 48, 32);
      var sphere = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0x44707a, roughness: 0.85, metalness: 0.05 }));
      group.add(sphere);

      var lineMat = new THREE.LineBasicMaterial({ color: 0xeef1ea, transparent: true, opacity: 0.28 });
      for (var lat = -60; lat <= 60; lat += 30) {
        var pts = [];
        var y = 2.205 * Math.sin(lat * Math.PI / 180);
        var r = 2.205 * Math.cos(lat * Math.PI / 180);
        for (var a = 0; a <= 360; a += 6) {
          pts.push(new THREE.Vector3(r * Math.cos(a * Math.PI / 180), y, r * Math.sin(a * Math.PI / 180)));
        }
        group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
      }
      for (var lon = 0; lon < 360; lon += 30) {
        var mpts = [];
        for (var la = -90; la <= 90; la += 6) {
          var rr = 2.205 * Math.cos(la * Math.PI / 180);
          mpts.push(new THREE.Vector3(rr * Math.cos(lon * Math.PI / 180), 2.205 * Math.sin(la * Math.PI / 180), rr * Math.sin(lon * Math.PI / 180)));
        }
        group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(mpts), lineMat));
      }
      var axisPts = [new THREE.Vector3(0, -3.1, 0), new THREE.Vector3(0, 3.1, 0)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(axisPts), new THREE.LineBasicMaterial({ color: 0xb45f2e, transparent: true, opacity: 0.85 })));

      scene.add(new THREE.AmbientLight(0xeef1ea, 0.5));
      var sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
      sun.position.set(6, 2.5, 5);
      scene.add(sun);

      var el = renderer.domElement;
      el.style.touchAction = "none";
      var dragging = false, lastX = 0, lastY = 0, spin = 0.0022, tilt = 0;
      el.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
      el.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        group.rotation.y += (e.clientX - lastX) * 0.006;
        tilt = clamp(tilt + (e.clientY - lastY) * 0.004, -0.6, 0.6);
        group.rotation.x = tilt;
        lastX = e.clientX; lastY = e.clientY;
      });
      el.addEventListener("pointerup", function () { dragging = false; });
      el.addEventListener("pointercancel", function () { dragging = false; });

      var ro = new ResizeObserver(function () {
        var w = container.clientWidth, hgt = container.clientHeight;
        if (!w || !hgt) return;
        renderer.setSize(w, hgt);
        camera.aspect = w / hgt;
        camera.updateProjectionMatrix();
      });
      ro.observe(container);

      var alive = true, raf;
      function loop() {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        if (!dragging) group.rotation.y += spin;
        renderer.render(scene, camera);
      }
      loop();

      state.viewers.push({
        destroy: function () {
          alive = false;
          cancelAnimationFrame(raf);
          ro.disconnect();
          renderer.dispose();
          sphereGeo.dispose();
          if (el.parentNode) el.parentNode.removeChild(el);
        }
      });
    },

    createGLB: function (container, url, fallback) {
      var fallbackHTML = "<div style='position:relative;width:100%;height:100%;background:#0f2025'>" +
        "<img src='" + esc(fallback || "") + "' alt='模型预览' style='width:100%;height:100%;object-fit:contain;display:block'>" +
        "<div style='position:absolute;left:10px;right:10px;bottom:10px;font:10px/1.5 monospace;color:#eef1ea;background:rgba(16,35,41,.78);padding:6px 8px;border:1px solid rgba(238,241,234,.22)'>当前以图片模式显示：GLB 需要通过本地服务器加载（双击 web/start_server.bat），并确认浏览器已启用 WebGL。</div></div>";
      if (!hasThree || !webglAvailable() || !THREE.GLTFLoader) {
        container.innerHTML = fallbackHTML;
        return;
      }
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f2025);
      var camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 1000);
      var basePos = new THREE.Vector3(2.2, 2.6, 3.2);
      camera.position.copy(basePos);
      camera.lookAt(0, 0.15, 0);
      var renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf7f8f0, 0x1b3036, 0.9));
      var sun = new THREE.DirectionalLight(0xfff4df, 1.2);
      sun.position.set(4, 6, 5);
      scene.add(sun);

      var group = new THREE.Group();
      scene.add(group);
      var loaded = false;
      var loader = new THREE.GLTFLoader();
      loader.load(url, function (gltf) {
        var model = gltf.scene;
        var box = new THREE.Box3().setFromObject(model);
        var size = box.getSize(new THREE.Vector3());
        var center = box.getCenter(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        model.position.sub(center);
        model.traverse(function (child) {
          if (child.isMesh && child.material) {
            child.material.side = THREE.DoubleSide;
            child.material.needsUpdate = true;
          }
        });
        group.scale.setScalar(2.0 / maxDim);
        group.add(model);
        loaded = true;
      }, undefined, function () {
        container.innerHTML = fallbackHTML;
      });

      var el = renderer.domElement;
      el.style.touchAction = "none";
      var dragging = false, lastX = 0, lastY = 0, rotX = 0;
      el.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
      el.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        group.rotation.y += (e.clientX - lastX) * 0.008;
        rotX = clamp(rotX + (e.clientY - lastY) * 0.005, -0.5, 0.5);
        group.rotation.x = rotX;
        lastX = e.clientX;
        lastY = e.clientY;
      });
      el.addEventListener("pointerup", function () { dragging = false; });
      el.addEventListener("pointercancel", function () { dragging = false; });
      var camDist = 1;
      el.addEventListener("wheel", function (e) {
        e.preventDefault();
        camDist = clamp(camDist + e.deltaY * 0.0015, 0.5, 3);
        camera.position.copy(basePos).multiplyScalar(camDist);
        camera.lookAt(0, 0.15, 0);
      }, { passive: false });

      var ro = new ResizeObserver(function () {
        var w = container.clientWidth, hgt = container.clientHeight;
        if (!w || !hgt) return;
        renderer.setSize(w, hgt);
        camera.aspect = w / hgt;
        camera.updateProjectionMatrix();
      });
      ro.observe(container);

      var alive = true, raf;
      function loop() {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        if (loaded && !dragging) group.rotation.y += 0.002;
        renderer.render(scene, camera);
      }
      loop();

      state.viewers.push({
        destroy: function () {
          alive = false;
          cancelAnimationFrame(raf);
          ro.disconnect();
          renderer.dispose();
          if (el.parentNode) el.parentNode.removeChild(el);
        }
      });
    },

    createProcedural: function (container, factoryName, fallback) {
      var fallbackHTML = "<div style='position:relative;width:100%;height:100%;background:#0f2025'>" +
        "<img src='" + esc(fallback || "") + "' alt='模型预览' style='width:100%;height:100%;object-fit:contain;display:block'>" +
        "<div style='position:absolute;left:10px;right:10px;bottom:10px;font:10px/1.5 monospace;color:#eef1ea;background:rgba(16,35,41,.78);padding:6px 8px;border:1px solid rgba(238,241,234,.22)'>当前以图片模式显示：浏览器未启用 WebGL，三维模型无法交互。</div></div>";
      var factory = window[factoryName];
      if (!hasThree || !webglAvailable() || !factory || typeof factory.createMayonVolcanoModel !== "function") {
        container.innerHTML = fallbackHTML;
        return;
      }
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f2025);
      var camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 100);
      var basePos = new THREE.Vector3(2.2, 2.6, 3.2);
      camera.position.copy(basePos);
      camera.lookAt(0, 0.15, 0);
      var renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight(0xf7f8f0, 0x1b3036, 0.95));
      var sun = new THREE.DirectionalLight(0xfff4df, 1.25);
      sun.position.set(4, 6, 5);
      scene.add(sun);

      var group = new THREE.Group();
      scene.add(group);
      var model;
      try {
        model = factory.createMayonVolcanoModel({});
      } catch (err) {
        container.innerHTML = fallbackHTML;
        return;
      }
      var box = new THREE.Box3().setFromObject(model);
      var center = box.getCenter(new THREE.Vector3());
      var size = box.getSize(new THREE.Vector3());
      var maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      var topY = box.max.y - center.y;
      var baseY = box.min.y - center.y;
      model.position.sub(center);
      group.scale.setScalar(2.0 / maxDim);
      group.add(model);

      // 轻量程序化细节：火山口熔岩、碎石与植被（固定种子，保持可复现）
      model.traverse(function (o) {
        if (o.isMesh) {
          var label = (o.name || "") + " " + ((o.parent && o.parent.name) || "");
          if (/apron/i.test(label)) {
            o.material = new THREE.MeshStandardMaterial({ color: 0x3a3532, roughness: 1, metalness: 0 });
          }
        }
      });
      var lava = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 28),
        new THREE.MeshStandardMaterial({ color: 0x7a1f0a, emissive: 0xff5a1f, emissiveIntensity: 1.4, roughness: 0.7 })
      );
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(0, topY - 0.015, 0);
      group.add(lava);

      var seed = 7;
      function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
      function scatter(count, rMin, rMax, geo, mat, sMin, sMax, lift) {
        var inst = new THREE.InstancedMesh(geo, mat, count);
        var dummy = new THREE.Object3D();
        for (var i = 0; i < count; i++) {
          var a = rnd() * Math.PI * 2;
          var r = rMin + rnd() * (rMax - rMin);
          var s = sMin + rnd() * (sMax - sMin);
          dummy.position.set(Math.cos(a) * r, baseY + lift + rnd() * 0.015, Math.sin(a) * r);
          dummy.scale.set(s, s * 0.7, s);
          dummy.rotation.set(0, rnd() * Math.PI, 0);
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        group.add(inst);
      }
      scatter(120, 0.5, 0.72,
        new THREE.DodecahedronGeometry(0.022, 0),
        new THREE.MeshStandardMaterial({ color: 0x4a3f36, roughness: 1 }), 0.5, 1.2, 0.01);
      scatter(60, 0.56, 0.74,
        new THREE.SphereGeometry(0.022, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0x5c7a3f, roughness: 0.95 }), 0.6, 1.2, 0.02);

      var el = renderer.domElement;
      el.style.touchAction = "none";
      var dragging = false, lastX = 0, lastY = 0, rotX = 0;
      el.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
      el.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        group.rotation.y += (e.clientX - lastX) * 0.008;
        rotX = clamp(rotX + (e.clientY - lastY) * 0.005, -0.45, 0.45);
        group.rotation.x = rotX;
        lastX = e.clientX;
        lastY = e.clientY;
      });
      el.addEventListener("pointerup", function () { dragging = false; });
      el.addEventListener("pointercancel", function () { dragging = false; });
      var camDist = 1;
      el.addEventListener("wheel", function (e) {
        e.preventDefault();
        camDist = clamp(camDist + e.deltaY * 0.0015, 0.5, 3);
        camera.position.copy(basePos).multiplyScalar(camDist);
        camera.lookAt(0, 0.15, 0);
      }, { passive: false });

      var ro = new ResizeObserver(function () {
        var w = container.clientWidth, hgt = container.clientHeight;
        if (!w || !hgt) return;
        renderer.setSize(w, hgt);
        camera.aspect = w / hgt;
        camera.updateProjectionMatrix();
      });
      ro.observe(container);

      var alive = true, raf;
      function loop() {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        if (!dragging) group.rotation.y += 0.002;
        renderer.render(scene, camera);
      }
      loop();

      state.viewers.push({
        destroy: function () {
          alive = false;
          cancelAnimationFrame(raf);
          ro.disconnect();
          renderer.dispose();
          if (el.parentNode) el.parentNode.removeChild(el);
        }
      });
    },

    createFold: function (container, opts) {
      opts = opts || {};
      if (!hasThree || !webglAvailable()) {
        container.innerHTML = "<div style='display:grid;place-items:center;height:100%;color:#eef1ea;font:12px monospace'>需要 WebGL 支持</div>";
        return null;
      }
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(opts.bg || 0x0f2025);
      var camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      var basePos = new THREE.Vector3(9, 6, 10);
      camera.position.copy(basePos);
      camera.lookAt(0, 1.1, 0);
      var renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf7f8f0, 0x1b3036, 0.9));
      var sun = new THREE.DirectionalLight(0xfff4df, 1.25);
      sun.position.set(6, 10, 7);
      scene.add(sun);

      var root = new THREE.Group();
      scene.add(root);
      var layerGroup = new THREE.Group();
      root.add(layerGroup);
      var H = 2.4;
      var thickness = H / 6;
      var palette = [0x6d5a4a, 0xc9a36a, 0x8a8f7a, 0xd9d2b8, 0x7d6b57, 0x5c7a3f];
      var layerMats = palette.map(function (color) {
        return new THREE.MeshStandardMaterial({ color: color, roughness: 0.92, metalness: 0.0 });
      });

      function makeLabel(text) {
        var canvas = document.createElement("canvas");
        canvas.width = 256; canvas.height = 96;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgba(20,38,44,0.8)";
        ctx.fillRect(0, 0, 256, 96);
        ctx.font = "600 42px 'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillStyle = "#f2f3ee";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 128, 50);
        var tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        var sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.5, 0.56, 1);
        return sprite;
      }
      var anti = makeLabel("背斜");
      var syn = makeLabel("向斜");
      root.add(anti); root.add(syn);
      var arrowMat = new THREE.MeshStandardMaterial({ color: 0xb45f2e, roughness: 0.7 });
      var arrowGeo = new THREE.ConeGeometry(0.16, 0.7, 12);
      var leftArrow = new THREE.Mesh(arrowGeo, arrowMat);
      leftArrow.rotation.z = -Math.PI / 2;
      root.add(leftArrow);
      var rightArrow = new THREE.Mesh(arrowGeo, arrowMat);
      rightArrow.rotation.z = Math.PI / 2;
      root.add(rightArrow);

      var t = 0;
      var playing = !!opts.autoplay;
      var labelsOn = opts.labels !== false;
      var lastBuilt = -1;
      function rebuild() {
        while (layerGroup.children.length) {
          var old = layerGroup.children.pop();
          if (old.geometry) old.geometry.dispose();
        }
        var A = 0.85 * t;
        var wavelength = 8 - 3.6 * t;
        var k = 2 * Math.PI / wavelength;
        var xScale = 1 - 0.22 * t;
        function foldX(x) { return A * Math.cos(k * x); }
        var samples = 90;
        for (var i = 0; i < 6; i++) {
          var y0 = i * thickness;
          var y1 = y0 + thickness;
          var shape = new THREE.Shape();
          for (var s = 0; s <= samples; s++) {
            var x = (-4 + 8 * s / samples) * xScale;
            var y = y1 + foldX(x);
            if (s === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
          }
          for (var s2 = samples; s2 >= 0; s2--) {
            var x2 = (-4 + 8 * s2 / samples) * xScale;
            shape.lineTo(x2, y0 + foldX(x2));
          }
          shape.closePath();
          var geo = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false, steps: 1, curveSegments: 1 });
          geo.translate(0, 0, -2);
          layerGroup.add(new THREE.Mesh(geo, layerMats[i]));
        }
        var ax = 4.4 - 0.9 * t;
        leftArrow.position.set(-ax, H * 0.55, 0);
        rightArrow.position.set(ax, H * 0.55, 0);
        anti.position.set(0, H + A + 0.5, 2.2);
        var troughX = Math.PI / k;
        syn.position.set(troughX, H - A + 0.5, 2.2);
        anti.visible = labelsOn;
        syn.visible = labelsOn;
        lastBuilt = t;
      }
      rebuild();

      var el = renderer.domElement;
      el.style.touchAction = "none";
      var dragging = false, lastX = 0, lastY = 0, rotX = 0;
      el.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
      el.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        root.rotation.y += (e.clientX - lastX) * 0.006;
        rotX = clamp(rotX + (e.clientY - lastY) * 0.004, -0.35, 0.35);
        root.rotation.x = rotX;
        lastX = e.clientX; lastY = e.clientY;
      });
      el.addEventListener("pointerup", function () { dragging = false; });
      el.addEventListener("pointercancel", function () { dragging = false; });
      var camDist = 1;
      el.addEventListener("wheel", function (e) {
        e.preventDefault();
        camDist = clamp(camDist + e.deltaY * 0.0015, 0.55, 2.8);
        camera.position.copy(basePos).multiplyScalar(camDist);
        camera.lookAt(0, 1.1, 0);
      }, { passive: false });

      var ro = new ResizeObserver(function () {
        var w = container.clientWidth, hgt = container.clientHeight;
        if (!w || !hgt) return;
        renderer.setSize(w, hgt);
        camera.aspect = w / hgt;
        camera.updateProjectionMatrix();
      });
      ro.observe(container);

      var clock = new THREE.Clock();
      var alive = true, raf;
      function loop() {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        var dt = clock.getDelta();
        if (playing && t < 1) {
          t = Math.min(1, t + dt / 5);
          if (Math.abs(t - lastBuilt) > 0.008) rebuild();
          if (t >= 1) playing = false;
        }
        renderer.render(scene, camera);
      }
      loop();

      function dispose() {
        alive = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        layerGroup.children.slice().forEach(function (m) { if (m.geometry) m.geometry.dispose(); });
        renderer.dispose();
        if (el.parentNode) el.parentNode.removeChild(el);
      }
      state.viewers.push({ destroy: dispose });
      return {
        setT: function (v) { t = clamp(v, 0, 1); playing = false; rebuild(); },
        play: function () { if (t >= 0.999) { t = 0; rebuild(); } playing = true; },
        pause: function () { playing = false; },
        toggleLabels: function (on) { labelsOn = !!on; anti.visible = labelsOn; syn.visible = labelsOn; },
        getT: function () { return t; },
        destroy: dispose
      };
    },

    destroyAll: function () {
      state.viewers.forEach(function (v) { try { v.destroy(); } catch (err) { /* ignore */ } });
      state.viewers = [];
    }
  };

  /* ------------------------------------------------------------
     首页等高线画布
     ------------------------------------------------------------ */
  function initContour(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var alive = true, raf, t = 0, mx = 0, my = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth || 400, h = canvas.clientHeight || 300;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    var ro = new ResizeObserver(resize);
    ro.observe(canvas);
    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
    });
    function draw() {
      if (!alive) return;
      var w = canvas.clientWidth || 400, h = canvas.clientHeight || 300;
      ctx.fillStyle = "#102329";
      ctx.fillRect(0, 0, w, h);
      var cx = w * 0.52 + mx * w * 0.06;
      var cy = h * 0.52 + my * h * 0.06;
      var base = Math.min(w, h) * 0.09;
      for (var k = 0; k < 14; k++) {
        ctx.beginPath();
        var r0 = base * (0.55 + k * 0.18);
        for (var a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
          var wob = Math.sin(a * 3 + t + k * 0.6) * 0.1 + Math.sin(a * 5 - t * 0.8 + k * 0.3) * 0.055 + Math.sin(a * 2 + k) * 0.05;
          var r = r0 * (1 + wob) * (1 - Math.abs(mx) * 0.05 * Math.sin(a + k));
          var x = cx + Math.cos(a) * r;
          var y = cy + Math.sin(a) * r * 0.74;
          if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = k === 5 ? "rgba(180,95,46,.9)" : "rgba(238,241,234," + (0.07 + 0.15 * (1 - k / 14)).toFixed(3) + ")";
        ctx.lineWidth = k === 5 ? 1.4 : 1;
        ctx.stroke();
      }
      if (!reduce) {
        t += 0.004;
        raf = requestAnimationFrame(draw);
      }
    }
    draw();
    state.contour = {
      destroy: function () { alive = false; cancelAnimationFrame(raf); ro.disconnect(); }
    };
  }

  /* ------------------------------------------------------------
     视图渲染
     ------------------------------------------------------------ */
  function setView(name) {
    if (!VIEW_NAMES[name]) name = "library";
    state.view = name;
    clearTimers();
    if (state.contour) { state.contour.destroy(); state.contour = null; }
    Viewers.destroyAll();
    render();
    rail.classList.remove("open");
    railScrim.hidden = true;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function render() {
    document.getElementById("crumbs").textContent = VIEW_NAMES[state.view];
    $$(".rail-item").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-view") === state.view && !btn.classList.contains("locked"));
    });
    document.getElementById("railModelCount").textContent = (DATA.chapters || []).length;
    view.innerHTML = "";
    if (LOCKED[state.view]) renderComingSoon(state.view);
    else if (state.view === "dashboard") renderDashboard();
    else if (state.view === "library") renderLibrary();
    else if (state.view === "analysis") renderAnalysis();
    else if (state.view === "knowledge") renderKnowledge();
    else if (state.view === "question") renderQuestion();
    else if (state.view === "courseware") renderCourseware();
    else if (state.view === "prep") renderPrep();
    else renderLibrary();
    animateViewIn();
  }

  /* ---------- 首页 ---------- */
  function renderDashboard() {
    var recent = (DATA.chapters || []).slice(0, 3);
    view.innerHTML =
      "<section class='page'>" +
      "<div class='hero sheet'>" +
      "<div class='hero-copy'>" +
      "<div class='eyebrow'>数字与地理可视化 · 教学演示工作台</div>" +
      "<h1>把课本里的地理，<br>转成<em>可以转动</em>的模型。</h1>" +
      "<p class='lede'>从一张课本插图、一个知识点或一道题出发，生成可交互的三维场景，编排成能直接投屏的课件，再把整节课的备课包带走。</p>" +
      "<div class='hero-actions'>" +
      "<button class='btn btn-accent' data-view='analysis'>从识图开始 →</button>" +
      "<button class='btn btn-ghost' data-view='library'>浏览课件库</button>" +
      "</div>" +
      "<div class='hero-stats'>" +
      "<div><div class='stat-num'>" + (DATA.chapters || []).length + "</div><div class='stat-label'>章课件</div></div>" +
      "<div><div class='stat-num'>" + DATA.questionSamples.length + "</div><div class='stat-label'>题型模板</div></div>" +
      "<div><div class='stat-num'>" + state.courseware.scenes.length + "</div><div class='stat-label'>当前课件场景</div></div>" +
      "</div></div>" +
      "<div class='hero-canvas'><canvas id='contourCanvas'></canvas><div class='hero-badge'>FIG. 01 / DEMO</div>" +
      "<div class='hero-legend'><span><i></i>等高线</span><span><i style='background:#d9c15b'></i>分层设色</span></div></div>" +
      "</div>" +
      "<div class='section-head'><div class='section-title'>教学流程</div><div class='section-note'>识图 → 生成 → 编排 → 上课 → 备课</div></div>" +
      "<div class='flow-grid'>" + FLOWS.map(flowCard).join("") + "</div>" +
      "<div class='two-col'>" +
      "<div><div class='section-head' style='margin-top:0'><div class='section-title' style='font-size:18px'>最近图幅</div><button class='btn btn-ghost btn-sm' data-view='library'>全部模型</button></div>" +
      "<div class='recent-list'>" + recent.map(recentItem).join("") + "</div></div>" +
      "<div class='panel sheet'><div class='panel-head'><div class='panel-title'>本周教学清单</div><span class='panel-sub'>DEMO</span></div>" +
      "<div class='checklist'>" +
      checkItem(true, "准备《等高线判读》模型") +
      checkItem(true, "编排 5 个课堂场景") +
      checkItem(true, "加入 1 道课堂练习") +
      checkItem(false, "导出备课包") +
      "</div></div></div>" +
      "</section>";
    initContour(document.getElementById("contourCanvas"));
  }
  function flowCard(f) {
    return "<button class='flow-card' data-view='" + f.view + "'>" +
      "<span class='flow-code'>" + f.code + "</span>" +
      "<span class='flow-name'>" + f.name + "</span>" +
      "<span class='flow-desc'>" + f.desc + "</span>" +
      "<span class='flow-arrow'>→</span></button>";
  }
  function recentItem(m) {
    if (m.href) {
      return "<button class='recent-item' data-open-chapter='" + esc(m.href) + "'>" +
        "<span class='recent-thumb'><img src='" + esc(m.preview) + "' alt=''></span>" +
        "<span><span class='recent-name'>" + esc(m.title) + "</span>" +
        "<span class='recent-meta'>" + m.id + " · " + esc(m.category) + "</span></span>" +
        "<span class='recent-arrow'>→</span></button>";
    }
    return "<button class='recent-item' data-open-model='" + m.id + "'>" +
      "<span class='recent-thumb'>" + svgFor(m) + "</span>" +
      "<span><span class='recent-name'>" + esc(m.title) + "</span>" +
      "<span class='recent-meta'>" + m.id + " · " + esc(m.chapter) + "</span></span>" +
      "<span class='recent-arrow'>→</span></button>";
  }
  function checkItem(done, text) {
    return "<div class='check-item " + (done ? "done" : "") + "'><span class='check-box'></span><span>" + text + "</span></div>";
  }

  /* ---------- 课件库 ---------- */
  var LIB_MARQUEE = "冰斗 · 刃脊 · 角峰 · U 形谷 · 海蚀拱桥 · 河流阶地 · 曲流 · 沙丘 · 洋流 · 断层 · 喀斯特 · 等高线";
  function renderLibrary() {
    var chapters = DATA.chapters || [];
    var cats = ["全部"];
    chapters.forEach(function (c) { if (cats.indexOf(c.category) === -1) cats.push(c.category); });
    var hero = ["CH12", "CH09", "CH07"].map(function (id) {
      return chapters.filter(function (c) { return c.id === id; })[0];
    }).filter(Boolean);
    chapters.forEach(function (c) { if (hero.length < 3 && hero.indexOf(c) === -1) hero.push(c); });
    view.innerHTML =
      "<section class='lib-page'>" +
      "<header class='lib-hero'>" +
        "<div class='lib-hero__copy'>" +
          "<div class='eyebrow'>XW GEO · COURSEWARE LIBRARY</div>" +
          "<h1 class='lib-title' id='libTitle'>选一堂课<br>开始<em>转动</em>。</h1>" +
          "<p class='lib-lede'>冰川、海岸、河流、风沙、断层与洋流，每一章都是单文件交互课件。打开即可投屏，断网也能用；每章 6 步，从观察、操作到结论。</p>" +
          "<div class='lib-actions'>" +
            "<button class='btn btn-accent' data-scroll-grid>浏览全部课件</button>" +
            "<button class='btn btn-ghost' data-open-chapter='chapters/ch01.html'>从第一章开始 ↗</button>" +
          "</div>" +
        "</div>" +
        "<div class='lib-hero__visual'><div class='hero-stack'>" +
          hero.map(function (c, i) {
            return "<figure class='s" + (i + 1) + "'><img src='" + esc(c.preview) + "' alt='" + esc(c.title) + "'><figcaption>" + c.id + " · " + esc(c.title) + "</figcaption></figure>";
          }).join("") +
        "</div></div>" +
        "<div class='lib-marquee'><div class='marquee-track'><span>" + LIB_MARQUEE + "</span><span aria-hidden='true'>" + LIB_MARQUEE + "</span></div></div>" +
      "</header>" +
      "<div class='lib-dock'>" +
        "<label class='lib-search'><span>⌕</span><input id='libSearch' placeholder='搜索章节、知识点或标签' value='" + esc(state.query) + "'></label>" +
        "<div class='filter-chips' id='catChips'>" + cats.map(function (c) {
          return "<button class='chip-btn " + (state.category === c ? "active" : "") + "' data-cat='" + esc(c) + "'>" + esc(c) + "</button>";
        }).join("") + "</div>" +
        "<span class='lib-count' id='libCount'>" + chapters.length + " 件</span>" +
      "</div>" +
      "<div class='lib-section-head'><h2>全部课件</h2><span>COURSEWARE · 2024—2026</span></div>" +
      "<div class='lib-grid' id='libGrid'></div>" +
      "</section>";
    updateLibraryGrid();
    initLibraryMotion();
  }
  function updateLibraryGrid() {
    var grid = document.getElementById("libGrid");
    if (!grid) return;
    var q = state.query.trim().toLowerCase();
    var filtered = (DATA.chapters || []).filter(function (c) {
      if (state.category !== "全部" && c.category !== state.category) return false;
      if (!q) return true;
      var hay = [c.title, c.id, c.summary, c.category].concat(c.tags || []).join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    grid.innerHTML = filtered.length ? filtered.map(chapterCard).join("") :
      "<div class='lib-empty'>没有匹配的课件。换个关键词试试。</div>";
    var count = document.getElementById("libCount");
    if (count) count.textContent = filtered.length + " 件";
    bindCardMotion(grid);
    if (window.gsap && !reducedMotion() && filtered.length) {
      gsap.fromTo(grid.querySelectorAll(".lib-card"), { y: 26, rotateX: 8 }, {
        y: 0, rotateX: 0, duration: .6, stagger: .05, ease: "power3.out", clearProps: "transform"
      });
    }
  }
  function chapterCard(c) {
    var meta = (c.meta || "").split(" · ");
    return "<article class='lib-card' data-open-chapter='" + esc(c.href) + "' role='button' tabindex='0' aria-label='打开 " + esc(c.title) + "'>" +
      "<div class='lib-card__media'>" +
        "<img src='" + esc(c.preview) + "' alt='" + esc(c.title) + "' loading='lazy'>" +
        "<div class='lib-card__badge'><span>" + c.id + "</span><span>·</span><span>" + esc(c.category) + "</span></div>" +
        "<div class='lib-card__glow'></div>" +
      "</div>" +
      "<div class='lib-card__body'>" +
        "<div class='lib-card__meta'><span>" + c.id + " · " + esc(c.category) + "</span><span>" + esc(meta[0] || "") + "</span></div>" +
        "<h3>" + esc(c.title) + "</h3>" +
        "<p>" + esc(c.summary) + "</p>" +
        "<div class='lib-card__tags'>" + (c.tags || []).slice(0, 3).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>" +
        "<div class='lib-card__foot'><span>打开课件</span><span class='lib-card__arrow'>↗</span></div>" +
      "</div></article>";
  }




  /* ---------- 访问验证 ---------- */
  var AUTH_USERS = {
    zxw: { sha: "7f753f56f3c6861385700f8096c42b4c75574a1474613f060846563c461c2a02", fnv: "3f00fb1b" },
    zdw: { sha: "820623422dbec8454a76955a3ad000a0fc2bf44b8db6eccd7284ecf807b20b62", fnv: "917badbf" }
  };
  var SESSION_KEY = "xw_session", SESSION_DAYS = 7;
  var coverInited = false, authFails = 0, authLockUntil = 0;
  function readSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (s && s.u && s.e > Date.now() && AUTH_USERS[s.u]) return s;
    } catch (e) {}
    return null;
  }
  function saveSession(user) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ u: user, e: Date.now() + SESSION_DAYS * 864e5 })); } catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  async function hashPass(user, pass) {
    var raw = user + ":" + pass;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      } catch (e) {}
    }
    var h = 0x811c9dc5;
    for (var i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  function initAuth() {
    var form = document.getElementById("authForm");
    if (!form) return;
    var user = document.getElementById("authUser"), pass = document.getElementById("authPass");
    var err = document.getElementById("authError"), eye = document.getElementById("authEye");
    try {
      authFails = parseInt(sessionStorage.getItem("xw_fails") || "0", 10) || 0;
      authLockUntil = parseInt(sessionStorage.getItem("xw_lock") || "0", 10) || 0;
    } catch (e) {}
    if (eye) eye.addEventListener("click", function () {
      var show = pass.type === "password";
      pass.type = show ? "text" : "password";
      eye.textContent = show ? "隐藏" : "显示";
      pass.focus();
    });
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (err) err.textContent = "";
      var u = (user && user.value || "").trim().toLowerCase();
      var p = pass && pass.value || "";
      if (!u || !p) { if (err) err.textContent = "请输入用户名和密码"; return; }
      var now = Date.now();
      if (now < authLockUntil) { if (err) err.textContent = "尝试次数过多，请 " + Math.ceil((authLockUntil - now) / 1000) + " 秒后再试"; return; }
      if (!AUTH_USERS[u]) { failAuth("用户名或密码不正确"); return; }
      var h = await hashPass(u, p), rec = AUTH_USERS[u];
      if (h === rec.sha || h === rec.fnv) {
        authFails = 0; authLockUntil = 0;
        try { sessionStorage.setItem("xw_fails", "0"); sessionStorage.removeItem("xw_lock"); } catch (e) {}
        saveSession(u);
        applySession(u, true);
      } else {
        failAuth("用户名或密码不正确");
      }
    });
    function failAuth(msg) {
      authFails++;
      try { sessionStorage.setItem("xw_fails", String(authFails)); } catch (e) {}
      if (authFails >= 5) {
        authLockUntil = Date.now() + 30000;
        try { sessionStorage.setItem("xw_lock", String(authLockUntil)); } catch (e) {}
        if (err) err.textContent = "尝试次数过多，已锁定 30 秒";
      } else if (err) {
        err.textContent = msg;
      }
      if (pass) { pass.value = ""; pass.focus(); }
    }
    if (window.gsap && !reducedMotion()) {
      gsap.from("#authCard", { y: 26, scale: .98, duration: .7, ease: "power3.out" });
      gsap.from(".auth-brand, .auth-eyebrow, .auth h2, .auth p, .auth-field, .auth-foot", { y: 14, duration: .6, stagger: .05, ease: "power2.out", delay: .1 });
    }
    setTimeout(function () { if (user) user.focus(); }, 500);
  }
  function applySession(user, animate) {
    var label = document.getElementById("userLabel");
    if (label) label.textContent = user;
    document.body.classList.remove("auth-locked");
    document.body.classList.add("cover-open");
    var auth = document.getElementById("auth");
    function done() {
      if (auth) auth.style.display = "none";
      if (!coverInited) { coverInited = true; initCover(); }
    }
    if (animate && window.gsap && !reducedMotion()) {
      gsap.timeline({ onComplete: done })
        .to("#authCard", { y: -18, opacity: 0, duration: .45, ease: "power2.in" })
        .to("#auth", { opacity: 0, duration: .5 }, .12);
    } else {
      done();
    }
  }
  function initUserMenu() {
    var avatar = document.getElementById("avatarBtn"), pop = document.getElementById("userPop");
    if (!avatar || !pop) return;
    avatar.addEventListener("click", function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
    });
    document.addEventListener("click", function (e) {
      if (!pop.hidden && !e.target.closest(".user-wrap")) pop.hidden = true;
    });
    var out = document.getElementById("logoutBtn");
    if (out) out.addEventListener("click", function () {
      clearSession();
      location.reload();
    });
  }

  /* ---------- 封面 ---------- */
  var coverVisible = true, coverRaf = 0, coverEntered = false;
  function initCover() {
    var count = document.querySelector(".cover-count");
    if (count) count.textContent = (DATA.chapters || []).length;
    initCoverGlobe();
    initCoverMotion();
    var btn = document.getElementById("startBtn");
    if (btn) {
      btn.addEventListener("click", enterLibrary);
      if (window.gsap && !reducedMotion()) {
        btn.addEventListener("pointermove", function (e) {
          var r = btn.getBoundingClientRect();
          gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .12, y: (e.clientY - r.top - r.height / 2) * .18, duration: .4, ease: "power2.out" });
        });
        btn.addEventListener("pointerleave", function () { gsap.to(btn, { x: 0, y: 0, duration: .5, ease: "power2.out", clearProps: "transform" }); });
      }
    }
    document.addEventListener("keydown", function (e) {
      if (coverVisible && e.key === "Enter") { e.preventDefault(); enterLibrary(); }
    });
  }
  function initCoverGlobe() {
    var canvas = document.getElementById("coverGlobe");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var size = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    function resize() {
      var rect = canvas.getBoundingClientRect();
      size = Math.max(240, Math.min(rect.width || 520, 620));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = size * dpr; canvas.height = size * dpr;
      canvas.style.width = size + "px"; canvas.style.height = size + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = size / 2; cy = size / 2; R = size * .34;
    }
    function frame(t) {
      if (!coverVisible) return;
      coverRaf = requestAnimationFrame(frame);
      var time = t || 0;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(cx, cy);
      // 外层光晕
      var g = ctx.createRadialGradient(0, 0, R * .2, 0, 0, R * 1.45);
      g.addColorStop(0, "rgba(95,227,255,.10)");
      g.addColorStop(.55, "rgba(95,227,255,.03)");
      g.addColorStop(1, "rgba(95,227,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.45, 0, Math.PI * 2); ctx.fill();
      // 球体
      ctx.strokeStyle = "rgba(95,227,255,.55)"; ctx.lineWidth = 1.1;
      ctx.shadowColor = "rgba(95,227,255,.55)"; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      // 纬线
      ctx.lineWidth = .7;
      for (var lat = -60; lat <= 60; lat += 30) {
        var rad = lat * Math.PI / 180;
        var y = -R * Math.sin(rad), rx = R * Math.cos(rad);
        ctx.strokeStyle = "rgba(95,227,255," + (lat === 0 ? .30 : .16) + ")";
        ctx.beginPath(); ctx.ellipse(0, y, rx, rx * .22, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // 经线（旋转）
      var phase = time * .00018;
      for (var k = 0; k < 6; k++) {
        var rx = Math.abs(Math.cos(phase + k * Math.PI / 6)) * R;
        ctx.strokeStyle = "rgba(95,227,255," + (.10 + .10 * Math.abs(Math.sin(phase + k * Math.PI / 6))) + ")";
        ctx.beginPath(); ctx.ellipse(0, 0, Math.max(2, rx), R, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // 赤道高亮
      ctx.strokeStyle = "rgba(169,242,255,.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, R, R * .22, 0, 0, Math.PI * 2); ctx.stroke();
      // 轨道
      ctx.save(); ctx.rotate(-.32);
      ctx.strokeStyle = "rgba(255,178,107,.22)"; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.ellipse(0, 0, R * 1.28, R * .34, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      var ox = Math.cos(time * .0006) * R * 1.28, oy = Math.sin(time * .0006) * R * .34;
      ctx.fillStyle = "#ffb26b"; ctx.shadowColor = "#ffb26b"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(ox, oy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // 高光点
      ctx.fillStyle = "rgba(220,250,255,.85)"; ctx.shadowColor = "#a9f2ff"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(-R * .32, -R * .38, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    window.addEventListener("resize", resize);
    resize();
    if (reducedMotion()) { frame(0); return; }
    coverRaf = requestAnimationFrame(frame);
  }
  function initCoverMotion() {
    if (!window.gsap || reducedMotion()) return;
    var title = document.getElementById("coverTitle");
    if (title && !title.dataset.split) { splitChars(title); title.dataset.split = "1"; }
    gsap.from(".cover-copy .eyebrow, .cover-copy p, .cover-actions, .cover-stats", {
      y: 26, duration: .9, stagger: .08, ease: "power3.out", delay: .15
    });
    if (title) gsap.from(title.querySelectorAll(".char"), {
      yPercent: 120, duration: 1, stagger: .02, ease: "power3.out"
    });
    gsap.from(".cover-visual", { scale: .92, duration: 1.4, ease: "power3.out" });
    gsap.from(".cover-top, .cover-foot", { y: -10, duration: .8, delay: .2 });
    gsap.to(".cover-cta", { boxShadow: "0 0 60px rgba(95,227,255,.45)", duration: 2, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }
  function enterLibrary() {
    if (coverEntered) return;
    coverEntered = true; coverVisible = false;
    if (coverRaf) cancelAnimationFrame(coverRaf);
    var cover = document.getElementById("cover");
    function done() {
      if (cover) cover.style.display = "none";
      document.body.classList.remove("cover-open");
      setView("library");
    }
    if (!cover || !window.gsap || reducedMotion()) { done(); return; }
    gsap.timeline({ onComplete: done })
      .to(".cover-copy > *", { y: -16, opacity: 0, duration: .45, stagger: .04, ease: "power2.in" })
      .to(".cover-visual", { scale: 1.08, opacity: 0, duration: .8, ease: "power2.in" }, 0)
      .to(".cover-top, .cover-foot", { opacity: 0, duration: .35 }, 0)
      .to(cover, { opacity: 0, duration: .5 }, .3);
  }

  /* ---------- 深空背景动效 ---------- */
  var starsStarted = false;
  function initStarfield() {
    if (starsStarted) return;
    starsStarted = true;
    var canvas = document.getElementById("stars");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var w = 0, h = 0, dpr = 1, pts = [], mx = 0, my = 0, raf = 0;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(42, Math.round(w * h / 42000));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
          r: Math.random() * 1.3 + .3, a: .15 + Math.random() * .5
        });
      }
    }
    var lastDraw = 0;
    function draw(t) {
      raf = requestAnimationFrame(draw);
      if (t && t - lastDraw < 33) return;
      lastDraw = t || 0;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        var px = p.x + mx, py = p.y + my;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(159,236,255," + (p.a * .62).toFixed(2) + ")";
        ctx.fill();
      }
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 10000) {
            ctx.beginPath();
            ctx.moveTo(pts[a].x + mx, pts[a].y + my);
            ctx.lineTo(pts[b].x + mx, pts[b].y + my);
            ctx.strokeStyle = "rgba(95,227,255," + (0.06 * (1 - d2 / 10000)).toFixed(3) + ")";
            ctx.lineWidth = .6;
            ctx.stroke();
          }
        }
      }
    }
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) {
      mx = (e.clientX / Math.max(1, w) - .5) * 18;
      my = (e.clientY / Math.max(1, h) - .5) * 18;
    }, { passive: true });
    resize();
    if (reducedMotion()) { ctx.clearRect(0, 0, w, h); return; }
    draw();
  }
  function initCursorGlow() {
    var glow = document.getElementById("cursorGlow");
    if (!glow || !window.gsap || reducedMotion()) return;
    var gx = gsap.quickTo(glow, "x", { duration: .75, ease: "power3" });
    var gy = gsap.quickTo(glow, "y", { duration: .75, ease: "power3" });
    document.addEventListener("pointermove", function (e) {
      gx(e.clientX); gy(e.clientY);
      document.body.classList.add("has-pointer");
    }, { passive: true });
    document.addEventListener("pointerleave", function () { document.body.classList.remove("has-pointer"); });
  }

  /* ---------- React Bits 风格动效 ---------- */
  function splitChars(el) {
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var text = child.textContent;
          var frag = document.createDocumentFragment();
          Array.from(text).forEach(function (ch) {
            if (ch === " " || ch === "\n") { frag.appendChild(document.createTextNode(ch)); return; }
            var sp = document.createElement("span"); sp.className = "char"; sp.textContent = ch; frag.appendChild(sp);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          if (child.tagName === "BR") return;
          if (child.tagName === "EM") { child.classList.add("char"); return; }
          walk(child);
        }
      });
    }
    walk(el);
  }
  function initLibraryMotion() {
    if (!window.gsap || reducedMotion()) return;
    var title = document.getElementById("libTitle");
    if (title && !title.dataset.split) { splitChars(title); title.dataset.split = "1"; }
    gsap.from(".lib-hero .eyebrow, .lib-lede, .lib-actions, .lib-stats", {
      y: 20, duration: .8, stagger: .09, ease: "power3.out"
    });
    if (title) gsap.from(title.querySelectorAll(".char"), {
      yPercent: 115, duration: .9, stagger: .018, ease: "power3.out", delay: .05
    });
    gsap.from(".hero-stack figure", { y: 46, duration: 1, stagger: .12, ease: "power3.out", delay: .15 });
    gsap.from(".lib-marquee", { y: 12, duration: 1, delay: .5 });
    gsap.utils.toArray(".hero-stack figure").forEach(function (f, i) {
      gsap.to(f, { y: (i % 2 ? -12 : 12), duration: 3.2 + i * .5, yoyo: true, repeat: -1, ease: "sine.inOut", delay: .9 + i * .2 });
    });
    // 课件会持续更新，数字直接取当前数量，不做倒计时，避免与更新后的数量不一致
    var hero = document.querySelector(".lib-hero"), stack = document.querySelector(".hero-stack");
    if (hero && stack) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        gsap.to(stack, { x: (e.clientX - r.left - r.width / 2) * .022, y: (e.clientY - r.top - r.height / 2) * .015, duration: .7, ease: "power2.out" });
      });
      hero.addEventListener("pointerleave", function () { gsap.to(stack, { x: 0, y: 0, duration: .9, ease: "power2.out" }); });
    }
    $$(".lib-actions .btn").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .16, y: (e.clientY - r.top - r.height / 2) * .22, duration: .4, ease: "power2.out" });
      });
      btn.addEventListener("pointerleave", function () { gsap.to(btn, { x: 0, y: 0, duration: .5, ease: "power2.out", clearProps: "transform" }); });
    });
  }
  function bindCardMotion(root) {
    $$(".lib-card", root).forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
        if (window.gsap && !reducedMotion() && window.innerWidth > 900) {
          var rx = ((e.clientY - r.top) / r.height - .5) * -2;
          var ry = ((e.clientX - r.left) / r.width - .5) * 2;
          gsap.to(card, { rotateX: rx, rotateY: ry, y: -3, transformPerspective: 900, duration: .5, ease: "power2.out" });
        }
      });
      card.addEventListener("pointerleave", function () {
        if (window.gsap && !reducedMotion()) gsap.to(card, { rotateX: 0, rotateY: 0, y: 0, duration: .5, ease: "power2.out", clearProps: "transform" });
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.open(card.getAttribute("data-open-chapter"), "_blank");
        }
      });
    });
  }
  function animateViewIn() {
    if (!window.gsap || reducedMotion()) return;
    gsap.fromTo(view, { y: 14 }, { y: 0, duration: .42, ease: "power2.out", clearProps: "transform" });
  }
  function renderComingSoon(name) {
    var label = VIEW_NAMES[name] || "新功能";
    view.innerHTML =
      "<section class='soon-page'><div class='soon-inner'>" +
      "<div class='soon-orb'></div>" +
      "<div class='eyebrow'>COMING SOON</div>" +
      "<h1>敬请期待</h1>" +
      "<p><b>" + esc(label) + "</b> 正在打磨中。" + esc(SOON_COPY[name] || "更多教学工具将陆续开放。") + "</p>" +
      "<button class='btn btn-accent' data-view='library'>← 回到课件库</button>" +
      "<div class='soon-line'>当前仅开放课件库 · 其余教学工具将陆续上线</div>" +
      "</div></section>";
    if (window.gsap && !reducedMotion()) {
      gsap.from(".soon-inner > *", { y: 18, duration: .6, stagger: .08, ease: "power3.out" });
    }
  }

  /* ---------- 识图分析 ---------- */
  function renderAnalysis() {
    var visionMode = state.providers && state.providers.vision ? state.providers.vision.mode : "demo";
    var note = visionMode === "real"
      ? "已接入视觉模型：上传图片会真实调用 Qwen-VL 分析，结果需教师确认。"
      : visionMode === "mock"
        ? "当前为本地假模型联调模式：识图结果为假数据，不消耗额度。"
        : "演示模式：识图结果按内置样例返回；在 backend/.env 配置 Key 后自动启用真实识图。";
    view.innerHTML =
      "<div class='page-head'><div>" +
      "<div class='eyebrow'>教学流程 01 / IMAGE ANALYSIS</div>" +
      "<h1>识图分析</h1>" +
      "<p class='lede'>上传课本插图、地图或统计图，识别图型、对应知识点、重难点与常见误区，再转成模型或课件。</p></div></div>" +
      "<div class='analysis-grid'>" +
      "<section class='panel sheet'>" +
      "<div class='panel-head'><div class='panel-title'>上传图片</div><span class='panel-sub'>PNG / JPG</span></div>" +
      "<label class='dropzone' id='dropzone' for='fileInput'>" +
      "<div class='drop-icon'>⌁</div>" +
      "<div class='drop-title'>拖入一张课本插图</div>" +
      "<div class='drop-note'>或点击选择文件。支持等高线图、气候图、人口金字塔等常见图型。</div>" +
      "<input type='file' id='fileInput' accept='image/*'>" +
      "</label>" +
      "<div class='sample-row'>" +
      sampleCard("contour", "等高线地形图", "地形") +
      sampleCard("climate", "气温降水图", "气候") +
      sampleCard("pyramid", "人口金字塔", "人文") +
      "</div>" +
      "<div class='preview-strip' id='previewStrip' hidden></div>" +
      "<p class='demo-note'>" + note + "</p>" +
      "</section>" +
      "<section class='panel sheet' id='analysisResult'>" + analysisEmpty() + "</section>" +
      "</div>";
  }
  function sampleCard(key, label, tag) {
    var svg = key === "contour" ? terrainSVG() : key === "climate" ? climateSVG() : pyramidSVG();
    return "<button class='sample-card' data-sample='" + key + "'>" + svg +
      "<span class='sample-label'><span>" + label + "</span><span>" + tag + "</span></span></button>";
  }
  function analysisEmpty() {
    return "<div class='result-empty'><div class='big'>等待一张图</div><p>上传或选择左侧样例，识别结果会出现在这里。</p></div>";
  }
  function startAnalysis(key, uploaded) {
    var host = document.getElementById("analysisResult");
    if (!host) return;
    var sample = DATA.analysisSamples[key];
    if (!sample) return;
    var steps = uploaded ?
      ["接收图片并读取尺寸", "演示模式：匹配内置图型", "整理知识点与教学建议"] :
      ["读取图型与图例", "匹配教材章节与知识点", "整理重难点与推荐模型"];
    host.innerHTML = "<div class='panel-head'><div class='panel-title'>分析中</div><span class='panel-sub'>VISION</span></div>" +
      "<div class='steps'>" + progressRows(steps) + "</div>";
    var rows = $$(".step-row", host);
    steps.forEach(function (_, i) {
      after(420 * (i + 1), function () {
        rows.forEach(function (r, ri) {
          r.classList.toggle("running", ri === i);
          r.classList.toggle("done", ri < i);
        });
      });
    });
    after(420 * (steps.length + 1), function () {
      host.innerHTML = analysisResult(sample, uploaded);
      bindAnalysisActions();
    });
  }
  function progressRows(steps) {
    return steps.map(function (s, i) { return "<div class='step-row'><span class='step-dot'>" + (i + 1) + "</span><span>" + s + "</span></div>"; }).join("");
  }
  function analysisResult(sample, uploaded) {
    var conf = typeof sample.confidence === "number" ? sample.confidence : 80;
    var provider = sample.provider === "real" ? prettyModel(sample.providerModel) + " 识图" : sample.provider === "mock" ? "假模型联调" : "演示识图";
    var note = (uploaded && provider === "演示识图") ? "<p class='demo-note'>演示模式：已接收图片，以下结果按“等高线地形图”示例展示。</p>" : "";
    return "<div class='panel-head'><div class='panel-title'>识别结果</div><span class='panel-sub'>ANALYSIS</span></div>" +
      note +
      "<div class='confidence-row'><h3>" + sample.label + "</h3><span class='confidence'>" + provider + " · " + conf + "%</span></div>" +
      "<p class='muted' style='font-size:13px'>" + esc(sample.figureNote) + "</p>" +
      "<p class='tag-code' style='margin-top:8px'>" + esc(sample.chapter) + "</p>" +
      "<div class='result-block'><h4>关联知识点</h4><div class='chips'>" +
      sample.kps.map(function (k) { return "<span class='chip'><span class='dot'></span>" + esc(k) + "</span>"; }).join("") + "</div></div>" +
      "<div class='result-block'><h4>重难点</h4><ul class='result-list'>" +
      sample.hard.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
      "<div class='result-block'><h4>常见误区</h4><ul class='result-list'>" +
      sample.misconceptions.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
      "<div class='result-block'><h4>推荐图幅</h4><div class='rec-models'>" +
      sample.models.map(function (id) {
        var m = getModel(id);
        return m ? "<div class='rec-model'><span class='mono'>" + m.id + "</span><span class='rec-name'>" + esc(m.title) + "</span>" +
          "<button class='btn btn-ghost btn-sm' data-open-model='" + m.id + "'>查看</button></div>" : "";
      }).join("") + "</div></div>" +
      "<div class='result-block'><h4>教学提示</h4><p style='font-size:13px;color:var(--ink-2)'>" + esc(sample.script) + "</p></div>" +
      "<div class='result-actions'><button class='btn btn-accent' id='toKnowledge'>用这个知识点生成模型 →</button>" +
      "<button class='btn btn-ghost' data-add-scene='" + sample.models[0] + "'>先把推荐图幅加入课件</button></div>";
  }
  function bindAnalysisActions() {
    var btn = document.getElementById("toKnowledge");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var sample = DATA.analysisSamples[state.analysisKey || "contour"];
      state.prefill = {
        topic: sample.kps[0],
        focus: sample.hard[0],
        difficulty: sample.misconceptions[0],
        chapter: sample.chapter
      };
      setView("knowledge");
    });
  }

  /* ---------- 知识点模型化 ---------- */
  function renderKnowledge() {
    var p = state.prefill || {};
    state.prefill = null;
    view.innerHTML =
      "<div class='page-head'><div>" +
      "<div class='eyebrow'>教学流程 02 / KNOWLEDGE TO MODEL</div>" +
      "<h1>知识点模型化</h1>" +
      "<p class='lede'>把一个知识点、重点与难点讲清楚：生成可交互场景，同时配好导入语、演示步骤与课堂提问。</p></div></div>" +
      "<div class='form-grid'>" +
      "<form class='panel sheet' id='kForm'>" +
      "<div class='panel-head'><div class='panel-title'>生成参数</div><span class='panel-sub'>INPUT</span></div>" +
      "<div class='field'><label for='kTopic'>知识点</label>" +
      "<input id='kTopic' list='kpList' value='" + esc(p.topic || "") + "' placeholder='例如：等高线地形图的判读' required>" +
      "<datalist id='kpList'>" + DATA.knowledgeOptions.map(function (k) { return "<option value='" + esc(k) + "'>"; }).join("") + "</datalist></div>" +
      "<div class='field-row'>" +
      "<div class='field'><label for='kChapter'>教材章节</label><select id='kChapter'>" +
      ["必修一 · 第一章", "必修一 · 第二章", "必修一 · 第三章", "必修一 · 第四章", "必修二 · 第一章", "必修二 · 第二章", "选择性必修1 · 第二章"].map(function (c) {
        return "<option" + ((p.chapter || "").indexOf(c) !== -1 ? " selected" : "") + ">" + c + "</option>";
      }).join("") + "</select></div>" +
      "<div class='field'><label for='kLevel'>学段</label><select id='kLevel'><option>高中</option><option>初中</option></select></div></div>" +
      "<div class='field'><label for='kFocus'>重点</label><textarea id='kFocus' placeholder='这节课最希望学生掌握什么？'>" + esc(p.focus || "") + "</textarea></div>" +
      "<div class='field'><label for='kDifficulty'>难点与常见误区</label><textarea id='kDifficulty' placeholder='学生最容易卡在哪里？'>" + esc(p.difficulty || "") + "</textarea></div>" +
      "<div class='field-row'>" +
      "<div class='field'><label for='kViz'>可视化类型</label><select id='kViz'><option value='terrain'>地形 / 等高线</option><option value='globe'>地球 / 球体</option></select></div>" +
      "<div class='field'><label for='kStyle'>风格</label><select id='kStyle'><option>教学示意</option><option>写实</option><option>极简</option></select></div></div>" +
      "<label class='switch-row'><input type='checkbox' id='kCompare'> 同时生成对比与变式</label>" +
      "<div class='form-actions'><button class='btn btn-accent' type='submit'>生成模型与讲解 →</button>" +
      "<button class='btn btn-ghost' type='reset'>重置</button></div>" +
      "</form>" +
      "<section class='panel sheet' id='kResult'>" +
      "<div class='result-empty'><div class='big'>生成结果会出现在这里</div><p>填好知识点与重难点，点击生成。原型会模拟生成过程并给出示例讲解。</p></div>" +
      "</section></div>";
    var form = document.getElementById("kForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      runKnowledgeGeneration();
    });
    form.addEventListener("reset", function () {
      setTimeout(function () {
        document.getElementById("kResult").innerHTML = "<div class='result-empty'><div class='big'>生成结果会出现在这里</div><p>填好知识点与重难点，点击生成。</p></div>";
      }, 0);
    });
  }
  function knowledgePayload() {
    var topic = (document.getElementById("kTopic").value || "").trim();
    if (!topic) { toast("先写一个知识点"); document.getElementById("kTopic").focus(); return null; }
    var chapterValue = document.getElementById("kChapter").value;
    var suggested = chapterForTopic(topic);
    if (chapterValue === "必修一 · 第一章" && suggested) chapterValue = suggested;
    return {
      topic: topic,
      chapter: chapterValue,
      level: document.getElementById("kLevel").value,
      focus: document.getElementById("kFocus").value.trim() || "理解核心概念与空间分布",
      difficulty: document.getElementById("kDifficulty").value.trim() || "把抽象概念与三维空间对应起来",
      viz: document.getElementById("kViz").value,
      compare: document.getElementById("kCompare").checked
    };
  }

  function attachChapterSpec(model, payload) {
    try {
      var api = window.__GEO_CHAPTER_EXPORT__;
      if (!api || !api.buildSpec) return;
      var spec = api.buildSpec(payload);
      model.chapterSpec = spec;
      model.sceneType = spec.sceneType;
      var sceneTag = spec.sceneType === "fault" ? "断层" :
        spec.sceneType === "river" ? "河流" :
        spec.sceneType === "aeolian" ? "风沙" :
        spec.sceneType === "coastal" ? "海岸" :
        spec.sceneType === "globe" ? "球体" :
        spec.sceneType === "atmosphere" ? "大气" :
        spec.sceneType === "water" ? "水" : "地形";
      model.tags = (model.tags || []).filter(function (t) { return t !== "地形" && t !== "球体"; }).concat([sceneTag]);
    } catch (err) { /* 预览不可用时保留原有模型 */ }
  }

  function chapterPreviewURL(spec) {
    return "chapter_preview.html#" + encodeURIComponent(JSON.stringify(spec));
  }
  function chapterForTopic(topic) {
    var t = String(topic || "");
    if (/断层|地垒|地堑|褶皱|板块|火山/.test(t)) return "选择性必修1 · 第二章";
    if (/喀斯特|河流|河谷|风沙|沙丘|海岸|海蚀|冰川|地貌/.test(t)) return "必修一 · 第四章";
    if (/地球|太阳|昼夜|自转|公转|经纬/.test(t)) return "必修一 · 第一章";
    if (/大气|气温|气压|风|天气|气候/.test(t)) return "必修一 · 第二章";
    if (/水循环|洋流|海水|径流|湖泊/.test(t)) return "必修一 · 第三章";
    if (/人口|城市|城镇|产业|农业|工业|交通|区域/.test(t)) return "必修二 · 第一章";
    return "";
  }


  function runKnowledgeGeneration() {
    var payload = knowledgePayload();
    if (!payload) return;
    var host = document.getElementById("kResult");
    var steps = ["解析知识点与课标", "匹配教材与常见误区", "生成模型规范", "构建三维场景", "编写讲解与课堂提问"];
    host.innerHTML = "<div class='panel-head'><div class='panel-title'>生成中</div><span class='panel-sub'>GENERATING</span></div>" +
      "<div class='steps'>" + progressRows(steps) + "</div>";
    if (state.apiOnline && window.GeoAPI) runKnowledgeRemote(payload, host, steps);
    else runKnowledgeLocal(payload, host, steps);
  }

  function runKnowledgeRemote(payload, host, steps) {
    var rows = $$(".step-row", host);
    (async function () {
      try {
        var job = await GeoAPI.createKnowledgeJob(payload);
        var tries = 0;
        while (tries < 150) {
          await wait(500);
          tries += 1;
          if (!document.body.contains(host)) return;
          var j = await GeoAPI.getJob(job.job_id);
          var stepIdx = Math.min(steps.length - 1, Math.floor((j.progress || 0) / (100 / steps.length)));
          rows.forEach(function (row, ri) {
            row.classList.toggle("running", ri === stepIdx && j.status !== "success");
            row.classList.toggle("done", ri < stepIdx || j.status === "success");
          });
          if (j.status === "success" && j.result) {
            var r = j.result;
            attachChapterSpec(r.model, payload);
            state.models.push(r.model);
            if (r.compare_model) state.models.push(r.compare_model);
            dedupeModels();
            host.innerHTML = knowledgeResultHTML(r.model, r.script, r.chapter, r.level);
            updateModelCount();
            bindKnowledgeAgain(payload, r.model, r.script);
            return;
          }
          if (j.status === "failed") throw new Error(j.error || "生成失败");
        }
        throw new Error("任务超时");
      } catch (err) {
        toast("后端生成失败，已回退本地演示：" + err.message);
        runKnowledgeLocal(payload, host, steps);
      }
    })();
  }

  function runKnowledgeLocal(payload, host, steps) {
    var rows = $$(".step-row", host);
    steps.forEach(function (_, i) {
      after(420 * (i + 1), function () {
        rows.forEach(function (r, ri) {
          r.classList.toggle("running", ri === i);
          r.classList.toggle("done", ri < i);
        });
      });
    });
    after(420 * (steps.length + 1), function () {
      var model = {
        id: localId("GEO-GEN-"),
        title: payload.topic,
        kind: payload.viz,
        category: "生成",
        chapter: payload.chapter,
        level: payload.level,
        tags: [payload.topic.slice(0, 8), "生成", payload.viz === "globe" ? "球体" : "地形"],
        summary: "围绕「" + payload.topic + "」生成的教学场景，重点呈现：" + payload.focus.slice(0, 24) + "。",
        legend: ["分层设色", "可旋转观察", "配套讲解与提问"],
        note: payload.difficulty,
        updated: today(),
        generated: true
      };
      attachChapterSpec(model, payload);
      state.models.push(model);
      if (payload.compare) {
        state.models.push({
          id: localId("GEO-GEN-"),
          title: payload.topic + " · 对比变式",
          kind: "terrain-compare",
          category: "生成",
          chapter: payload.chapter,
          level: payload.level,
          tags: ["对比", "变式"],
          summary: "同一知识点的两种情形对比，用于课堂追问。",
          legend: ["左：情形 A", "右：情形 B"],
          note: "先让学生判断差异，再解释原因。",
          updated: today(),
          generated: true
        });
      }
      var script = {
        intro: "先不要急着读图。把「" + payload.topic + "」放回它所在的空间里，想一想：如果站在现场，你会先看什么？",
        steps: "① 旋转模型，找到关键部位；② 对照标注，说出名称与判断依据；③ 用对比场景追问：条件改变后结论怎样变？",
        question: "如果把「" + payload.difficulty.slice(0, 28) + "」换成相反情形，你的判断会变吗？为什么？"
      };
      host.innerHTML = knowledgeResultHTML(model, script, payload.chapter, payload.level);
      updateModelCount();
      bindKnowledgeAgain(payload, model, script);
    });
  }

  function knowledgeResultHTML(model, script, chapter, level) {
    return "<div class='panel-head'><div class='panel-title'>生成结果</div><span class='panel-sub'>READY</span></div>" +
      "<div class='result-card'>" +
      "<div class='result-card-head'><div><div class='eyebrow'>" + model.id + "</div><h3>" + esc(model.title) + "</h3></div><span class='confidence'>已生成</span></div>" +
      "<div class='result-card-body'>" +
      "<div class='card-preview' style='height:180px;border:1px solid var(--line)'>" + svgFor(model) + "</div>" +
      "<div class='script-block'><h4>导入语</h4><p>" + esc(script.intro) + "</p></div>" +
      "<div class='script-block'><h4>演示步骤</h4><p>" + esc(script.steps) + "</p></div>" +
      "<div class='script-block'><h4>课堂提问</h4><p>" + esc(script.question) + "</p></div>" +
      "<div class='chips'><span class='chip chip-ok'><span class='dot'></span>已加入模型库</span>" +
      "<span class='chip'>" + esc(chapter) + "</span><span class='chip'>" + esc(level) + "</span></div>" +
      "<div class='result-actions'>" +
      "<button class='btn btn-accent' data-open-model='" + model.id + "'>" + (model.chapterSpec ? "打开交互场景" : "打开三维模型") + "</button>" +
      "<button class='btn btn-accent' id='kExportChapter'>导出交互课件</button>" +
      "<button class='btn btn-ghost' data-add-scene='" + model.id + "'>加入课件</button>" +
      "<button class='btn btn-ghost' id='kPreviewChapter'>预览课件</button>" +
      "<button class='btn btn-ghost' id='kAgain'>再做一版</button>" +
      "</div></div></div>";
  }

  function bindKnowledgeAgain() {
    var again = document.getElementById("kAgain");
    if (again) again.addEventListener("click", runKnowledgeGeneration);
  }

  /* ---------- 题目模型化 ---------- */
  function renderQuestion() {
    var textMode = state.providers && state.providers.text ? state.providers.text.mode : "demo";
    var visionMode = state.providers && state.providers.vision ? state.providers.vision.mode : "demo";
    var note = textMode === "real"
      ? "已接入文本模型：任意题目会真实解析，结果需教师确认。"
      : textMode === "mock"
        ? "当前为本地假模型联调模式，结果固定，不消耗额度。"
        : "演示模式：题目按关键词匹配内置题型模板；在 backend/.env 配置 Key 后自动启用真实解析。";
    if (visionMode === "real" && textMode !== "real") note += " 题目图片会调用视觉模型。";
    view.innerHTML =
      "<div class='page-head'><div>" +
      "<div class='eyebrow'>教学流程 03 / QUESTION TO MODEL</div>" +
      "<h1>题目模型化</h1>" +
      "<p class='lede'>粘贴或上传一道题，拆出考点、重难点与解题步骤，再把题目里的空间关系做成可以转动的模型。</p></div></div>" +
      "<div class='question-grid'>" +
      "<section class='panel sheet'>" +
      "<div class='panel-head'><div class='panel-title'>题目输入</div><span class='panel-sub'>TEXT / IMAGE</span></div>" +
      "<div class='field'><label for='qText'>题目原文</label>" +
      "<textarea class='question-input' id='qText' placeholder='粘贴题目文字，或上传题目图片……'></textarea></div>" +
      "<div class='question-samples'>" + DATA.questionSamples.map(function (q) {
        return "<button class='q-sample' data-q-sample='" + q.key + "'>" + q.label + "</button>";
      }).join("") + "</div>" +
      "<div class='form-actions'><button class='btn btn-accent' id='qAnalyze'>分析题目 →</button>" +
      "<label class='btn btn-ghost' for='qImage' style='cursor:pointer'>上传题目图片" +
      "<input type='file' id='qImage' accept='image/*' hidden></label>" +
      "<button class='btn btn-ghost' id='qClear'>清空</button></div>" +
      "<p class='demo-note'>" + note + "</p>" +
      "</section>" +
      "<section class='panel sheet' id='qResult'>" +
      "<div class='result-empty'><div class='big'>先给我一道题</div><p>分析结果会出现在这里：考点、重难点、解题步骤与模型建议。</p></div>" +
      "</section></div>";
    document.getElementById("qAnalyze").addEventListener("click", function () {
      var text = document.getElementById("qText").value.trim();
      if (!text) { toast("先粘贴或者选一道示例题"); return; }
      runQuestionAnalysis(text);
    });
    document.getElementById("qClear").addEventListener("click", function () {
      document.getElementById("qText").value = "";
      document.getElementById("qResult").innerHTML = "<div class='result-empty'><div class='big'>先给我一道题</div><p>分析结果会出现在这里。</p></div>";
    });
    document.getElementById("qImage").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) analyzeQuestionImage(file);
    });
  }

  function pickQuestionKey(text) {
    if (/气候|气温|降水|地中海/.test(text)) return "climate";
    if (/人口|金字塔|老龄化|增长模式/.test(text)) return "pyramid";
    return "contour";
  }

  function questionProviderLabel(provider, model) {
    if (provider === "real") return prettyModel(model) + " 解析";
    if (provider === "mock") return "假模型联调";
    return "演示模板";
  }

  function runQuestionAnalysis(text) {
    var host = document.getElementById("qResult");
    var steps = ["切分材料与设问", "识别考点与重难点", "拆解解题步骤", "匹配可视化模型"];
    host.innerHTML = "<div class='panel-head'><div class='panel-title'>分析中</div><span class='panel-sub'>ANALYZING</span></div>" +
      "<div class='steps'>" + progressRows(steps) + "</div>";
    if (state.apiOnline && window.GeoAPI) runQuestionRemote(text, host, steps);
    else runQuestionLocal(pickQuestionKey(text), host, steps);
  }

  async function runQuestionRemote(text, host, steps) {
    try {
      var job = await GeoAPI.createQuestionJob(text);
      await pollQuestionJob(job.job_id, host, steps);
    } catch (err) {
      toast("后端解析失败，已回退本地模板：" + err.message);
      runQuestionLocal(pickQuestionKey(text), host, steps);
    }
  }

  async function pollQuestionJob(jobId, host, steps) {
    var rows = $$(".step-row", host);
    var tries = 0;
    while (tries < 150) {
      await wait(500);
      tries += 1;
      if (!document.body.contains(host)) return;
      var job = await GeoAPI.getJob(jobId);
      var idx = Math.min(steps.length - 1, Math.floor((job.progress || 0) / (100 / steps.length)));
      rows.forEach(function (row, ri) {
        row.classList.toggle("running", ri === idx && job.status !== "success");
        row.classList.toggle("done", ri < idx || job.status === "success");
      });
      if (job.status === "success" && job.result) {
        host.innerHTML = questionResultHTML(job.result.analysis, job.result.provider, job.result.providerModel);
        bindQuestionResult(job.result.analysis);
        return;
      }
      if (job.status === "failed") throw new Error(job.error || "解析失败");
    }
    throw new Error("任务超时");
  }

  function runQuestionLocal(key, host, steps) {
    var rows = $$(".step-row", host);
    steps.forEach(function (_, i) {
      after(400 * (i + 1), function () {
        rows.forEach(function (r, ri) {
          r.classList.toggle("running", ri === i);
          r.classList.toggle("done", ri < i);
        });
      });
    });
    after(400 * (steps.length + 1), function () {
      var analysis = DATA.questionAnalysis[key];
      host.innerHTML = questionResultHTML(analysis, "demo", "");
      bindQuestionResult(analysis);
    });
  }

  function questionResultHTML(a, provider, providerModel) {
    var model = getModel(a.modelId);
    var source = "<span class='chip chip-ok'><span class='dot'></span>" + questionProviderLabel(provider, providerModel) + "</span>";
    var questionBlock = a.questionText
      ? "<div class='result-block'><h4>题目原文</h4><p style='font-size:13px;color:var(--ink-2)'>" + esc(a.questionText) + "</p></div>"
      : "";
    return "<div class='panel-head'><div class='panel-title'>题目分析</div><span class='panel-sub'>ANALYSIS</span></div>" +
      "<div class='chips' style='margin-bottom:10px'>" + source + "</div>" +
      "<h3>重难点诊断</h3>" +
      "<p class='muted' style='font-size:13px;margin-top:4px'>" + esc(a.summary || "") + "</p>" +
      questionBlock +
      "<div class='result-block'><h4>考点</h4><div class='chips'>" +
      (a.kps || []).map(function (k) { return "<span class='chip'><span class='dot'></span>" + esc(k) + "</span>"; }).join("") + "</div></div>" +
      "<div class='result-block'><h4>关键难点</h4><p style='font-size:13px;color:var(--ink-2)'>" + esc(a.hard || "") + "</p></div>" +
      "<div class='result-block'><h4>解题步骤</h4><div class='step-list'>" +
      (a.steps || []).map(function (s) { return "<div class='step-item'><span class='step-num'></span><span>" + esc(s) + "</span></div>"; }).join("") + "</div></div>" +
      "<div class='result-block'><h4>易错点</h4><ul class='result-list'>" +
      (a.pitfalls || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>" +
      "<div class='result-block'><h4>参考答案</h4><p style='font-size:13px;color:var(--ink-2)'>" + esc(a.answer || "") + "</p></div>" +
      "<div class='result-block'><h4>推荐模型</h4><div class='rec-models'>" +
      (model ? "<div class='rec-model'><span class='mono'>" + model.id + "</span><span class='rec-name'>" + esc(model.title) + "</span>" +
        "<button class='btn btn-ghost btn-sm' data-open-model='" + model.id + "'>查看</button></div>" : "") + "</div></div>" +
      "<div class='result-actions'><button class='btn btn-accent' id='qGenModel'>生成题目模型 →</button>" +
      (model ? "<button class='btn btn-ghost' data-add-scene='" + model.id + "'>把推荐模型加入课件</button>" : "") + "</div>" +
      "<div id='qModelArea'></div>";
  }

  function bindQuestionResult(a) {
    var gen = document.getElementById("qGenModel");
    if (gen) gen.addEventListener("click", function () { generateQuestionModel(a); });
  }

  async function analyzeQuestionImage(file) {
    if (!state.apiOnline || !window.GeoAPI) {
      toast("连接后端后支持题目图片解析");
      return;
    }
    var host = document.getElementById("qResult");
    var steps = ["上传题目图片", "识别题干与设问", "拆解考点与解题步骤", "匹配可视化模型"];
    host.innerHTML = "<div class='panel-head'><div class='panel-title'>分析中</div><span class='panel-sub'>VISION</span></div>" +
      "<div class='steps'>" + progressRows(steps) + "</div>";
    try {
      var job = await GeoAPI.createQuestionJobImage(file, document.getElementById("qText").value.trim());
      await pollQuestionJob(job.job_id, host, steps);
    } catch (err) {
      toast("题目图片解析失败：" + err.message);
      host.innerHTML = "<div class='result-empty'><div class='big'>解析失败</div><p>" + esc(err.message) + "</p></div>";
    }
  }

  function generateQuestionModel(a) {
    var base = getModel(a.modelId);
    var area = document.getElementById("qModelArea");
    if (!area) return;
    var steps = ["提取题目空间关系", "构建模型与标注", "生成分步演示"];
    area.innerHTML = "<div class='result-block'><h4>生成模型</h4><div class='steps'>" + progressRows(steps) + "</div></div>";
    var rows = $$(".step-row", area);
    steps.forEach(function (_, i) {
      after(380 * (i + 1), function () {
        rows.forEach(function (r, ri) {
          r.classList.toggle("running", ri === i);
          r.classList.toggle("done", ri < i);
        });
      });
    });
    after(380 * (steps.length + 1), function () {
      var id = localId("GEO-Q-");
      var model = {
        id: id,
        title: "题目模型 · " + (base ? base.title : "示例"),
        kind: base ? base.kind : "terrain",
        category: "生成",
        chapter: base ? base.chapter : "必修一 · 第一章",
        level: "高中",
        tags: ["题目", "分步演示"],
        summary: "从题目条件出发的可交互模型，配合分步演示核对答案。",
        legend: ["条件标注", "分步演示", "可旋转核对"],
        note: a.hard,
        updated: today(),
        generated: true
      };
      state.models.push(model);
      dedupeModels();
      persistModel(model);
      area.innerHTML = "<div class='result-block'><h4>生成模型</h4>" +
        "<div class='card-preview' style='height:150px;border:1px solid var(--line)'>" + svgFor(model) + "</div>" +
        "<p class='muted' style='font-size:12px;margin-top:8px'><strong style='color:var(--ink)'>" + esc(model.title) + "</strong> · " + model.id + " · 已加入模型库</p>" +
        "<div class='result-actions'><button class='btn btn-accent' data-open-model='" + id + "'>打开模型</button>" +
        "<button class='btn btn-ghost' data-add-scene='" + id + "'>加入课件</button></div></div>";
      updateModelCount();
    });
  }

  /* ---------- 课件编排 ---------- */
  function renderCourseware() {
    var cw = state.courseware;
    view.innerHTML =
      "<div class='page-head'><div>" +
      "<div class='eyebrow'>教学流程 04 / COURSEWARE</div>" +
      "<h1>把素材排成一节课</h1>" +
      "<p class='lede'>按「导入 → 演示 → 对比 → 练习 → 小结」编排场景。课堂演示会全屏播放，支持键盘翻页。</p></div>" +
      "<div class='page-actions'><button class='btn btn-ghost' data-view='prep'>查看备课包</button>" +
      "<button class='btn btn-accent' id='startClass'>课堂演示 →</button></div></div>" +
      "<div class='cw-toolbar'><input class='cw-title-input' id='cwTitle' value='" + esc(cw.title) + "' aria-label='课件标题'>" +
      "<span class='tag-code'>" + esc(cw.subject) + "</span></div>" +
      "<div class='cw-layout'>" +
      "<div class='panel sheet'>" +
      "<div class='panel-head'><div class='panel-title'>场景顺序</div><span class='panel-sub'>" + cw.scenes.length + " SCENES</span></div>" +
      "<div class='scene-list' id='sceneList'></div>" +
      "<div class='add-scene-row'>" +
      ["intro", "model", "compare", "quiz", "summary"].map(function (t) {
        return "<button class='chip-btn' data-add-scene-type='" + t + "'>+ " + SCENE_NAMES[t] + "</button>";
      }).join("") + "</div></div>" +
      "<div class='panel sheet' id='sceneEditor'></div>" +
      "</div>";
    document.getElementById("cwTitle").addEventListener("input", function (e) {
      state.courseware.title = e.target.value;
      persistCourseware();
    });
    document.getElementById("startClass").addEventListener("click", openClassroom);
    renderSceneList();
    renderSceneEditor();
  }
  function renderSceneList() {
    var host = document.getElementById("sceneList");
    if (!host) return;
    host.innerHTML = state.courseware.scenes.map(function (s, i) {
      return "<div class='scene-item " + (s.id === state.activeSceneId ? "active" : "") + "' data-scene='" + s.id + "'>" +
        "<span class='scene-type'>" + (i + 1 < 10 ? "0" : "") + (i + 1) + " " + SCENE_NAMES[s.type] + "</span>" +
        "<span class='scene-name'>" + esc(s.title) + "</span>" +
        "<span class='scene-tools'>" +
        "<button data-scene-action='up' data-id='" + s.id + "' title='上移'>↑</button>" +
        "<button data-scene-action='down' data-id='" + s.id + "' title='下移'>↓</button>" +
        "<button data-scene-action='delete' data-id='" + s.id + "' title='删除'>×</button>" +
        "</span></div>";
    }).join("");
  }
  function activeScene() {
    return state.courseware.scenes.filter(function (s) { return s.id === state.activeSceneId; })[0] || state.courseware.scenes[0];
  }
  function renderSceneEditor() {
    var host = document.getElementById("sceneEditor");
    if (!host) return;
    var s = activeScene();
    if (!s) {
      host.innerHTML = "<div class='editor-empty'>先添加一个场景。</div>";
      return;
    }
    var fields = "";
    if (s.type === "intro" || s.type === "summary") {
      fields = "<div class='field'><label>正文</label><textarea data-field='text'>" + esc(s.text || "") + "</textarea></div>";
    } else if (s.type === "model") {
      fields = "<div class='field'><label>模型</label><select data-field='modelId'>" +
        allModels().map(function (m) { return "<option value='" + m.id + "'" + (m.id === s.modelId ? " selected" : "") + ">" + m.id + " · " + esc(m.title) + "</option>"; }).join("") +
        "</select></div>" +
        "<div class='field'><label>演示步骤（每行一步）</label><textarea data-field='steps'>" + esc((s.steps || []).join("\n")) + "</textarea></div>";
    } else if (s.type === "compare") {
      fields = "<div class='field'><label>对比模型</label><select data-field='modelId'>" +
        allModels().map(function (m) { return "<option value='" + m.id + "'" + (m.id === s.modelId ? " selected" : "") + ">" + m.id + " · " + esc(m.title) + "</option>"; }).join("") +
        "</select></div>" +
        "<div class='field'><label>讲解文字</label><textarea data-field='text'>" + esc(s.text || "") + "</textarea></div>";
    } else if (s.type === "quiz") {
      var q = s.quiz || { q: "", options: ["", "", "", ""], answer: 0, explain: "" };
      fields = "<div class='field'><label>题干</label><textarea data-field='quiz.q'>" + esc(q.q) + "</textarea></div>" +
        "<div class='field-row'>" + q.options.map(function (o, i) {
          return "<div class='field'><label>选项 " + String.fromCharCode(65 + i) + "</label><input data-field='quiz.option" + i + "' value='" + esc(o) + "'></div>";
        }).join("") + "</div>" +
        "<div class='field'><label>正确答案</label><select data-field='quiz.answer'>" +
        q.options.map(function (_, i) { return "<option value='" + i + "'" + (q.answer === i ? " selected" : "") + ">" + String.fromCharCode(65 + i) + "</option>"; }).join("") +
        "</select></div>" +
        "<div class='field'><label>解析</label><textarea data-field='quiz.explain'>" + esc(q.explain) + "</textarea></div>";
    }
    host.innerHTML =
      "<div class='panel-head'><div class='panel-title'>编辑场景</div><span class='panel-sub'>" + SCENE_NAMES[s.type] + "</span></div>" +
      "<div class='field'><label>场景标题</label><input data-field='title' value='" + esc(s.title) + "'></div>" +
      fields +
      "<div class='editor-preview' id='slidePreview'></div>";
    updateSlidePreview();
  }
  function updateSlidePreview() {
    var host = document.getElementById("slidePreview");
    if (!host) return;
    host.innerHTML = slideHTML(activeScene(), false);
    host.className = "editor-preview slide";
  }
  function slideHTML(s, large) {
    if (!s) return "";
    var eb = "<div class='slide-eyebrow'>" + SCENE_NAMES[s.type] + " / " + (large ? "CLASS" : "PREVIEW") + "</div>";
    if (s.type === "intro" || s.type === "summary") {
      return eb + "<div class='slide-title'>" + esc(s.title) + "</div><div class='slide-text'>" + esc(s.text || "") + "</div>";
    }
    if (s.type === "model") {
      var m = getModel(s.modelId);
      return eb + "<div class='slide-title'>" + esc(s.title) + "</div><div class='slide-text'>" + (m ? esc(m.summary) : "") + "</div>" +
        "<div class='chips' style='margin-top:12px'>" + (s.steps || []).slice(0, 2).map(function (x) { return "<span class='chip'>" + esc(x.slice(0, 18)) + "</span>"; }).join("") + "</div>";
    }
    if (s.type === "compare") {
      return eb + "<div class='slide-title'>" + esc(s.title) + "</div><div class='slide-text'>" + esc(s.text || "") + "</div>";
    }
    if (s.type === "quiz") {
      var q = s.quiz || { q: "", options: [], answer: 0, explain: "" };
      return eb + "<div class='slide-title'>" + esc(s.title) + "</div><div class='slide-text'>" + esc(q.q) + "</div>" +
        "<div class='slide-quiz'>" + (q.options || []).map(function (o, i) {
          return "<button class='slide-option' disabled>" + String.fromCharCode(65 + i) + ". " + esc(o) + "</button>";
        }).join("") + "</div>";
    }
    return "";
  }

  /* ---------- 课堂演示 ---------- */
  function openClassroom() {
    if (!state.courseware.scenes.length) { toast("课件还没有场景"); return; }
    state.classroom = { index: 0, step: 0, open: true };
    classroom.hidden = false;
    renderClassroom();
    document.getElementById("classroomClose").focus();
  }
  function closeClassroom() {
    classroom.hidden = true;
    Viewers.destroyAll();
    state.classroom.open = false;
  }
  function renderClassroom() {
    var scenes = state.courseware.scenes;
    var i = clamp(state.classroom.index, 0, scenes.length - 1);
    state.classroom.index = i;
    var s = scenes[i];
    document.getElementById("classroomTitle").textContent = state.courseware.title;
    document.getElementById("classroomCounter").textContent = (i + 1) + " / " + scenes.length + " · " + SCENE_NAMES[s.type];
    document.getElementById("classroomDots").innerHTML = scenes.map(function (_, di) {
      return "<span class='cdot " + (di === i ? "active" : "") + "'></span>";
    }).join("");
    Viewers.destroyAll();
    classroomStage.innerHTML = "";
    if (s.type === "intro" || s.type === "summary") {
      classroomStage.innerHTML = "<div class='slide-scene'>" + slideHTML(s, true) + "</div>";
    } else if (s.type === "model") {
      var m = getModel(s.modelId);
      classroomStage.innerHTML =
        "<div class='classroom-model'>" +
        "<div><div class='classroom-canvas' id='classCanvas'></div></div>" +
        "<div class='classroom-steps' id='classSteps'>" +
        (s.steps || []).map(function (t, si) {
          return "<button class='classroom-step " + (si === state.classroom.step ? "active" : "") + "' data-class-step='" + si + "'>" +
            "<span class='mono'>STEP " + (si + 1) + "</span>" + esc(t) + "</button>";
        }).join("") + "</div></div>";
      var canvas = document.getElementById("classCanvas");
      if (m && m.kind === "globe") Viewers.createGlobe(canvas, { bg: 0x0b171b });
      else if (m && m.kind === "glb") Viewers.createGLB(canvas, m.glb, m.preview);
      else if (m && m.kind === "procedural") Viewers.createProcedural(canvas, m.factory || "MayonFactory", m.preview);
      else if (m && m.kind === "fold") Viewers.createFold(canvas, { bg: 0x0b171b, autoplay: true, labels: true });
      else Viewers.createTerrain(canvas, { bg: 0x0b171b, scale: 1 });
      $$("#classSteps .classroom-step").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.classroom.step = parseInt(btn.getAttribute("data-class-step"), 10) || 0;
          $$("#classSteps .classroom-step").forEach(function (b, bi) {
            b.classList.toggle("active", bi === state.classroom.step);
          });
        });
      });
    } else if (s.type === "compare") {
      classroomStage.innerHTML =
        "<div class='classroom-compare'>" +
        "<div><div class='classroom-canvas' id='cmpA'></div><div class='compare-caption'>缓坡 · 等高线稀疏</div></div>" +
        "<div><div class='classroom-canvas' id='cmpB'></div><div class='compare-caption'>陡坡 · 等高线密集</div></div>" +
        "</div>";
      Viewers.createTerrain(document.getElementById("cmpA"), { bg: 0x0b171b, scale: 0.72, freq: 0.9 });
      Viewers.createTerrain(document.getElementById("cmpB"), { bg: 0x0b171b, scale: 1.55, freq: 1.35 });
    } else if (s.type === "quiz") {
      var q = s.quiz || { q: "", options: [], answer: 0, explain: "" };
      classroomStage.innerHTML =
        "<div class='slide-scene'><div class='slide-eyebrow'>课堂练习 / QUIZ</div>" +
        "<div class='slide-title'>" + esc(q.q) + "</div>" +
        "<div class='classroom-quiz' id='classQuiz'>" +
        (q.options || []).map(function (o, oi) {
          return "<button class='slide-option' data-quiz-opt='" + oi + "'>" + String.fromCharCode(65 + oi) + ". " + esc(o) + "</button>";
        }).join("") + "</div>" +
        "<div class='classroom-feedback' id='quizFeedback'></div></div>";
      $$("#classQuiz .slide-option").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var oi = parseInt(btn.getAttribute("data-quiz-opt"), 10);
          $$("#classQuiz .slide-option").forEach(function (b, bi) {
            b.classList.toggle("correct", bi === q.answer);
            b.classList.toggle("wrong", bi === oi && oi !== q.answer);
          });
          document.getElementById("quizFeedback").textContent = oi === q.answer ? "回答正确。" + (q.explain || "") : "再看一眼等高线的凸出方向。" + (q.explain || "");
        });
      });
    }
  }
  function classroomNext() {
    var scenes = state.courseware.scenes;
    var s = scenes[state.classroom.index];
    if (s && s.type === "model" && state.classroom.step < (s.steps || []).length - 1) {
      state.classroom.step += 1;
      $$("#classSteps .classroom-step").forEach(function (b, bi) {
        b.classList.toggle("active", bi === state.classroom.step);
      });
      return;
    }
    if (state.classroom.index < scenes.length - 1) {
      state.classroom.index += 1;
      state.classroom.step = 0;
      renderClassroom();
    }
  }
  function classroomPrev() {
    var s = state.courseware.scenes[state.classroom.index];
    if (s && s.type === "model" && state.classroom.step > 0) {
      state.classroom.step -= 1;
      $$("#classSteps .classroom-step").forEach(function (b, bi) {
        b.classList.toggle("active", bi === state.classroom.step);
      });
      return;
    }
    if (state.classroom.index > 0) {
      state.classroom.index -= 1;
      state.classroom.step = 0;
      renderClassroom();
    }
  }

  /* ---------- 备课包 ---------- */
  function renderPrep() {
    var cw = state.courseware;
    var models = [];
    cw.scenes.forEach(function (s) {
      if (s.modelId && models.indexOf(s.modelId) === -1) models.push(s.modelId);
    });
    var rows = cw.scenes.map(function (s, i) {
      var content = s.text || "";
      if (s.type === "model") {
        var m = getModel(s.modelId);
        content = "模型演示：" + (m ? m.title : s.modelId) + "。步骤：" + (s.steps || []).join(" / ");
      } else if (s.type === "quiz") {
        content = (s.quiz ? s.quiz.q : "") + "（答案：" + (s.quiz ? String.fromCharCode(65 + s.quiz.answer) : "") + "）";
      }
      return "<tr><td>" + (i + 1) + "</td><td>" + SCENE_NAMES[s.type] + "</td><td>" + esc(s.title) + "</td><td>" + esc(content) + "</td></tr>";
    }).join("");
    view.innerHTML =
      "<div class='page-head'><div>" +
      "<div class='eyebrow'>教学流程 05 / LESSON PACK</div>" +
      "<h1>备课包</h1>" +
      "<p class='lede'>把课件、模型清单、题目与课堂提示整理成一页，可打印、可导出，也可直接带到课堂。</p></div>" +
      "<div class='page-actions prep-toolbar'><button class='btn btn-ghost' id='printPrep'>打印 / 导出 PDF</button>" +
      "<button class='btn btn-ghost' id='copyPrep'>复制文字</button>" +
      "<button class='btn btn-accent' id='exportPrep'>下载备课包 JSON</button></div></div>" +
      "<article class='prep-doc' id='prepDoc'>" +
      "<div class='eyebrow'>课时备课包 / LESSON PACK</div>" +
      "<h1>" + esc(cw.title) + "</h1>" +
      "<div class='prep-meta'><span>" + esc(cw.subject) + "</span><span>课型：新授课</span><span>时长：40 分钟</span><span>生成日期：" + today() + "</span></div>" +
      "<section class='prep-section'><h2>教学目标</h2>" +
      "<ol><li>能读懂等高线地形图，说出等高距与比例尺的作用。</li>" +
      "<li>能判断山脊、山谷、鞍部与陡崖，并说明判断依据。</li>" +
      "<li>能用等高线疏密比较坡度，把平面图还原为三维空间。</li></ol></section>" +
      "<section class='prep-section'><h2>教学过程</h2>" +
      "<table class='prep-table'><thead><tr><th>#</th><th>环节</th><th>场景</th><th>内容与操作</th></tr></thead><tbody>" + rows + "</tbody></table></section>" +
      "<section class='prep-section'><h2>模型清单</h2>" +
      "<ul>" + models.map(function (id) {
        var m = getModel(id);
        return "<li>" + id + " · " + esc(m ? m.title : "") + (m ? "（" + esc(m.chapter) + "）" : "") + "</li>";
      }).join("") + "</ul></section>" +
      "<section class='prep-section'><h2>课堂提示</h2>" +
      "<p>先读等高距再判部位，最后用疏密看坡度。提问时先让学生用手势比划坡面，再回到图上指认。</p></section>" +
      "<section class='prep-section'><h2>作业与延伸</h2>" +
      "<p>用一张本地等高线图，标出至少两处山脊和一处山谷，并说明判断依据。有余力的同学尝试画出沿某条线的地形剖面。</p></section>" +
      "</article>";
    document.getElementById("printPrep").addEventListener("click", function () { window.print(); });
    document.getElementById("exportPrep").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(state.courseware, null, 2)], { type: "application/json;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = state.courseware.title + "-备课包.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast("备课包已下载");
    });
    document.getElementById("copyPrep").addEventListener("click", function () {
      var text = state.courseware.title + "\n" + state.courseware.subject + "\n\n" +
        state.courseware.scenes.map(function (s, i) { return (i + 1) + ". " + s.title + "（" + SCENE_NAMES[s.type] + "）"; }).join("\n");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast("已复制到剪贴板"); }, function () { toast("复制失败，请手动选择文字"); });
      } else {
        toast("当前环境不支持自动复制");
      }
    });
  }

  /* ---------- 场景操作 ---------- */
  function addModelToCourseware(id) {
    var m = getModel(id);
    if (!m) return;
    var scene = {
      id: "s" + Date.now(),
      type: "model",
      title: "模型演示：" + m.title,
      modelId: m.id,
      steps: m.legend && m.legend.length ? m.legend.slice() : ["观察整体形态", "旋转查看关键部位"]
    };
    state.courseware.scenes.push(scene);
    state.activeSceneId = scene.id;
    persistCourseware();
    toast("已加入课件（共 " + state.courseware.scenes.length + " 个场景）");
    if (state.view === "courseware") { renderSceneList(); renderSceneEditor(); }
  }
  function addScene(type) {
    var s;
    if (type === "intro") s = { id: "s" + Date.now(), type: "intro", title: "新的导入", text: "用一个问题或一张图，把学生带进这节课。" };
    else if (type === "model") s = { id: "s" + Date.now(), type: "model", title: "模型演示", modelId: allModels()[0].id, steps: ["观察整体", "找到关键部位", "说出判断依据"] };
    else if (type === "compare") s = { id: "s" + Date.now(), type: "compare", title: "对比与变式", modelId: "GEO-TER-002", text: "比较两种情形，追问条件改变后的结果。" };
    else if (type === "quiz") s = { id: "s" + Date.now(), type: "quiz", title: "课堂练习", quiz: { q: "下面哪个部位适合修建水库大坝？", options: ["山脊", "山谷出口", "鞍部", "陡崖"], answer: 1, explain: "山谷出口处集水面积大，工程量较小。" } };
    else s = { id: "s" + Date.now(), type: "summary", title: "小结", text: "用三句话总结今天的读图顺序。" };
    state.courseware.scenes.push(s);
    state.activeSceneId = s.id;
    persistCourseware();
    renderSceneList();
    renderSceneEditor();
  }

  /* ---------- 模型弹窗 ---------- */
  function openModel(id) {
    var m = getModel(id);
    if (!m) return;
    if (m.chapterSpec) {
      var win = window.open(chapterPreviewURL(m.chapterSpec), "_blank");
      if (!win) toast("浏览器拦截了新标签页，请允许弹窗后重试。");
      return;
    }
    modalEyebrow.textContent = m.id + " · " + m.chapter;
    modalTitle.textContent = m.title;
    var legend = (m.legend || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    var demoNote = m.chapterSpec
      ? "这是按知识点生成的交互场景：可切换 6 个教学步骤、拖动滑杆、完成课堂自测。场景为教学示意。"
      : "拖动旋转，滚轮缩放。褶皱图幅可播放挤压形成过程；Tripo 图幅为真实 GLB，程序化图幅由 img2threejs 生成。";
    if (location.protocol === "file:" && m.kind === "glb") {
      demoNote += " 当前是本地文件打开，GLB 只能显示预览图；请运行 web/start_server.bat 后访问 http://localhost:8000。";
    }
    var viewerBlock;
    if (m.kind === "static") {
      viewerBlock = "<div class='viewer-wrap' style='display:grid;place-items:center'>" + svgFor(m) + "</div>";
    } else if (m.kind === "fold") {
      viewerBlock = "<div class='viewer-wrap' id='modelViewer'></div>" +
        "<div class='fold-controls'>" +
        "<button class='btn btn-sm' id='foldPlay'>播放形成</button>" +
        "<label class='fold-range'>挤压 <input type='range' id='foldRange' min='0' max='100' value='0'></label>" +
        "<label class='fold-check'><input type='checkbox' id='foldLabels' checked> 标注</label>" +
        "</div>";
    } else {
      viewerBlock = "<div class='viewer-wrap' id='modelViewer'></div>";
    }
    modalBody.innerHTML =
      "<div class='model-detail'>" +
      "<div>" + viewerBlock +
      "<div class='viewer-tools'>" +
      ((m.kind === "terrain" || m.kind === "terrain-compare") ? "<button class='btn btn-ghost btn-sm' id='compareToggle'>切换对比模式</button>" : "") +
      "<button class='btn btn-ghost btn-sm' data-add-scene='" + m.id + "'>加入课件</button>" +
      (m.kind === "glb"
        ? "<a class='btn btn-ghost btn-sm' href='" + esc(m.glb) + "' download>下载 GLB</a>"
        : m.kind === "procedural"
          ? "<a class='btn btn-ghost btn-sm' href='vendor/mayon_factory.js' download>下载生成代码</a>"
          : m.kind === "fold"
            ? ""
            : "<button class='btn btn-ghost btn-sm' id='exportGlb'>导出 GLB（演示）</button>") +
      "</div>" +
      "<p class='demo-note' style='margin-top:10px'>" + demoNote + "</p>" +
      "</div>" +
      "<aside>" +
      "<div class='side-block'><h4>简介</h4><p>" + esc(m.summary) + "</p></div>" +
      "<div class='side-block'><h4>图例</h4><ul>" + legend + "</ul></div>" +
      "<div class='side-block'><h4>教学提示</h4><p>" + esc(m.note || "") + "</p></div>" +
      "<div class='side-block'><h4>标签</h4><div class='chips'>" + (m.tags || []).map(function (t) { return "<span class='chip'>" + esc(t) + "</span>"; }).join("") + "</div></div>" +
      "<div class='side-block'><h4>图幅信息</h4><p class='mono' style='font-size:11px'>" + m.id + "<br>" + esc(m.chapter) + " · " + esc(m.level) + "<br>更新：" + esc(m.updated || "") + "</p></div>" +
      "</aside></div>";
    showModal();
    requestAnimationFrame(function () {
      if (m.kind === "static") return;
      var hostEl = document.getElementById("modelViewer");
      if (!hostEl) return;
      if (m.kind === "globe") {
        Viewers.createGlobe(hostEl, {});
      } else if (m.kind === "terrain-compare") {
        hostEl.outerHTML = "<div class='compare-wrap' id='compareHost'>" +
          "<div class='compare-pane' id='cmp1'><span class='compare-label'>缓坡 / 稀疏</span></div>" +
          "<div class='compare-pane' id='cmp2'><span class='compare-label'>陡坡 / 密集</span></div></div>";
        Viewers.createTerrain(document.getElementById("cmp1"), { scale: 0.72, freq: 0.9 });
        Viewers.createTerrain(document.getElementById("cmp2"), { scale: 1.55, freq: 1.35 });
      } else if (m.kind === "glb") {
        Viewers.createGLB(hostEl, m.glb, m.preview);
      } else if (m.kind === "procedural") {
        Viewers.createProcedural(hostEl, m.factory || "MayonFactory", m.preview);
      } else if (m.kind === "fold") {
        var foldHandle = Viewers.createFold(hostEl, { autoplay: false, labels: true });
        var foldPlay = document.getElementById("foldPlay");
        var foldRange = document.getElementById("foldRange");
        var foldLabels = document.getElementById("foldLabels");
        if (foldHandle && foldPlay) {
          foldPlay.addEventListener("click", function () { foldHandle.play(); });
          foldRange.addEventListener("input", function () { foldHandle.setT(parseInt(foldRange.value, 10) / 100); });
          foldLabels.addEventListener("change", function () { foldHandle.toggleLabels(foldLabels.checked); });
        }
      } else {
        Viewers.createTerrain(hostEl, { scale: 1 });
      }
      var toggle = document.getElementById("compareToggle");
      if (toggle) {
        toggle.addEventListener("click", function () {
          Viewers.destroyAll();
          var host2 = document.getElementById("modelViewer") || document.getElementById("compareHost");
          if (!host2) return;
          var wrap = document.createElement("div");
          wrap.className = "compare-wrap";
          wrap.id = "compareHost";
          wrap.innerHTML = "<div class='compare-pane' id='cmp1'><span class='compare-label'>缓坡 / 稀疏</span></div>" +
            "<div class='compare-pane' id='cmp2'><span class='compare-label'>陡坡 / 密集</span></div>";
          host2.replaceWith(wrap);
          Viewers.createTerrain(document.getElementById("cmp1"), { scale: 0.72, freq: 0.9 });
          Viewers.createTerrain(document.getElementById("cmp2"), { scale: 1.55, freq: 1.35 });
          toast("已切换到对比模式");
        });
      }
      var glb = document.getElementById("exportGlb");
      if (glb) glb.addEventListener("click", function () { toast("原型演示：接入 Tripo / Blender 后可导出 GLB"); });
    });
  }
  function showModal() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var closeBtn = $("[data-close-modal]", modal);
    if (closeBtn) closeBtn.focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    Viewers.destroyAll();
  }
  function openHelp() {
    modalEyebrow.textContent = "使用说明 / GUIDE";
    modalTitle.textContent = "课件库怎么用";
    modalBody.innerHTML =
      "<div class='help-body'>" +
      "<p>当前版本只开放「课件库」。点卡片进入对应章节，每章都是独立的单文件交互课件，断网也能打开。</p>" +
      "<h4>01 打开课件</h4><p>在课件库点任意卡片，或点「打开课件」，会在新标签页打开该章。也可以用搜索框按章节名、知识点或标签筛选。</p>" +
      "<h4>02 课堂操作</h4><p>课件左侧是 6 个教学步骤；中间拖动旋转、滚轮缩放；右侧滑块控制核心参数；黄色热点可以点开知识点。</p>" +
      "<h4>03 离线使用</h4><p>章节课件均为单文件 HTML，Three.js 与模型数据都内嵌在文件里，不依赖网络与本地服务器。</p>" +
      "<h4>04 后续功能</h4><p>识图分析、知识点模型化、题目模型化、课件编排与备课包正在打磨，入口先以「敬请期待」占位，后续会陆续开放。</p>" +
      "</div>";
    showModal();
  }

  /* ------------------------------------------------------------
     全局事件
     ------------------------------------------------------------ */
  document.addEventListener("click", function (e) {
    var scrollGrid = e.target.closest("[data-scroll-grid]");
    if (scrollGrid) {
      var g = document.getElementById("libGrid");
      if (g) g.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var nav = e.target.closest("[data-view]");
    if (nav) { setView(nav.getAttribute("data-view")); return; }
    var openCh = e.target.closest("[data-open-chapter]");
    if (openCh) { window.open(openCh.getAttribute("data-open-chapter"), "_blank"); return; }
    var closeM = e.target.closest("[data-close-modal]");
    if (closeM) { closeModal(); return; }
    var addS = e.target.closest("[data-add-scene]");
    if (addS) { addModelToCourseware(addS.getAttribute("data-add-scene")); return; }
    var openM = e.target.closest("[data-open-model]");
    if (openM) { openModel(openM.getAttribute("data-open-model")); return; }
    var sample = e.target.closest("[data-sample]");
    if (sample) {
      state.analysisKey = sample.getAttribute("data-sample");
      startAnalysis(state.analysisKey, false);
      return;
    }
    var cat = e.target.closest("[data-cat]");
    if (cat) {
      state.category = cat.getAttribute("data-cat");
      $$("#catChips .chip-btn").forEach(function (b) { b.classList.toggle("active", b === cat); });
      updateLibraryGrid();
      return;
    }
    var sceneItem = e.target.closest("[data-scene]");
    if (sceneItem && !e.target.closest("[data-scene-action]")) {
      state.activeSceneId = sceneItem.getAttribute("data-scene");
      renderSceneList();
      renderSceneEditor();
      return;
    }
    var sceneAct = e.target.closest("[data-scene-action]");
    if (sceneAct) {
      var id = sceneAct.getAttribute("data-id");
      var act = sceneAct.getAttribute("data-scene-action");
      var idx = state.courseware.scenes.findIndex(function (s) { return s.id === id; });
      if (act === "delete" && idx !== -1) {
        state.courseware.scenes.splice(idx, 1);
        if (state.activeSceneId === id) state.activeSceneId = state.courseware.scenes[0] ? state.courseware.scenes[0].id : null;
      } else if (act === "up" && idx > 0) {
        var tmp = state.courseware.scenes[idx - 1];
        state.courseware.scenes[idx - 1] = state.courseware.scenes[idx];
        state.courseware.scenes[idx] = tmp;
      } else if (act === "down" && idx !== -1 && idx < state.courseware.scenes.length - 1) {
        var tmp2 = state.courseware.scenes[idx + 1];
        state.courseware.scenes[idx + 1] = state.courseware.scenes[idx];
        state.courseware.scenes[idx] = tmp2;
      }
      persistCourseware();
      renderSceneList();
      renderSceneEditor();
      return;
    }
    var addType = e.target.closest("[data-add-scene-type]");
    if (addType) { addScene(addType.getAttribute("data-add-scene-type")); return; }
    var qSample = e.target.closest("[data-q-sample]");
    if (qSample) {
      var key = qSample.getAttribute("data-q-sample");
      var item = DATA.questionSamples.filter(function (q) { return q.key === key; })[0];
      if (item) {
        document.getElementById("qText").value = item.text;
        runQuestionAnalysis(item.text);
      }
      return;
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "libSearch") {
      state.query = e.target.value;
      updateLibraryGrid();
      return;
    }
    var field = e.target.getAttribute("data-field");
    if (!field) return;
    var s = activeScene();
    if (!s) return;
    if (field === "title") s.title = e.target.value;
    else if (field === "text") s.text = e.target.value;
    else if (field === "steps") s.steps = e.target.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    else if (field === "modelId") s.modelId = e.target.value;
    else if (field === "quiz.q") { s.quiz = s.quiz || { options: ["", "", "", ""], answer: 0, explain: "" }; s.quiz.q = e.target.value; }
    else if (field === "quiz.explain") { s.quiz = s.quiz || { q: "", options: ["", "", "", ""], answer: 0 }; s.quiz.explain = e.target.value; }
    else if (field.indexOf("quiz.option") === 0) {
      s.quiz = s.quiz || { q: "", options: ["", "", "", ""], answer: 0, explain: "" };
      s.quiz.options[parseInt(field.replace("quiz.option", ""), 10)] = e.target.value;
    }
    if (field === "title" || field === "text") {
      var list = document.getElementById("sceneList");
      if (list) renderSceneList();
    }
    persistCourseware();
    updateSlidePreview();
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "levelSelect") {
      var v = e.target.value;
      state.level = v === "全部学段" ? "全部" : v;
      updateLibraryGrid();
      return;
    }
    var field = e.target.getAttribute && e.target.getAttribute("data-field");
    if (!field) return;
    var s = activeScene();
    if (!s) return;
    if (field === "modelId") s.modelId = e.target.value;
    else if (field === "quiz.answer") {
      s.quiz = s.quiz || { q: "", options: ["", "", "", ""], answer: 0, explain: "" };
      s.quiz.answer = parseInt(e.target.value, 10) || 0;
    }
    persistCourseware();
    updateSlidePreview();
  });

  document.getElementById("helpBtn").addEventListener("click", openHelp);
  document.getElementById("railToggle").addEventListener("click", function () {
    rail.classList.add("open");
    railScrim.hidden = false;
  });
  railScrim.addEventListener("click", function () {
    rail.classList.remove("open");
    railScrim.hidden = true;
  });
  document.getElementById("classroomClose").addEventListener("click", closeClassroom);
  document.getElementById("classroomNext").addEventListener("click", classroomNext);
  document.getElementById("classroomPrev").addEventListener("click", classroomPrev);
  document.addEventListener("keydown", function (e) {
    if (!modal.hidden && e.key === "Escape") { closeModal(); return; }
    if (state.classroom.open) {
      if (e.key === "Escape") closeClassroom();
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); classroomNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); classroomPrev(); }
    }
  });

  // 文件上传
  async function analyzeUploadedFile(file) {
    var strip = document.getElementById("previewStrip");
    if (strip) {
      strip.hidden = false;
      strip.innerHTML = "<img alt='上传的图片预览' src='" + URL.createObjectURL(file) + "'>";
    }
    state.analysisKey = "contour";
    if (!state.apiOnline || !window.GeoAPI) { startAnalysis("contour", true); return; }
    var host = document.getElementById("analysisResult");
    var steps = ["上传图片", "识别图型与图例", "整理知识点与教学建议"];
    host.innerHTML = "<div class='panel-head'><div class='panel-title'>分析中</div><span class='panel-sub'>VISION</span></div>" +
      "<div class='steps'>" + progressRows(steps) + "</div>";
    var rows = $$(".step-row", host);
    steps.forEach(function (_, i) {
      after(420 * (i + 1), function () {
        rows.forEach(function (r, ri) {
          r.classList.toggle("running", ri === i);
          r.classList.toggle("done", ri < i);
        });
      });
    });
    try {
      var sample = await GeoAPI.analyzeImage(file, "contour");
      host.innerHTML = analysisResult(sample, true);
      bindAnalysisActions();
    } catch (err) {
      startAnalysis("contour", true);
    }
  }
  document.addEventListener("change", function (e) {
    if (e.target.id === "fileInput") {
      var file = e.target.files && e.target.files[0];
      if (file) analyzeUploadedFile(file);
    }
  });
  document.addEventListener("dragover", function (e) {
    var dz = e.target.closest("#dropzone");
    if (dz) { e.preventDefault(); dz.classList.add("dragover"); }
  });
  document.addEventListener("dragleave", function (e) {
    var dz = e.target.closest("#dropzone");
    if (dz) dz.classList.remove("dragover");
  });
  document.addEventListener("drop", function (e) {
    var dz = e.target.closest("#dropzone");
    if (!dz) return;
    e.preventDefault();
    dz.classList.remove("dragover");
    var file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    analyzeUploadedFile(file);
  });

  async function bootstrap() {
    initStarfield();
    initCursorGlow();
    if (window.GeoAPI) {
      try {
        var results = await Promise.all([GeoAPI.listModels(), GeoAPI.getCourseware(), GeoAPI.health()]);
        if (Array.isArray(results[0]) && results[0].length) state.models = results[0];
        var cw = results[1];
        if (cw && Array.isArray(cw.scenes)) {
          state.courseware = cw;
          state.activeSceneId = cw.scenes.length ? cw.scenes[0].id : null;
        }
        state.providers = (results[2] && results[2].providers) || null;
        state.apiOnline = true;
        var st = document.getElementById("statusText");
        if (st) st.textContent = "已连接后端 · " + providerSummary(state.providers);
      } catch (err) {
        state.apiOnline = false;
      }
    }
    var modeStatus = document.getElementById("statusText");
    if (modeStatus) {
      if (location.protocol === "file:") {
        modeStatus.textContent = "课件库 · 单文件离线可用";
      } else if (!webglAvailable()) {
        modeStatus.textContent = "浏览器未启用 WebGL · 三维模型无法交互";
      }
    }
    render();
  }

  // 初始化
  initUserMenu();
  var session = readSession();
  if (session) applySession(session.u, false);
  else initAuth();
  bootstrap();
})();