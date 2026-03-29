const { units, lessons: staticLessons, sources } = window.courseData;
const unitsGrid = document.querySelector("#units-grid");
const lessonList = document.querySelector("#lesson-list");
const sourceList = document.querySelector("#source-list");
const RAG_API_REPO = "https://github.com/xiaoboRao/rag_api";

async function loadGeneratedLessons() {
  try {
    const response = await fetch("./generated/lessons.json", { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.lessons) ? data.lessons : [];
  } catch {
    return [];
  }
}

function toPublicSourceHref(path) {
  if (!path) return "./project-rag-api.html";
  if (/^https?:\/\//.test(path)) return path;
  if (!path.startsWith("../rag_api/")) return path;
  const relativePath = path.replace("../rag_api/", "");
  const target = /\.[a-z0-9]+$/i.test(relativePath) ? "blob" : "tree";
  return `${RAG_API_REPO}/${target}/main/${relativePath}`;
}

function mergeLessons(staticItems, generatedItems) {
  const generatedMap = new Map(generatedItems.map((item) => [item.id, item]));
  const merged = staticItems.map((item) => {
    const override = generatedMap.get(item.id);
    return override
      ? {
          ...item,
          title: override.title || item.title,
          description: override.description || item.description,
        }
      : item;
  });

  generatedItems.forEach((item) => {
    if (merged.some((lesson) => lesson.id === item.id)) return;
    merged.push({
      id: item.id,
      unit: "新增课程",
      title: item.title,
      description: item.description,
      goals: [],
      points: [],
      readings: item.sourcePath ? [`../rag_api/${item.sourcePath}`] : [],
      article: [],
      actions: [],
    });
  });

  return merged.sort((a, b) => a.id - b.id);
}

function renderUnits(lessons) {
  unitsGrid.innerHTML = "";

  units.forEach((unit) => {
    const article = document.createElement("article");
    article.className = "portal-card unit-card";
    article.innerHTML = `
      <div class="unit-top">
        <span class="unit-index">${String(unit.id).padStart(2, "0")}</span>
        <div>
          <p class="section-kicker">Unit ${unit.id}</p>
          <h3>${unit.title}</h3>
        </div>
      </div>
      <p>${unit.summary}</p>
      <div class="tag-row">
        ${unit.lessons
          .map((lessonId) => {
            const lesson = lessons.find((item) => item.id === lessonId);
            return lesson ? `<span class="tag">第 ${lesson.id} 课</span>` : "";
          })
          .join("")}
      </div>
    `;
    unitsGrid.appendChild(article);
  });
}

function renderLessons(lessons) {
  lessonList.innerHTML = "";

  lessons.forEach((lesson) => {
    const article = document.createElement("article");
    article.className = "catalog-item";
    article.innerHTML = `
      <div class="catalog-main">
        <span class="catalog-index">${String(lesson.id).padStart(2, "0")}</span>
        <div class="catalog-copy">
          <h3 class="catalog-title">${lesson.title}</h3>
          <p>${lesson.description}</p>
          <div class="catalog-meta">
            <span class="badge badge-soft">${lesson.unit}</span>
          </div>
        </div>
      </div>
      <a class="catalog-action" href="./lesson.html?id=${lesson.id}">进入学习</a>
    `;
    lessonList.appendChild(article);
  });
}

function renderSources() {
  sourceList.innerHTML = "";

  sources.forEach((source) => {
    const article = document.createElement("article");
    article.className = "source-card";
    article.innerHTML = `
      <div class="source-card-header">
        <div>
          <p class="section-kicker">Source</p>
          <h3>${source.title}</h3>
        </div>
        <span class="badge badge-soft">源码</span>
      </div>
      <p>${source.description}</p>
      <a class="text-link" href="${toPublicSourceHref(source.href)}" target="_blank" rel="noreferrer">打开源码</a>
    `;
    sourceList.appendChild(article);
  });
}

loadGeneratedLessons().then((generatedLessons) => {
  const lessons = mergeLessons(staticLessons, generatedLessons);
  renderUnits(lessons);
  renderLessons(lessons);
  renderSources();
});
