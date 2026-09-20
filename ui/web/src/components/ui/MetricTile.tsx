interface Props {
    label: string;
    value: string;
    tone?: "good" | "bad";
}

export function MetricTile({ label, value, tone }: Props) {
    return (
        <div className="tile">
            <div className="label">{label}</div>
            <div className={`tile-value ${tone ?? ""}`}>{value}</div>
        </div>
    );
}
