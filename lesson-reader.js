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

function buildLessonHtml(lesson) {
  if (lesson.generatedContentHtml) {
    return lesson.generatedContentHtml;
  }

  const container = document.createElement("div");
  renderFallbackArticle(container, lesson);
  return container.innerHTML;
}

function normalizeGeneratedSections(sections) {
  if (!Array.isArray(sections) || !sections.length) {
    return [];
  }

  return sections
    .filter((section) => section && section.title && section.contentHtml)
    .map((section, index) => ({
      id: `reader-section-${index + 1}`,
      title: section.title,
      html: section.contentHtml,
    }));
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
          generatedSections: override.sections || [],
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
      generatedSections: item.sections || [],
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

function getRenderableNodes(root) {
  return [...root.childNodes].filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim().length > 0;
    }
    return true;
  });
}

function cloneNodesToHtml(nodes) {
  const container = document.createElement("div");
  nodes.forEach((node) => {
    container.appendChild(node.cloneNode(true));
  });
  return container.innerHTML;
}

function extractSections(html) {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  const root = documentFragment.body;
  const splitTag = root.querySelector("h2") ? "H2" : root.querySelector("h3") ? "H3" : null;
  const nodes = getRenderableNodes(root);

  if (!splitTag || !nodes.length) {
    return [
      {
        id: "reader-section-1",
        title: "课程正文",
        html,
      },
    ];
  }

  const sections = [];
  let introNodes = [];
  let currentSection = null;

  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === splitTag) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        id: `reader-section-${sections.length + 1}`,
        title: node.textContent.trim(),
        nodes: [...introNodes],
      };
      introNodes = [];
      return;
    }

    if (currentSection) {
      currentSection.nodes.push(node.cloneNode(true));
    } else {
      introNodes.push(node.cloneNode(true));
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  if (!sections.length && introNodes.length) {
    return [
      {
        id: "reader-section-1",
        title: "课程正文",
        html: cloneNodesToHtml(introNodes),
      },
    ];
  }

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    html: cloneNodesToHtml(section.nodes),
  }));
}

function renderSectionArticle(section, sectionIndex, totalSections) {
  const articleContainer = document.querySelector("#reader-article");
  articleContainer.innerHTML = section.html;
  setText("#reader-section-title", section.title);
  setText("#reader-section-progress", `第 ${sectionIndex + 1} 节 / 共 ${totalSections} 节`);
}

function updateActiveSectionItem(activeSectionId) {
  const items = [...document.querySelectorAll(".reader-section-item")];
  items.forEach((item) => {
    const isActive = item.dataset.sectionId === activeSectionId;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function renderSectionList(sections, activeSectionId) {
  const sectionList = document.querySelector("#reader-section-list");
  sectionList.innerHTML = "";

  sections.forEach((section, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reader-section-item";
    button.dataset.sectionId = section.id;
    button.setAttribute("aria-current", section.id === activeSectionId ? "true" : "false");
    button.innerHTML = `
      <span class="reader-section-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="reader-section-name">${section.title}</span>
    `;
    button.addEventListener("click", () => {
      if (window.location.hash !== `#${section.id}`) {
        window.location.hash = section.id;
        return;
      }
      selectSection(section.id, sections, true);
    });
    sectionList.appendChild(button);
  });

  updateActiveSectionItem(activeSectionId);
}

function selectSection(sectionId, sections, shouldScroll = false) {
  const selectedSection = sections.find((item) => item.id === sectionId) || sections[0];
  const selectedIndex = sections.findIndex((item) => item.id === selectedSection.id);

  renderSectionArticle(selectedSection, selectedIndex, sections.length);
  updateActiveSectionItem(selectedSection.id);

  if (shouldScroll) {
    document.querySelector("#reader-content-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
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
  const sections = normalizeGeneratedSections(lesson.generatedSections).length
    ? normalizeGeneratedSections(lesson.generatedSections)
    : extractSections(buildLessonHtml(lesson));
  const initialSectionId = sections.some((item) => item.id === window.location.hash.slice(1))
    ? window.location.hash.slice(1)
    : sections[0].id;

  document.title = `${lesson.title} | ${projectTitle} | AI Learning Lab`;

  setText("#reader-kicker", `${lesson.unit} · 第 ${String(lesson.id).padStart(2, "0")} 课`);
  setText("#reader-title", lesson.title);
  setText("#reader-description", lesson.description);
  setText("#reader-unit", lesson.unit);
  setText("#reader-number", `第 ${String(lesson.id).padStart(2, "0")} 课`);

  renderList("#reader-goals-list", lesson.goals);
  renderList("#reader-points-list", lesson.points);
  renderSectionList(sections, initialSectionId);
  selectSection(initialSectionId, sections);
  setupNavigation(lesson, lessonsData);

  const overviewLink = document.querySelector("#reader-overview-link");
  const backToOverview = document.querySelector("#back-to-overview");
  overviewLink.href = `./lesson.html?id=${lesson.id}`;
  backToOverview.href = `./lesson.html?id=${lesson.id}`;

  window.addEventListener("hashchange", () => {
    selectSection(window.location.hash.slice(1), sections, true);
  });
});
