interface Props<T extends string | number> {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    tight?: boolean;
}

export function Segmented<T extends string | number>({ value, options, onChange, tight }: Props<T>) {
    return (
        <div className="segmented">
            {options.map((option) => (
                <button
                    key={String(option.value)}
                    type="button"
                    className={`segment ${tight ? "tight" : ""} ${option.value === value ? "on" : ""}`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
