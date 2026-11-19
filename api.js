/* 前端 API 客户端：同源 /api；请求失败时由 app.js 回退到离线演示模式 */
window.GeoAPI = (function () {
  async function request(path, options) {
    if (location.protocol === "file:") throw new Error("离线文件模式：未连接后端");
    const resp = await fetch(path, options);
    if (!resp.ok) {
      let detail = resp.status;
      try {
        const data = await resp.json();
        detail = data.detail || detail;
      } catch (err) { /* 非 JSON 响应 */ }
      throw new Error("HTTP " + detail);
    }
    return resp.json();
  }

  return {
    health: function () {
      return request("/api/health");
    },
    listModels: function (params) {
      const qs = new URLSearchParams(params || {}).toString();
      return request("/api/models" + (qs ? "?" + qs : ""));
    },
    getModel: function (id) {
      return request("/api/models/" + encodeURIComponent(id));
    },
    saveModel: function (model) {
      return request("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(model)
      });
    },
    getCourseware: function () {
      return request("/api/courseware");
    },
    saveCourseware: function (courseware) {
      return request("/api/courseware", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseware)
      });
    },
    createKnowledgeJob: function (payload) {
      return request("/api/jobs/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },
    createQuestionJob: function (text) {
      return request("/api/jobs/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
      });
    },
    createQuestionJobImage: function (file, text) {
      const form = new FormData();
      form.append("file", file);
      if (text) form.append("text", text);
      return request("/api/jobs/question-image", { method: "POST", body: form });
    },
    getJob: function (id) {
      return request("/api/jobs/" + encodeURIComponent(id));
    },
    analyzeImage: function (file, sampleKey) {
      const form = new FormData();
      if (file) form.append("file", file);
      form.append("sample_key", sampleKey || "contour");
      return request("/api/analyze-image", { method: "POST", body: form });
    }
  };
})();
