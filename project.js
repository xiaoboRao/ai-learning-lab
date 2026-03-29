const { units, lessons: staticLessons, sources } = window.courseData;

const unitsGrid = document.querySelector("#units-grid");
const lessonList = document.querySelector("#lesson-list");
const sourceList = document.querySelector("#source-list");

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
    article.className = "unit-card";
    article.innerHTML = `
      <div class="unit-top">
        <span class="unit-index">0${unit.id}</span>
        <div>
          <p class="eyebrow">Unit ${unit.id}</p>
          <h4>${unit.title}</h4>
        </div>
      </div>
      <p>${unit.summary}</p>
      <div class="pill-row">
        ${unit.lessons
          .map((lessonId) => {
            const lesson = lessons.find((item) => item.id === lessonId);
            if (!lesson) return "";
            return `<span class="pill">第 ${lesson.id} 课</span>`;
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
    article.className = "lesson-row";
    article.innerHTML = `
      <div class="lesson-row-main">
        <span class="lesson-index">${String(lesson.id).padStart(2, "0")}</span>
        <div>
          <p class="eyebrow">${lesson.unit}</p>
          <h4>${lesson.title}</h4>
          <p>${lesson.description}</p>
        </div>
      </div>
      <a class="button secondary compact" href="./lesson.html?id=${lesson.id}">进入学习</a>
    `;
    lessonList.appendChild(article);
  });
}

loadGeneratedLessons().then((generatedLessons) => {
  const lessons = mergeLessons(staticLessons, generatedLessons);
  renderUnits(lessons);
  renderLessons(lessons);
});

sources.forEach((source) => {
  const article = document.createElement("article");
  article.className = "source-card";
  article.innerHTML = `
    <div>
      <h4>${source.title}</h4>
      <p>${source.description}</p>
    </div>
    <a class="text-link" href="${source.href}">打开</a>
  `;
  sourceList.appendChild(article);
});

const navLinks = [...document.querySelectorAll(".nav-link")];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);

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
