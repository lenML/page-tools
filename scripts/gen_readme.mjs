import fs from "fs";
import path from "path";

/**
 * 从 Markdown 内容中提取 Front Matter 的指定字段
 * @param {string} content Markdown 原文
 * @returns {{ title?: string, desc?: string, restContent: string }}
 */
function extractFrontMatter(content) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontMatterRegex);
  if (!match) {
    return { restContent: content };
  }

  const yamlBlock = match[1];
  const restContent = content.slice(match[0].length);

  // 简单提取 title 和 desc（支持带引号的值）
  const getValue = (key) => {
    const regex = new RegExp(`^${key}:\\s*(.*)$`, "im");
    const matched = yamlBlock.match(regex);
    if (!matched) return undefined;
    let value = matched[1].trim();
    // 去掉首尾引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  };

  return {
    title: getValue("title"),
    desc: getValue("desc"),
    restContent,
  };
}

/**
 * 从 Markdown 中提取第一个一级标题（即 # Title）
 * @param {string} content
 * @returns {string|null}
 */
function extractFirstHeading(content) {
  const match = content.match(/^\s*?#\s?(.+?)\s*?\n/m);
  return match ? match[1].trim() : null;
}

/**
 * 从 HTML 文件中提取 <title> 标签内容
 * @param {string} filePath
 * @returns {string|null}
 */
function extractTitleFromHtml(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/<title>(.*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * 获取指定目录的页面元数据（标题和描述）
 * @param {string} dirPath 子目录路径
 * @returns {{ title: string, desc: string }}
 */
function getPageMetadata(dirPath) {
  const readmePath = path.join(dirPath, "readme.md");
  const indexPath = path.join(dirPath, "index.html");
  const dirName = path.basename(dirPath);

  // 优先处理 readme.md
  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, "utf-8");
    const { title: fmTitle, desc, restContent } = extractFrontMatter(content);
    if (fmTitle) {
      return { title: fmTitle, desc: desc || "" };
    }
    // 无 Front Matter title 时，尝试提取第一个一级标题
    const heading = extractFirstHeading(restContent);
    if (heading) {
      return { title: heading, desc: desc || "" };
    }
    // 如果都提取不到，回退到目录名
    return { title: dirName, desc: desc || "" };
  }

  // 没有 readme.md 则尝试 index.html 的标题
  if (fs.existsSync(indexPath)) {
    const htmlTitle = extractTitleFromHtml(indexPath);
    if (htmlTitle) {
      return { title: htmlTitle, desc: "" };
    }
  }

  // 最终回退：使用目录名
  return { title: dirName, desc: "" };
}

/**
 * 简易模板渲染：替换 {{key}} 占位符
 * @param {string} template
 * @param {Object<string, string>} variables
 * @returns {string}
 */
function renderTemplate(template, variables) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => variables[key] || "");
}

const ROOT = path.join(process.cwd(), "pages");
const TEMPLATE_PATH = path.join(process.cwd(), "scripts/readme.template.md");
const OUTPUT_PATH = path.join(process.cwd(), "README.md");
const SITE_BASE_URL = "https://lenml.github.io/page-tools";
const CODE_BASE_URL = "https://github.com/lenml/page-tools/tree/main/pages";

const subdirs = fs
  .readdirSync(ROOT)
  .filter((name) => fs.statSync(path.join(ROOT, name)).isDirectory());

const tableRows = subdirs.map((dir) => {
  const dirPath = path.join(ROOT, dir);
  const { title, desc } = getPageMetadata(dirPath);
  const siteLink = `${SITE_BASE_URL}/${dir}`;
  const codeLink = `${CODE_BASE_URL}/${dir}`;
  const displayDesc = desc || "—";
  console.log(`Title: ${title} | Desc: ${displayDesc}`);
  return `| [${title}](${siteLink}) | ${dir} | ${displayDesc} | [source](${codeLink}) |`;
});

const pagesTable = [
  "| Page | Project | Description | Source |",
  "| --- | --- | --- | --- |",
  ...tableRows,
].join("\n");

const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const output = renderTemplate(template, { pages_table: pagesTable });

fs.writeFileSync(OUTPUT_PATH, output);
console.log(`README.md generated at ${OUTPUT_PATH}`);
