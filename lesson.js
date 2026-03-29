const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id") || "1");
const staticLessons = window.courseData.lessons;

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

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
};

function renderFallbackArticle(container, lesson) {
  lesson.article.forEach((block) => {
    if (block.type === "paragraph") {
      const p = document.createElement("p");
      p.textContent = block.text;
      container.appendChild(p);
    }

    if (block.type === "list") {
      const ul = document.createElement("ul");
      ul.className = "bullet-list";
      block.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    }

    if (block.type === "image") {
      const figure = document.createElement("figure");
      figure.className = "lesson-figure";
      figure.innerHTML = `
        <img src="${block.src}" alt="${block.alt}" />
        <figcaption>${block.caption}</figcaption>
      `;
      container.appendChild(figure);
    }
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

function setupSectionObserver() {
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const targetId = `#${entry.target.id}`;
        navLinks.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === targetId);
        });
      });
    },
    { rootMargin: "-25% 0px -60% 0px", threshold: 0.05 }
  );

  sections.forEach((section) => observer.observe(section));
}

loadGeneratedLessons().then((generatedLessons) => {
  const generatedMap = new Map(generatedLessons.map((item) => [item.id, item]));
  const lessonsData = staticLessons.map((item) => {
    const generated = generatedMap.get(item.id);
    return generated
      ? {
          ...item,
          title: generated.title || item.title,
          description: generated.description || item.description,
          generatedContentHtml: generated.contentHtml,
          generatedSourcePath: generated.sourcePath,
        }
      : item;
  });

  generatedLessons.forEach((item) => {
    if (lessonsData.some((lesson) => lesson.id === item.id)) return;
    lessonsData.push({
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

  lessonsData.sort((a, b) => a.id - b.id);

  const lesson = lessonsData.find((item) => item.id === lessonId) || lessonsData[0];
  document.title = `${lesson.title} | AI Learning Lab`;

  setText("#lesson-side-title", lesson.title);
  setText("#lesson-side-summary", lesson.description);
  setText("#lesson-title", lesson.title);
  setText("#lesson-description", lesson.description);
  setText("#lesson-number", String(lesson.id).padStart(2, "0"));
  setText("#lesson-unit", lesson.unit);
  setText("#lesson-kicker", `${lesson.unit} · 第 ${lesson.id} 课`);

  const goalsList = document.querySelector("#lesson-goals-list");
  lesson.goals.forEach((goal) => {
    const li = document.createElement("li");
    li.textContent = goal;
    goalsList.appendChild(li);
  });

  const pointsList = document.querySelector("#lesson-points-list");
  lesson.points.forEach((point) => {
    const li = document.createElement("li");
    li.textContent = point;
    pointsList.appendChild(li);
  });

  const readingList = document.querySelector("#lesson-reading-list");
  const readingPaths = lesson.generatedSourcePath
    ? [...lesson.readings, `../rag_api/${lesson.generatedSourcePath}`]
    : lesson.readings;

  [...new Set(readingPaths)].forEach((path) => {
    const article = document.createElement("article");
    article.className = "source-card";
    article.innerHTML = `
      <div>
        <h4>${path.split("/").pop()}</h4>
        <p>${path}</p>
      </div>
      <a class="text-link" href="${path}">打开</a>
    `;
    readingList.appendChild(article);
  });

  const articleContainer = document.querySelector("#lesson-article");
  if (lesson.generatedContentHtml) {
    articleContainer.innerHTML = lesson.generatedContentHtml;
  } else {
    renderFallbackArticle(articleContainer, lesson);
  }

  const actionList = document.querySelector("#lesson-action-list");
  lesson.actions.forEach((action, index) => {
    const article = document.createElement("article");
    article.className = "practice-card";
    article.innerHTML = `
      <h4>练习 ${index + 1}</h4>
      <p>${action}</p>
    `;
    actionList.appendChild(article);
  });

  setupNavigation(lesson, lessonsData);
  setupSectionObserver();
});
