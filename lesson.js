const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id") || "1");
const staticLessons = window.courseData.lessons;
const projectTitle = window.courseData.project.title;
const catalogList = document.querySelector("#lesson-catalog-list");
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

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function renderFallbackArticle(container, lesson) {
  lesson.article.forEach((block) => {
    if (block.type === "paragraph") {
      const p = document.createElement("p");
      p.textContent = block.text;
      container.appendChild(p);
    }

    if (block.type === "list") {
      const ul = document.createElement("ul");
      block.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    }

    if (block.type === "image") {
      const figure = document.createElement("figure");
      figure.innerHTML = `
        <img src="${block.src}" alt="${block.alt}" />
        <figcaption>${block.caption}</figcaption>
      `;
      container.appendChild(figure);
    }
  });
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

function renderSources(lesson) {
  const readingList = document.querySelector("#lesson-reading-list");
  readingList.innerHTML = "";

  const readingPaths = lesson.generatedSourcePath
    ? [...lesson.readings, `../rag_api/${lesson.generatedSourcePath}`]
    : [...lesson.readings];

  [...new Set(readingPaths)].forEach((path) => {
    const article = document.createElement("article");
    article.className = "source-card";
    article.innerHTML = `
      <div class="source-card-header">
        <div>
          <p class="section-kicker">Source</p>
          <h3>${path.split("/").pop()}</h3>
        </div>
        <span class="badge badge-soft">源码</span>
      </div>
      <p>${path}</p>
      <a class="text-link" href="${toPublicSourceHref(path)}" target="_blank" rel="noreferrer">打开源码</a>
    `;
    readingList.appendChild(article);
  });

  const sourceLink = document.querySelector("#view-source-link");
  const firstSource = readingPaths[0];
  if (firstSource) {
    sourceLink.href = toPublicSourceHref(firstSource);
    sourceLink.target = "_blank";
    sourceLink.rel = "noreferrer";
    sourceLink.textContent = "打开本课源码";
  }
}

function renderCatalog(lessonsData, currentLessonId) {
  catalogList.innerHTML = "";
  setText("#catalog-title", `课程目录（共 ${lessonsData.length} 讲）`);

  lessonsData.forEach((item) => {
    const article = document.createElement("article");
    article.className = `catalog-item${item.id === currentLessonId ? " is-current" : ""}`;
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
      <a class="catalog-action" href="./lesson.html?id=${item.id}">${item.id === currentLessonId ? "继续阅读" : "切换课程"}</a>
    `;
    catalogList.appendChild(article);
  });
}

function renderArticle(lesson) {
  const articleContainer = document.querySelector("#lesson-article");
  articleContainer.innerHTML = "";

  if (lesson.generatedContentHtml) {
    articleContainer.innerHTML = lesson.generatedContentHtml;
    return;
  }

  renderFallbackArticle(articleContainer, lesson);
}

function renderActions(lesson) {
  const actionList = document.querySelector("#lesson-action-list");
  actionList.innerHTML = "";

  lesson.actions.forEach((action, index) => {
    const article = document.createElement("article");
    article.className = "practice-card";
    article.innerHTML = `
      <p class="section-kicker">Practice ${index + 1}</p>
      <h3>练习 ${index + 1}</h3>
      <p>${action}</p>
    `;
    actionList.appendChild(article);
  });
}

function setupNavigation(lesson, lessonsData) {
  const prevLesson = lessonsData.find((item) => item.id === lesson.id - 1);
  const nextLesson = lessonsData.find((item) => item.id === lesson.id + 1);

  const prevLink = document.querySelector("#prev-lesson");
  const nextLink = document.querySelector("#next-lesson");

  if (prevLesson) {
    prevLink.href = `./lesson.html?id=${prevLesson.id}`;
    prevLink.textContent = `上一课 · ${prevLesson.title}`;
  } else {
    prevLink.href = "./project-rag-api.html";
    prevLink.textContent = "返回课程列表";
  }

  if (nextLesson) {
    nextLink.href = `./lesson.html?id=${nextLesson.id}`;
    nextLink.textContent = `下一课 · ${nextLesson.title}`;
  } else {
    nextLink.href = "./project-rag-api.html";
    nextLink.textContent = "返回课程列表";
  }
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

  document.title = `${lesson.title} | ${projectTitle} | AI Learning Lab`;

  setText("#lesson-kicker", `${lesson.unit} · 第 ${String(lesson.id).padStart(2, "0")} 课`);
  setText("#lesson-title", lesson.title);
  setText("#lesson-description", lesson.description);
  setText("#lesson-unit", lesson.unit);
  setText("#lesson-number", `第 ${String(lesson.id).padStart(2, "0")} 课`);

  renderList("#lesson-goals-list", lesson.goals);
  renderList("#lesson-points-list", lesson.points);
  renderCatalog(lessonsData, lesson.id);
  renderSources(lesson);
  renderArticle(lesson);
  renderActions(lesson);
  setupNavigation(lesson, lessonsData);
  setupPoster(lesson);
});
