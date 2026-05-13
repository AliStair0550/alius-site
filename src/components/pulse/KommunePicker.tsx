"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Kommune = {
  code: string;
  name: string;
  slug: string;
};

type Props = {
  kommuner: Kommune[];
};

export function KommunePicker({ kommuner }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return kommuner.slice(0, 8);
    const lower = query.toLowerCase().trim();
    return kommuner
      .filter((k) => k.name.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [query, kommuner]);

  useEffect(() => {
    setFocusedIdx(0);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (kommune: Kommune) => {
    router.push(`/pulse/ledighed/${kommune.slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((idx) => Math.min(idx + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((idx) => Math.max(idx - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[focusedIdx]) {
        handleSelect(filtered[focusedIdx]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative max-w-[480px]">
      <label className="block">
        <span className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3 block">
          Find din kommune
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Skriv en kommune..."
          className="w-full px-0 py-3 bg-transparent border-0 border-b border-ink/25 text-[18px] font-light text-ink outline-none placeholder:text-stone/40 focus:border-ink transition-colors"
        />
      </label>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-parchment border border-ink/15 shadow-lg max-h-[320px] overflow-y-auto">
          {filtered.map((k, i) => (
            <button
              key={k.code}
              type="button"
              onClick={() => handleSelect(k)}
              onPointerEnter={() => setFocusedIdx(i)}
              className={`block w-full text-left px-4 py-3 text-[15px] transition-colors ${
                i === focusedIdx ? "bg-fog text-ink" : "text-stone hover:bg-fog/50"
              }`}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-parchment border border-ink/15 px-4 py-3 text-[14px] text-stone italic">
          Ingen kommuner matcher &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
