const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id") || "1");
const lessonsData = window.courseData.lessons;
const lesson = lessonsData.find((item) => item.id === lessonId) || lessonsData[0];

document.title = `${lesson.title} | AI Learning Lab`;

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
};

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
lesson.readings.forEach((path) => {
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
lesson.article.forEach((block) => {
  if (block.type === "paragraph") {
    const p = document.createElement("p");
    p.textContent = block.text;
    articleContainer.appendChild(p);
  }

  if (block.type === "list") {
    const ul = document.createElement("ul");
    ul.className = "bullet-list";
    block.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    });
    articleContainer.appendChild(ul);
  }

  if (block.type === "image") {
    const figure = document.createElement("figure");
    figure.className = "lesson-figure";
    figure.innerHTML = `
      <img src="${block.src}" alt="${block.alt}" />
      <figcaption>${block.caption}</figcaption>
    `;
    articleContainer.appendChild(figure);
  }
});

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
