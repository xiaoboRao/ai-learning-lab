import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sourceRepo = path.resolve(process.argv[2] || path.join(repoRoot, "..", "rag_api"));
const tutorialDir = path.join(sourceRepo, "Tutorial");
const sourceRepoGitUrl = "https://github.com/xiaoboRao/rag_api/blob/main/";
const distDir = path.join(repoRoot, "dist");
const generatedDir = path.join(distDir, "generated");
const generatedImagesDir = path.join(generatedDir, "tutorial-images");

const siteFiles = [
  "index.html",
  "project-rag-api.html",
  "lesson.html",
  "lesson-reader.html",
  "styles.css",
  "course-data.js",
  "project.js",
  "lesson.js",
  "lesson-reader.js",
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFileToDist(file) {
  await fs.copyFile(path.join(repoRoot, file), path.join(distDir, file));
}

async function copyDir(source, target) {
  await ensureDir(target);
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeLinkPath(rawPath) {
  const trimmed = rawPath.trim();

  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/Users/")) {
    const normalized = trimmed.replace(sourceRepo, "").replace(/^\/+/, "");
    return `${sourceRepoGitUrl}${normalized}`;
  }

  if (trimmed.startsWith("../rag_api/")) {
    return `${sourceRepoGitUrl}${trimmed.replace(/^..\/rag_api\//, "")}`;
  }

  if (trimmed.startsWith("/rag_api/")) {
    return `${sourceRepoGitUrl}${trimmed.replace(/^\/rag_api\//, "")}`;
  }

  if (trimmed.startsWith("rag_api/")) {
    return `${sourceRepoGitUrl}${trimmed.replace(/^rag_api\//, "")}`;
  }

  if (trimmed.startsWith("Tutorial/")) {
    return `${sourceRepoGitUrl}${trimmed}`;
  }

  if (/^[A-Za-z0-9_.-]+\.(md|py|js|css|yml|yaml|json|txt)$/i.test(trimmed)) {
    return `${sourceRepoGitUrl}${trimmed}`;
  }

  return trimmed;
}

function renderInline(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
      const normalized = normalizeLinkPath(href);
      return `<a href="${normalized}">${text}</a>`;
    });
}

function normalizeImagePath(rawPath) {
  const imageName = path.basename(rawPath.trim());
  return `./generated/tutorial-images/${imageName}`;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraphBuffer = [];
  let listBuffer = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    blocks.push(`<p>${renderInline(paragraphBuffer.join(" "))}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listBuffer.length || !listType) return;
    const items = listBuffer.map((item) => `<li>${renderInline(item)}</li>`).join("");
    blocks.push(`<${listType}>${items}</${listType}>`);
    listBuffer = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      flushParagraph();
      flushList();
      const [, alt, rawPath] = imageMatch;
      const imagePath = normalizeImagePath(rawPath);
      blocks.push(
        `<figure class="lesson-figure"><img src="${imagePath}" alt="${escapeHtml(
          alt
        )}" /><figcaption>${escapeHtml(alt || path.basename(rawPath))}</figcaption></figure>`
      );
      continue;
    }

    const unorderedMatch = trimmed.match(/^- (.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listBuffer.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\. (.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listBuffer.push(orderedMatch[1]);
      continue;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks.join("\n");
}

function markdownToSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let currentTitle = "";
  let currentLines = [];

  const pushSection = () => {
    if (!currentTitle) return;
    sections.push({
      title: currentTitle,
      contentHtml: markdownToHtml(currentLines.join("\n")),
    });
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      continue;
    }

    if (line.startsWith("## ")) {
      pushSection();
      currentTitle = line.slice(3).trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  pushSection();

  if (!sections.length) {
    return [
      {
        title: extractTitle(markdown, "课程正文"),
        contentHtml: markdownToHtml(
          lines
            .filter((line) => !line.startsWith("# "))
            .join("\n")
        ),
      },
    ];
  }

  return sections;
}

function extractTitle(markdown, fallbackName) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallbackName;
}

function extractDescription(markdown) {
  const body = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("![") && !/^\d+\./.test(line) && !line.startsWith("- "));

  return body[0] || "课程内容已生成。";
}

async function buildGeneratedLessons() {
  const entries = await fs.readdir(tutorialDir, { withFileTypes: true });
  const lessonFiles = entries
    .filter((entry) => entry.isFile() && /^lesson-\d+\.md$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lessons = [];

  for (const entry of lessonFiles) {
    const id = Number(entry.name.match(/^lesson-(\d+)\.md$/)?.[1] || "0");
    const fullPath = path.join(tutorialDir, entry.name);
    const markdown = await fs.readFile(fullPath, "utf8");

    lessons.push({
      id,
      title: extractTitle(markdown, entry.name),
      description: extractDescription(markdown),
      contentHtml: markdownToHtml(markdown),
      sections: markdownToSections(markdown),
      sourcePath: `Tutorial/${entry.name}`,
    });
  }

  return lessons;
}

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });
  await ensureDir(distDir);
  await ensureDir(generatedDir);
  await ensureDir(generatedImagesDir);

  for (const file of siteFiles) {
    await copyFileToDist(file);
  }

  await fs.writeFile(path.join(distDir, ".nojekyll"), "");

  const tutorialImagesSource = path.join(tutorialDir, "images");
  try {
    await copyDir(tutorialImagesSource, generatedImagesDir);
  } catch {
    // Keep build working even if no images directory exists yet.
  }

  const lessons = await buildGeneratedLessons();
  await fs.writeFile(
    path.join(generatedDir, "lessons.json"),
    JSON.stringify({ lessons }, null, 2),
    "utf8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
