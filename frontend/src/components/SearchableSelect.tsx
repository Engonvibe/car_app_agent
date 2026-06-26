import { useEffect, useRef, useState } from "react";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
}

/**
 * A lightweight searchable dropdown (combobox).
 * The user can type to filter the options and click one to select it.
 * Used for the Vehicle Brand Name field.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search...",
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  // What the input shows: the live query while searching, otherwise the value.
  const displayed = open ? query : value;

  return (
    <div className="combo" ref={wrapRef}>
      <input
        id={id}
        type="text"
        className="field-input"
        value={displayed}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <ul className="combo-list">
          {filtered.length === 0 ? (
            <li className="combo-empty">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt}
                className={opt === value ? "combo-item active" : "combo-item"}
                onMouseDown={() => {
                  onChange(opt);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
