"use client";

import type { SearchResultKind } from "@/lib/search-index";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics-client";
import { normalizeSearchText, searchTextMatches } from "@/lib/search-index";

export type SearchSuggestion = {
  id: string;
  label: string;
  href: string;
  type: SearchResultKind;
  description?: string;
  searchText?: string;
};

type GlobalSearchComboboxProps = {
  id: string;
  placeholder: string;
  suggestions: SearchSuggestion[];
  submitHref?: string;
  submitLabel?: string;
};

export function GlobalSearchCombobox({
  id,
  placeholder,
  suggestions,
  submitHref = "/search",
  submitLabel = "Search",
}: GlobalSearchComboboxProps) {
  const router = useRouter();
  const listboxId = `${id}-listbox`;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return suggestions.slice(0, 6);
    return suggestions.filter((item) => searchTextMatches(item.searchText ?? item.label, q)).slice(0, 6);
  }, [query, suggestions]);

  const activeDescendant = activeIndex >= 0 && filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].id}` : undefined;

  function commitSearch(searchTerm: string) {
    trackEvent("search", { search_term: searchTerm, content_type: "mixed" });
  }

  function submitSearch() {
    const searchTerm = query.trim();
    commitSearch(searchTerm);
    router.push(searchTerm ? `${submitHref}?q=${encodeURIComponent(searchTerm)}` : submitHref);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setExpanded(true);
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= filtered.length ? 0 : next;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setExpanded(true);
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? Math.max(filtered.length - 1, 0) : next;
      });
      return;
    }

    if (event.key === "Escape") {
      setExpanded(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      if (expanded && activeIndex >= 0 && filtered[activeIndex]) {
        event.preventDefault();
        const selected = filtered[activeIndex];
        commitSearch(selected.label);
        window.location.href = selected.href;
        return;
      }
      commitSearch(query);
      if (query.trim()) {
        event.preventDefault();
        submitSearch();
      }
    }
  }

  return (
    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
      <div
        role="combobox"
        aria-haspopup="listbox"
        aria-owns={listboxId}
        aria-expanded={expanded}
        aria-controls={listboxId}
        className="relative"
      >
        <label htmlFor={id} className="sr-only">
          Search
        </label>
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={query}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          placeholder={placeholder}
          className="focus-ring cren-surface w-full border border-[color:var(--border)] px-4 py-3 text-sm text-[color:var(--text-body)] placeholder:text-[color:var(--text-muted)]"
          onFocus={() => setExpanded(true)}
          onBlur={() => {
            window.setTimeout(() => setExpanded(false), 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setExpanded(true);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
        />

        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          hidden={!expanded || filtered.length === 0}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-1 shadow-[var(--shadow-md)]"
        >
          {filtered.map((item, index) => (
            <li
              id={`${listboxId}-${item.id}`}
              key={item.id}
              role="option"
              aria-selected={index === activeIndex}
              className={`rounded-lg px-3 py-2 text-sm ${index === activeIndex ? "bg-accent text-foreground" : "text-foreground"}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                commitSearch(item.label);
                window.location.href = item.href;
              }}
            >
              <span className="font-medium">{item.label}</span>
              <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">{item.type}</span>
              {item.description && <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="focus-ring btn-primary inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
        onClick={submitSearch}
      >
        {submitLabel}
      </button>
    </div>
  );
}
