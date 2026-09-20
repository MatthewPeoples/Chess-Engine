import type { ReactNode } from "react";

interface Props {
    title: string;
    aside?: ReactNode;
    children: ReactNode;
}

export function Panel({ title, aside, children }: Props) {
    return (
        <section className="panel">
            <div className="panel-head">
                <h2 className="label" style={{ margin: 0 }}>
                    {title}
                </h2>
                {aside}
            </div>
            {children}
        </section>
    );
}
