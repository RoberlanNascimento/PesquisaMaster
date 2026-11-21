import React, { useEffect, useMemo, useRef, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;

export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly sublabel?: string;
}

export interface SearchableComboboxProps {
  readonly options: readonly ComboboxOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly emptyOptionLabel?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly style?: React.CSSProperties;
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = "Digite para pesquisar...",
  emptyOptionLabel,
  required = false,
  disabled = false,
  style,
}: SearchableComboboxProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(selectedOption?.label ?? "");
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label ?? "");
    }
  }, [selectedOption, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedOption?.label ?? "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return options.slice(0, 120);

    const startsWith: ComboboxOption[] = [];
    const contains: ComboboxOption[] = [];

    for (const opt of options) {
      const normLabel = normalizeText(opt.label);
      const normSub = opt.sublabel ? normalizeText(opt.sublabel) : "";
      if (normLabel.startsWith(q)) {
        startsWith.push(opt);
      } else if (normLabel.includes(q) || normSub.includes(q)) {
        contains.push(opt);
      }
      if (startsWith.length + contains.length >= 120) break;
    }

    return [...startsWith, ...contains];
  }, [options, query]);

  // Sugestão inline (autocompletar com a próxima letra enquanto digita)
  const inlineSuggestion = useMemo(() => {
    if (!isOpen || !query.trim()) return "";
    const top = filteredOptions[highlightIndex] ?? filteredOptions[0];
    if (!top) return "";
    const normQ = normalizeText(query);
    const normLabel = normalizeText(top.label);
    if (normLabel.startsWith(normQ) && top.label.length > query.length) {
      return query + top.label.slice(query.length);
    }
    return "";
  }, [isOpen, query, filteredOptions, highlightIndex]);

  const selectOption = (opt: ComboboxOption | null): void => {
    if (opt) {
      onChange(opt.value);
      setQuery(opt.label);
    } else {
      onChange("");
      setQuery("");
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setHighlightIndex((prev) =>
        filteredOptions.length > 0 ? Math.min(prev + 1, filteredOptions.length - 1) : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Tab" && isOpen && inlineSuggestion) {
      const top = filteredOptions[highlightIndex] ?? filteredOptions[0];
      if (top) {
        e.preventDefault();
        selectOption(top);
      }
    } else if (e.key === "Enter" && isOpen) {
      const top = filteredOptions[highlightIndex] ?? filteredOptions[0];
      if (top) {
        e.preventDefault();
        selectOption(top);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery(selectedOption?.label ?? "");
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", width: "100%" }}>
        {/* Ghost inline autocomplete */}
        {inlineSuggestion && (
          <input
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            readOnly
            value={inlineSuggestion}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 32px 9px 11px",
              borderRadius: "10px",
              border: "1px solid transparent",
              backgroundColor: "transparent",
              color: colors.textMuted,
              fontSize: "13px",
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.55,
              ...style,
            }}
          />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          required={required && !value}
          placeholder={emptyOptionLabel && !value ? emptyOptionLabel : placeholder}
          onFocus={() => {
            setIsOpen(true);
            setHighlightIndex(0);
            inputRef.current?.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIndex(0);
            if (!e.target.value.trim() && emptyOptionLabel) {
              onChange("");
            }
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "9px 32px 9px 11px",
            borderRadius: "10px",
            border: `1px solid ${isOpen ? colors.borderFocus : colors.borderSubtle}`,
            backgroundColor: colors.surfaceContainer,
            color: colors.textPrimary,
            fontSize: "13px",
            outline: "none",
            position: "relative",
            ...style,
            background: inlineSuggestion ? "transparent" : (style?.backgroundColor ?? colors.surfaceContainer),
          }}
        />

        <span
          aria-hidden="true"
          onClick={() => {
            if (disabled) return;
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "11px",
            color: colors.textMuted,
            cursor: disabled ? "not-allowed" : "pointer",
            userSelect: "none",
          }}
        >
          ▾
        </span>
      </div>

      {isOpen && !disabled && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: "230px",
            overflowY: "auto",
            backgroundColor: "#202124",
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.65)",
            zIndex: 10050,
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {emptyOptionLabel && !query.trim() && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(null);
              }}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: value === "" ? colors.surfaceElevated : "transparent",
                color: colors.textMuted,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              {emptyOptionLabel}
            </button>
          )}

          {filteredOptions.map((opt, idx) => {
            const isHighlighted = idx === highlightIndex;
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isSelected
                    ? colors.primaryContainer
                    : isHighlighted
                      ? colors.surfaceElevated
                      : "transparent",
                  color: isSelected ? colors.onPrimary : colors.textPrimary,
                  fontSize: "12.5px",
                  fontWeight: isSelected ? 600 : 400,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{opt.label}</span>
                {opt.sublabel && (
                  <span style={{ fontSize: "11px", opacity: 0.75 }}>{opt.sublabel}</span>
                )}
              </button>
            );
          })}

          {filteredOptions.length === 0 && (
            <div style={{ padding: "10px", fontSize: "12px", color: colors.textMuted, textAlign: "center" }}>
              Nenhum registro encontrado no banco.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
