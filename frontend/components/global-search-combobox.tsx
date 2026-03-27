"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics-client";

type SearchSuggestion = {
  id: string;
  label: string;
  href: string;
  type: "area" | "topic" | "article";
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
  submitHref = "/areas",
  submitLabel = "Search",
}: GlobalSearchComboboxProps) {
  const listboxId = `${id}-listbox`;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 6);
    return suggestions.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 6);
  }, [query, suggestions]);

  const activeDescendant = activeIndex >= 0 && filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].id}` : undefined;

  function commitSearch(searchTerm: string) {
    trackEvent("search", { search_term: searchTerm, content_type: "mixed" });
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
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={submitHref}
        className="focus-ring btn-primary inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
        onClick={() => commitSearch(query)}
      >
        {submitLabel}
      </Link>
    </div>
  );
}
