import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "chess-ui-theme";

export function useTheme(): [Theme, () => void] {
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(KEY) as Theme) ?? "dark");

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(KEY, theme);
    }, [theme]);

    return [theme, () => setTheme((current) => (current === "dark" ? "light" : "dark"))];
}
