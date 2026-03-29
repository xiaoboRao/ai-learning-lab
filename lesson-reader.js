const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id") || "1");
const staticLessons = window.courseData.lessons;
const projectTitle = window.courseData.project.title;

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

function renderArticle(lesson) {
  const articleContainer = document.querySelector("#reader-article");
  articleContainer.innerHTML = "";

  if (lesson.generatedContentHtml) {
    articleContainer.innerHTML = lesson.generatedContentHtml;
    return;
  }

  renderFallbackArticle(articleContainer, lesson);
}

function setupNavigation(lesson, lessonsData) {
  const prevLesson = lessonsData.find((item) => item.id === lesson.id - 1);
  const nextLesson = lessonsData.find((item) => item.id === lesson.id + 1);
  const prevLink = document.querySelector("#reader-prev-lesson");
  const nextLink = document.querySelector("#reader-next-lesson");

  if (prevLesson) {
    prevLink.href = `./lesson-reader.html?id=${prevLesson.id}`;
    prevLink.textContent = `上一课 · ${prevLesson.title}`;
  } else {
    prevLink.href = "./project-rag-api.html";
    prevLink.textContent = "返回课程列表";
  }

  if (nextLesson) {
    nextLink.href = `./lesson-reader.html?id=${nextLesson.id}`;
    nextLink.textContent = `下一课 · ${nextLesson.title}`;
  } else {
    nextLink.href = "./project-rag-api.html";
    nextLink.textContent = "返回课程列表";
  }
}

loadGeneratedLessons().then((generatedLessons) => {
  const lessonsData = mergeLessons(staticLessons, generatedLessons);
  const lesson = lessonsData.find((item) => item.id === lessonId) || lessonsData[0];

  document.title = `${lesson.title} | ${projectTitle} | AI Learning Lab`;

  setText("#reader-kicker", `${lesson.unit} · 第 ${String(lesson.id).padStart(2, "0")} 课`);
  setText("#reader-title", lesson.title);
  setText("#reader-description", lesson.description);
  setText("#reader-unit", lesson.unit);
  setText("#reader-number", `第 ${String(lesson.id).padStart(2, "0")} 课`);

  renderList("#reader-goals-list", lesson.goals);
  renderList("#reader-points-list", lesson.points);
  renderArticle(lesson);
  setupNavigation(lesson, lessonsData);

  const overviewLink = document.querySelector("#reader-overview-link");
  const backToOverview = document.querySelector("#back-to-overview");
  overviewLink.href = `./lesson.html?id=${lesson.id}`;
  backToOverview.href = `./lesson.html?id=${lesson.id}`;
});
