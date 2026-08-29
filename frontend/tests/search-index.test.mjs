import assert from "node:assert/strict";
import test from "node:test";
import { housingSearchSourcesForArea } from "../lib/area-guides.ts";
import {
  RESOURCE_SEARCH_SUGGESTIONS,
  areaSearchText,
  searchTextMatches,
} from "../lib/search-index.ts";

test("area search aliases cover ZIP and neighborhood-intent queries", () => {
  const hilltop = {
    slug: "hilltop",
    name: "Hilltop",
    kind: "neighborhood",
    description: "City of Columbus neighborhood hub.",
    populationSignal: "Urban-core housing interest",
  };

  assert.equal(searchTextMatches(areaSearchText(hilltop), "43204"), true);
  assert.equal(searchTextMatches(areaSearchText(hilltop), "west columbus"), true);
});

test("resource suggestions cover non-article user intents", () => {
  const resources = RESOURCE_SEARCH_SUGGESTIONS.filter((resource) => searchTextMatches(resource.searchText, "restaurants"));
  assert.ok(resources.some((resource) => resource.href === "/directory"));
  assert.ok(resources.some((resource) => resource.href === "/things-to-do"));
});

test("housing search links can be scoped to a selected area", () => {
  const defaultSources = housingSearchSourcesForArea("buy", "Columbus and Central Ohio");
  const dublinSources = housingSearchSourcesForArea("buy", "Dublin");

  assert.equal(defaultSources[0].href, "https://www.realtor.com/realestateandhomes-search/Columbus_OH");
  assert.match(dublinSources[0].href, /dublin-oh/);
  assert.match(dublinSources.find((source) => source.title === "Zillow")?.href ?? "", /Dublin%2C%20OH/);
});
