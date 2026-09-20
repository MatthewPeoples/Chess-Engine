import { useEffect, useRef, type ReactNode } from "react";

interface Props {
    title: string;
    wide?: boolean;
    onClose: () => void;
    children: ReactNode;
    footer: ReactNode;
}

// Move focus inside on open and trap keyboard focus until Escape or an action closes the modal.
export function Modal({ title, wide = false, onClose, children, footer }: Props) {
    const sheet = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const focusable = sheet.current?.querySelectorAll<HTMLElement>("button, input, [tabindex]");
        focusable?.[0]?.focus();

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
                return;
            }
            if (event.key !== "Tab" || !focusable || focusable.length === 0) {
                return;
            }

            const first = focusable[0]!;
            const last = focusable[focusable.length - 1]!;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className={`sheet ${wide ? "wide" : ""}`} ref={sheet} role="dialog" aria-modal="true" aria-label={title}>
                <div className="sheet-head">
                    <span className="sheet-title">{title}</span>
                    <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>
                {children}
                <div className="sheet-foot">{footer}</div>
            </div>
        </div>
    );
}
