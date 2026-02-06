"use client";

import { useState } from "react";

import { normalizeTag } from "@/lib/taxonomy/tags";

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

type TagPickerProps = {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
};

export function TagPicker({ value, suggestions, onChange }: TagPickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const selected = uniqueTags(value);
  const availableSuggestions = suggestions.filter(
    (tag) => !selected.includes(normalizeTag(tag)),
  );

  function addTag(tag: string) {
    const normalized = normalizeTag(tag);
    if (!normalized) {
      return;
    }
    onChange(uniqueTags([...selected, normalized]));
  }

  function removeTag(tag: string) {
    onChange(selected.filter((item) => item !== tag));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-sm text-[var(--gg-text-muted)]">No tags yet.</span>
        ) : (
          selected.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full border border-[rgba(46,242,196,0.4)] bg-[rgba(46,242,196,0.12)] px-3 py-1 text-xs font-semibold text-[var(--gg-signal)]"
            >
              {tag} x
            </button>
          ))
        )}
      </div>

      {availableSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableSuggestions.slice(0, 10).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-1 text-xs font-semibold text-[var(--gg-text)]"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      {customOpen ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            className="flex-1 rounded-lg border border-[var(--gg-border)] bg-[var(--gg-surface-2)] px-3 py-2 text-sm text-[var(--gg-text)]"
            placeholder="Add custom tag"
          />
          <button
            type="button"
            onClick={() => {
              addTag(customValue);
              setCustomValue("");
              setCustomOpen(false);
            }}
            className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-4 py-2 text-xs font-semibold text-black"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="text-xs font-semibold text-[var(--gg-text-muted)]"
        >
          Add custom tag
        </button>
      )}
    </div>
  );
}
