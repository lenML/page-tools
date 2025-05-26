import fs from "fs";
import path from "path";

/**
 * @param {string} filePath
 * @returns {string|null}
 */
function extractTitleFromHtml(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  const match =
    content.match(/<title>(.*?)<\/title>/i) ||
    content.match(/^\s*?#\s?(.+?)\s*?\n/i);
  return match ? match[1].trim() : null;
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
  const indexHtml = path.join(dirPath, "index.html");
  const readmeHtml = path.join(dirPath, "readme.md");
  const title =
    extractTitleFromHtml(readmeHtml) || extractTitleFromHtml(indexHtml) || dir;
  console.log(title);

  const siteLink = `${SITE_BASE_URL}/${dir}`;
  const codeLink = `${CODE_BASE_URL}/${dir}`;
  return `| [${title}](${siteLink}) | ${dir} | [source](${codeLink}) |`;
});

const pagesTable = [
  "| page | project | source |",
  "| --- | --- | --- |",
  ...tableRows,
].join("\n");

const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const output = renderTemplate(template, { pages_table: pagesTable });

fs.writeFileSync(OUTPUT_PATH, output);

console.log(`README.md generated at ${OUTPUT_PATH}`);
