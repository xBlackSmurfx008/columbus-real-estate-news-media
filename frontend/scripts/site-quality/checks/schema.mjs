// Schema markup.
//
// Blocking half: structured data that is present must be VALID. A malformed
// ld+json block, or a NewsArticle missing a field Google requires, is worse
// than no markup — it is a rich-result rejection we cannot see from inside.
//
// Advisory half: markup that is absent where it would earn something. Adding
// it is a product change, so the check reports the gap and leaves the decision
// to a human rather than pretending the page is finished.

import { jsonLdBlocks, jsonLdNodes, textContent } from "../html.mjs";
import { htmlPages } from "../pages.mjs";
import { fail, pass, skip } from "../result.mjs";

const NEWS_ARTICLE_REQUIRED = ["headline", "datePublished", "author", "publisher", "mainEntityOfPage"];

export function typeOf(node) {
  const value = node?.["@type"];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string");
  return [];
}

export function findNode(nodes, type) {
  return nodes.find((node) => typeOf(node).includes(type)) ?? null;
}

/** Field-level validation of one NewsArticle node. Returns problem strings. */
export function validateNewsArticle(node, { title } = {}) {
  const problems = [];
  for (const field of NEWS_ARTICLE_REQUIRED) {
    const value = node[field];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      problems.push(`NewsArticle is missing required field "${field}"`);
    }
  }
  if (typeof node.headline === "string" && node.headline.length > 110) {
    problems.push(`NewsArticle headline is ${node.headline.length} chars; Google truncates above 110`);
  }
  if (typeof node.headline === "string" && title && !title.includes(node.headline.slice(0, 40))) {
    problems.push(`NewsArticle headline does not match the page <title> — the markup describes a different page`);
  }
  for (const field of ["datePublished", "dateModified"]) {
    const value = node[field];
    if (value !== undefined && Number.isNaN(new Date(value).getTime())) {
      problems.push(`NewsArticle ${field} "${value}" is not a parseable date`);
    }
  }
  if (node.image !== undefined) {
    const images = Array.isArray(node.image) ? node.image : [node.image];
    for (const image of images) {
      const src = typeof image === "string" ? image : image?.url;
      if (typeof src !== "string" || !/^https?:\/\//i.test(src)) {
        problems.push(`NewsArticle image "${String(src)}" is not an absolute URL`);
      }
    }
  }
  return problems;
}

export function validateBreadcrumb(node) {
  const problems = [];
  const items = node.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    problems.push("BreadcrumbList has no itemListElement");
    return problems;
  }
  items.forEach((item, index) => {
    if (typeof item?.name !== "string" || !item.name.trim()) problems.push(`BreadcrumbList item ${index + 1} has no name`);
    if (item?.position !== index + 1) problems.push(`BreadcrumbList item ${index + 1} has position ${String(item?.position)}`);
    if (index < items.length - 1 && typeof item?.item !== "string") {
      problems.push(`BreadcrumbList item ${index + 1} has no item URL`);
    }
  });
  return problems;
}

export const schemaMarkup = {
  id: "schema",
  title: "Schema markup",
  blocking: true,
  async run(context) {
    const usable = htmlPages(context.pages);
    if (usable.size === 0) return skip("schema", "Schema markup", true, "no page on the target returned renderable HTML");

    const articlePaths = [...usable.keys()].filter((path) => path.startsWith("/blog/") && path !== "/blog/");
    const findings = [];
    const advisory = [];

    // 1. Nothing anywhere may be malformed.
    for (const [path, response] of usable) {
      for (const block of jsonLdBlocks(response.text)) {
        if (!block.ok) findings.push(`${path} — an application/ld+json block does not parse: ${block.error}`);
      }
    }

    // 2. Article pages carry a valid NewsArticle and BreadcrumbList.
    if (articlePaths.length === 0) {
      advisory.push("no article page was in the sample, so NewsArticle markup was not validated");
    }
    for (const path of articlePaths) {
      const html = usable.get(path).text;
      const nodes = jsonLdNodes(html);
      const article = findNode(nodes, "NewsArticle") ?? findNode(nodes, "Article");
      if (!article) {
        findings.push(`${path} — no NewsArticle structured data`);
      } else {
        for (const problem of validateNewsArticle(article, { title: textContent(html).slice(0, 400) })) {
          findings.push(`${path} — ${problem}`);
        }
      }
      const breadcrumb = findNode(nodes, "BreadcrumbList");
      if (!breadcrumb) advisory.push(`${path} — no BreadcrumbList structured data`);
      else for (const problem of validateBreadcrumb(breadcrumb)) findings.push(`${path} — ${problem}`);
    }

    // 3. Advisory coverage gaps on the pages that carry the brand.
    const home = usable.get("/");
    if (home && jsonLdNodes(home.text).length === 0) {
      advisory.push("/ — homepage has no structured data at all (no Organization or WebSite node), so search engines have no machine-readable publisher identity for the site");
    }

    const stats = { pagesInspected: usable.size, articlePagesValidated: articlePaths.length };
    if (findings.length > 0) {
      return fail("schema", "Schema markup", true, `${findings.length} structured-data defect(s)`, [...findings, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("schema", "Schema markup", false, `${advisory.length} structured-data coverage gap(s)`, advisory, stats);
    }
    return pass("schema", "Schema markup", true, `structured data valid on ${usable.size} page(s), ${articlePaths.length} article page(s) fully validated`, stats);
  },
};
