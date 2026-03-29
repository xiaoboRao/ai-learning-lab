const { units, lessons, sources } = window.courseData;

const unitsGrid = document.querySelector("#units-grid");
const lessonList = document.querySelector("#lesson-list");
const sourceList = document.querySelector("#source-list");

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
      ${unit.lessons.map((lessonId) => {
        const lesson = lessons.find((item) => item.id === lessonId);
        return `<span class="pill">第 ${lesson.id} 课</span>`;
      }).join("")}
    </div>
  `;
  unitsGrid.appendChild(article);
});

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
