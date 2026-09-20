import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    icon?: boolean;
    children: ReactNode;
}

export function Button({ variant = "primary", icon = false, children, ...rest }: Props) {
    const classes = ["btn", variant === "primary" ? "" : variant, icon ? "icon" : ""].filter(Boolean).join(" ");
    return (
        <button type="button" className={classes} {...rest}>
            {children}
        </button>
    );
}
