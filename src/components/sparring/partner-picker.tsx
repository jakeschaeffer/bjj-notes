"use client";

import { useState, useRef, useEffect } from "react";

import type { Partner, BeltLevel } from "@/lib/types";
import { getBeltOption } from "./types";

type PartnerPickerProps = {
  value: string;
  onChange: (name: string, belt: BeltLevel | null) => void;
  partners: Partner[];
  partnerSuggestions: string[];
};

export function PartnerPicker({
  value,
  onChange,
  partners,
  partnerSuggestions,
}: PartnerPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();

  // First check partners database for matches with belt info
  const partnerMatches = query
    ? partners.filter(
        (p) =>
          p.name.toLowerCase().includes(query) &&
          p.name.toLowerCase() !== query
      )
    : [];

  // Fall back to name-only suggestions if no partner matches
  const nameOnlyMatches = query && partnerMatches.length === 0
    ? partnerSuggestions
        .filter(
          (name) =>
            name.toLowerCase().includes(query) &&
            name.toLowerCase() !== query &&
            !partners.some((p) => p.name.toLowerCase() === name.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const hasMatches = partnerMatches.length > 0 || nameOnlyMatches.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value, null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Name or initials"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1"
      />
      {isOpen && hasMatches ? (
        <div className="absolute z-10 mt-2 w-full rounded-lg border border-zinc-200 bg-white shadow-sm">
          {partnerMatches.slice(0, 5).map((partner) => {
            const belt = getBeltOption(partner.belt);
            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => {
                  onChange(partner.name, partner.belt);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                {belt ? (
                  <span
                    className={`h-2.5 w-2.5 rounded-full border ${belt.dotClass}`}
                  />
                ) : null}
                <span className="flex-1">{partner.name}</span>
                <span className="text-xs text-zinc-400">
                  {partner.roundCount} {partner.roundCount === 1 ? "round" : "rounds"}
                </span>
              </button>
            );
          })}
          {nameOnlyMatches.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name, null);
                setIsOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
