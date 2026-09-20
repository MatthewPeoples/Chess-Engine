import { useEffect, useRef, useState } from "react";

export interface Option {
    id: string;
    label: string;
}

interface Props {
    value: string;
    options: Option[];
    onChange: (id: string) => void;
    disabled?: boolean;
}

// Custom styling requires a non-native select. Preserve native-like keyboard navigation and focus return.
export function Dropdown({ value, options, onChange, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);

    const selected = options.find((option) => option.id === value);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onDocument = (event: MouseEvent) => {
            if (!root.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocument);
        return () => document.removeEventListener("mousedown", onDocument);
    }, [open]);

    const choose = (id: string) => {
        onChange(id);
        setOpen(false);
        trigger.current?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            setOpen(false);
            trigger.current?.focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((current) => (current + step + options.length) % options.length);
        } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const option = options[active];
            if (option) {
                choose(option.id);
            }
        }
    };

    return (
        <div className="dropdown" ref={root} onKeyDown={onKeyDown}>
            <button
                type="button"
                ref={trigger}
                className={`dropdown-trigger ${open ? "open" : ""}`}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => {
                    setOpen((current) => !current);
                    setActive(Math.max(0, options.findIndex((option) => option.id === value)));
                }}
            >
                {selected?.label ?? "—"}
                <span className="dropdown-caret">{open ? "▴" : "▾"}</span>
            </button>

            {open && (
                <div className="dropdown-menu" role="listbox">
                    {options.map((option, index) => (
                        <button
                            key={option.id}
                            type="button"
                            role="option"
                            aria-selected={option.id === value}
                            className={`dropdown-item ${option.id === value ? "selected" : ""} ${
                                index === active ? "active" : ""
                            }`}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => choose(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
