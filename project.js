const { units, lessons: staticLessons } = window.courseData;
const unitsGrid = document.querySelector("#units-grid");
const lessonList = document.querySelector("#lesson-list");

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
    const article = document.createElement("a");
    article.className = "catalog-item";
    article.href = `./lesson-reader.html?id=${lesson.id}`;
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
      <span class="catalog-action">进入正文</span>
    `;
    lessonList.appendChild(article);
  });
}

loadGeneratedLessons().then((generatedLessons) => {
  const lessons = mergeLessons(staticLessons, generatedLessons);
  renderUnits(lessons);
  renderLessons(lessons);
});
