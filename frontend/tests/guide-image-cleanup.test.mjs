import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// Render the real card JSX locally, without starting Next or fetching assets.
function component(path, name) {
  const { outputText } = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: path,
  });
  const exports = {};
  const stubs = {
    "next/link": ({ children, ...props }) => createElement("a", props, children),
    "next/image": ({ fill, ...props }) => createElement("img", { ...props, "data-fill": fill ? "true" : undefined }),
    "@/components/save-button": { SaveButton: ({ itemId }) => createElement("button", { "data-save": itemId }, "Save") },
    "@/components/ui/badge": { Badge: ({ children }) => createElement("span", null, children) },
    "@/lib/data": { getTopicBySlug: () => null },
  };
  runInNewContext(outputText, {
    exports,
    require: (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id),
  });
  return exports[name];
}

const GuideCard = component("components/guide-card.tsx", "GuideCard");
const AreaCard = component("components/cards.tsx", "AreaCard");
const card = { title: "Parks near Dublin", description: "Check current hours.", href: "/areas/dublin", eyebrow: "Outdoors" };
const area = { name: "Dublin", slug: "dublin", description: "Local housing and services." };

test("imageless guide card preserves content and link without a photo-shaped placeholder", () => {
  const html = renderToStaticMarkup(createElement(GuideCard, { card }));
  for (const value of [card.title, card.description, card.eyebrow, `href="${card.href}"`, "Explore options"]) assert.ok(html.includes(value));
  assert.doesNotMatch(html, /<img|aspect-|bg-gradient|Representative image/);
});

test("external guide links keep their safe target and current-results label", () => {
  const html = renderToStaticMarkup(createElement(GuideCard, { card: { ...card, external: true, href: "https://example.org/parks" } }));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Explore current results/);
  assert.doesNotMatch(html, /<img|aspect-/);
});

test("area card preserves hub navigation and save action without inventing an area photo", () => {
  const html = renderToStaticMarkup(createElement(AreaCard, { area }));
  assert.match(html, /href="\/areas\/dublin"/);
  assert.ok(html.includes(area.description));
  assert.match(html, /data-save="dublin"/);
  assert.doesNotMatch(html, /<img|aspect-|bg-gradient|Representative image/);
});

test("optional future card images require both an explicit asset and description", () => {
  for (const [Component, props, imageKey] of [[GuideCard, { card }, "image"], [AreaCard, { area }, "imageUrl"]]) {
    const imageProps = { [imageKey]: "/verified-dublin.webp", imageAlt: "Documented Dublin park" };
    const withImage = Component === GuideCard ? { card: { ...card, ...imageProps } } : { ...props, ...imageProps };
    const html = renderToStaticMarkup(createElement(Component, withImage));
    assert.equal((html.match(/<img\b/g) ?? []).length, 1);
    assert.match(html, /alt="Documented Dublin park"/);
    const withoutAlt = Component === GuideCard ? { card: { ...card, image: imageProps.image } } : { ...props, imageUrl: imageProps.imageUrl };
    assert.doesNotMatch(renderToStaticMarkup(createElement(Component, withoutAlt)), /<img|aspect-/);
  }
});

test("area pages no longer borrow article images or rotate guide imagery into their identity", () => {
  const index = source("app/areas/page.tsx");
  assert.doesNotMatch(index, /getArticles|imageUrl=|GUIDE_IMAGES|representativeAreaImage/);
  const detail = source("app/areas/[slug]/page.tsx");
  assert.doesNotMatch(detail, /reportedHeroImage|representativeImage|RepresentativeImageNote|aspect-\[21\/9\]/);
  assert.match(detail, /<CoverImage src=\{article\.image_url\}/, "actual article thumbnails are preserved");
});

test("dedicated guide pages retain exactly one distinct hero each, not repeated card photos", () => {
  const expected = { "things-to-do": "parks", "housing-search": "housing", directory: "services" };
  for (const [page, key] of Object.entries(expected)) {
    const text = source(`app/${page}/page.tsx`);
    assert.deepEqual(text.match(/GUIDE_IMAGES\.\w+/g), [`GUIDE_IMAGES.${key}`]);
    assert.equal((text.match(/<Image\b/g) ?? []).length, 1);
  }
});
