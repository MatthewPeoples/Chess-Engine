interface Props {
    onClick?: () => void;
    className?: string;
}

function MarkContents() {
    return (
        <>
            <svg className="brand-crown" viewBox="0 0 56 56" aria-hidden>
                <path
                    className="brand-crown-body"
                    d="M7 18 17 29V11l8 16 3-22 4 22 7-16v18l10-11-5 25H12z"
                />
                <path className="brand-crown-inset" d="m14 34 8-4 6 5 6-5 8 4-2 6H16z" />
                <path className="brand-crown-ring" d="M11 42h34l-2 8c-8 3-22 3-30 0z" />
                <path className="brand-crown-highlight" d="M15 45h26M28 10v16" />
            </svg>
            <span className="logo-name">C++ CHESS ENGINE</span>
        </>
    );
}

export function BrandMark({ onClick, className = "" }: Props) {
    const classes = `logo ${className}`.trim();

    if (onClick) {
        return (
            <button type="button" className={classes} onClick={onClick} aria-label="Home">
                <MarkContents />
            </button>
        );
    }

    return (
        <div className={classes}>
            <MarkContents />
        </div>
    );
}
