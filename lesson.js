const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id") || "1");
const staticLessons = window.courseData.lessons;
const catalogList = document.querySelector("#lesson-catalog-list");

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

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
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
          generatedContentHtml: override.contentHtml,
          generatedSourcePath: override.sourcePath,
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
      generatedContentHtml: item.contentHtml,
      generatedSourcePath: item.sourcePath,
    });
  });

  return merged.sort((a, b) => a.id - b.id);
}

function renderList(selector, items) {
  const container = document.querySelector(selector);
  container.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function renderCatalog(lessonsData, currentLessonId) {
  catalogList.innerHTML = "";
  setText("#catalog-title", `课程目录（共 ${lessonsData.length} 讲）`);

  lessonsData.forEach((item) => {
    const article = document.createElement("a");
    article.className = `catalog-item${item.id === currentLessonId ? " is-current" : ""}`;
    article.href = `./lesson-reader.html?id=${item.id}`;
    article.innerHTML = `
      <div class="catalog-main">
        <span class="catalog-index">${String(item.id).padStart(2, "0")}</span>
        <div class="catalog-copy">
          <h3 class="catalog-title">${item.title}</h3>
          <p>${item.description}</p>
          <div class="catalog-meta">
            <span class="badge badge-soft">${item.unit}</span>
            ${item.id === currentLessonId ? '<span class="badge badge-accent">当前课程</span>' : ""}
          </div>
        </div>
      </div>
      <span class="catalog-action">${item.id === currentLessonId ? "进入正文" : "打开正文"}</span>
    `;
    catalogList.appendChild(article);
  });
}

function setupPoster(lesson) {
  const poster = document.querySelector("#lesson-poster-art");
  if (!poster) return;

  let posterImage = "";

  if (lesson.generatedContentHtml) {
    const documentFragment = new DOMParser().parseFromString(lesson.generatedContentHtml, "text/html");
    posterImage = documentFragment.querySelector("img")?.getAttribute("src") || "";
  }

  if (!posterImage) {
    posterImage = lesson.article.find((block) => block.type === "image")?.src || "";
  }

  if (!posterImage) return;

  poster.style.background = `
    linear-gradient(180deg, rgba(8, 11, 18, 0.18), rgba(8, 11, 18, 0.72)),
    url("${posterImage}") center/cover no-repeat
  `;
}

loadGeneratedLessons().then((generatedLessons) => {
  const lessonsData = mergeLessons(staticLessons, generatedLessons);
  const lesson = lessonsData.find((item) => item.id === lessonId) || lessonsData[0];
  const startReadingLink = document.querySelector("#start-reading");

  setText("#lesson-kicker", `${lesson.unit} · 第 ${String(lesson.id).padStart(2, "0")} 课`);
  setText("#lesson-title", lesson.title);
  setText("#lesson-description", lesson.description);
  setText("#lesson-unit", lesson.unit);
  setText("#lesson-number", `第 ${String(lesson.id).padStart(2, "0")} 课`);

  renderList("#lesson-goals-list", lesson.goals);
  renderList("#lesson-points-list", lesson.points);
  renderCatalog(lessonsData, lesson.id);
  setupPoster(lesson);

  startReadingLink.href = `./lesson-reader.html?id=${lesson.id}`;
});
