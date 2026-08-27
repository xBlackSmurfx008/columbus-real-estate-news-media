import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { franklinSeedsToAreas } from "../lib/franklin-areas.ts";

const baseUrl = process.env.RELEASE_AUDIT_BASE_URL || "http://127.0.0.1:3000";
const outputDir =
  process.env.RELEASE_AUDIT_OUTPUT_DIR ||
  join("/private/tmp", `cren-release-audit-${Date.now()}`);
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
  headless: true,
});

const failures = [];
const browserErrors = [];
let checkedPages = 0;

function recordFailure(path, message) {
  failures.push({ path, message });
}

async function preparePage(page, path) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push({ path, type: "console", message: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push({ path, type: "pageerror", message: error.message });
  });
  page.on("requestfailed", (request) => {
    // Next.js link prefetches are intentionally cancelled when an audit page closes.
    if (request.failure()?.errorText === "net::ERR_ABORTED") return;
    const url = new URL(request.url());
    if (url.origin === new URL(baseUrl).origin) {
      browserErrors.push({
        path,
        type: "requestfailed",
        message: `${request.method()} ${url.pathname}: ${request.failure()?.errorText || "unknown error"}`,
      });
    }
  });
}

async function loadPage(page, path) {
  await preparePage(page, path);
  const response = await page.goto(`${baseUrl}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  checkedPages += 1;
  if (!response || response.status() !== 200) {
    recordFailure(path, `expected HTTP 200, received ${response?.status() ?? "no response"}`);
  }
  await page.evaluate(() => document.fonts.ready);
}

async function revealLazyContent(page) {
  await page.evaluate(async () => {
    for (const image of document.images) {
      image.loading = "eager";
    }
    for (const image of document.images) {
      image.scrollIntoView({ block: "center" });
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
  await page
    .waitForFunction(
      () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
      undefined,
      { timeout: 15_000 }
    )
    .catch(() => {});
  await page.waitForTimeout(250);
}

async function inspectRenderedPage(page, path, expectedHeading, requireLoadedImages = true) {
  const result = await page.evaluate((heading) => {
    const h1 = document.querySelector("h1")?.textContent?.trim() || "";
    const brokenImages = [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    const incompleteImages = [...document.images]
      .filter((image) => !image.complete)
      .map((image) => image.currentSrc || image.src);
    return {
      h1,
      headingFound: h1.includes(heading),
      imageCount: document.images.length,
      brokenImages,
      incompleteImages,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  }, expectedHeading);

  if (!result.headingFound) {
    recordFailure(path, `missing expected H1 text: ${expectedHeading}; found: ${result.h1}`);
  }
  if (result.horizontalOverflow) {
    recordFailure(path, "page has horizontal overflow");
  }
  if (result.brokenImages.length > 0) {
    recordFailure(path, `broken images: ${result.brokenImages.join(", ")}`);
  }
  if (requireLoadedImages && result.incompleteImages.length > 0) {
    recordFailure(path, `images did not finish loading: ${result.incompleteImages.join(", ")}`);
  }
  return result;
}

const smokeRoutes = [
  ["/", "Columbus"],
  ["/areas", "Neighborhood hubs"],
  ["/things-to-do", "Fun things to do"],
  ["/housing-search?area=Dublin", "Search, rent, buy, sell or list in Dublin"],
  ["/directory?area=Clintonville", "Find services and local hot spots serving Clintonville"],
  ["/directory/list-your-business?area=Dublin", "List a business serving Dublin"],
];

for (const [path, heading] of smokeRoutes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await loadPage(page, path);
  await revealLazyContent(page);
  await inspectRenderedPage(page, path, heading);
  await page.close();
}

const areaResults = [];
const areas = franklinSeedsToAreas();
const areaContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
for (let index = 0; index < areas.length; index += 6) {
  const batch = areas.slice(index, index + 6);
  await Promise.all(batch.map(async (area) => {
    const path = `/areas/${area.slug}`;
    const page = await areaContext.newPage();
    await loadPage(page, path);
    const result = await inspectRenderedPage(page, path, area.name, false);
    const sectionState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        discovery: text.includes("Daytime fun, kids, parks, food and entertainment"),
        housing: text.includes("Search, rent, buy, sell or list in"),
        services: text.includes("Services and businesses serving"),
      };
    });
    if (!sectionState.discovery || !sectionState.housing || !sectionState.services) {
      recordFailure(path, `incomplete hub sections: ${JSON.stringify(sectionState)}`);
    }
    if (result.imageCount < 12) {
      recordFailure(path, `expected at least 12 hub images, found ${result.imageCount}`);
    }
    areaResults.push({ slug: area.slug, imageCount: result.imageCount, ...sectionState });
    await page.close();
  }));
}
await areaContext.close();

const visualRoutes = [
  ["home", "/"],
  ["things-to-do", "/things-to-do"],
  ["german-village", "/areas/german-village"],
  ["dublin", "/areas/dublin"],
  ["galloway", "/areas/galloway"],
  ["easton-area", "/areas/easton-area"],
  ["housing-dublin", "/housing-search?area=Dublin"],
  ["directory-clintonville", "/directory?area=Clintonville"],
  ["list-business-dublin", "/directory/list-your-business?area=Dublin"],
];

for (const [name, path] of visualRoutes) {
  for (const viewport of [
    { label: "desktop", width: 1440, height: 1000 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await loadPage(page, path);
    await revealLazyContent(page);
    await inspectRenderedPage(page, path, "");
    await page.screenshot({
      path: join(outputDir, `${name}-${viewport.label}.png`),
      fullPage: true,
    });
    await page.close();
  }
}

const apiContext = await browser.newContext();
const api = apiContext.request;
const initGet = await api.get(`${baseUrl}/api/admin/init`);
if (initGet.status() !== 405) {
  recordFailure("/api/admin/init", `GET must be disabled with 405; received ${initGet.status()}`);
}
const initPost = await api.post(`${baseUrl}/api/admin/init`);
if (initPost.status() !== 503) {
  recordFailure("/api/admin/init", `unauthenticated POST must fail closed with 503; received ${initPost.status()}`);
}
for (const path of [
  "/api/admin/ads",
  "/api/admin/articles",
  "/api/admin/interviews",
  "/api/admin/leads",
  "/api/admin/market",
  "/api/admin/neighborhoods",
  "/api/admin/settings",
  "/api/admin/testimonials",
  "/api/admin/ticker",
]) {
  const response = await api.get(`${baseUrl}${path}`);
  if (response.status() !== 401) {
    recordFailure(path, `unauthenticated admin read must return 401; received ${response.status()}`);
  }
}
const agentResponse = await api.get(`${baseUrl}/api/agent/dashboard`);
if (![401, 503].includes(agentResponse.status())) {
  recordFailure(
    "/api/agent/dashboard",
    `unauthenticated internal agent route must fail closed; received ${agentResponse.status()}`
  );
}
await apiContext.close();
await browser.close();

if (browserErrors.length > 0) {
  failures.push(...browserErrors.map(({ path, type, message }) => ({ path, message: `${type}: ${message}` })));
}

const report = {
  baseUrl,
  outputDir,
  checkedPages,
  areaHubCount: areaResults.length,
  screenshots: visualRoutes.length * 2,
  failures,
};

await writeFile(join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}
