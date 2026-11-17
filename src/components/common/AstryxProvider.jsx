import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { themes, defaultThemeSlug } from "../../astryx-themes";

function RouterLinkAdapter({ href, to, ...props }) {
  return <RouterLink to={to ?? href ?? "/"} {...props} />;
}

/**
 * Provides the Astryx theme and React Router link integration while keeping
 * Astryx's light/dark mode synchronized with the app's `html.dark` class.
 */
export default function AstryxProvider({ children }) {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Theme theme={themes[defaultThemeSlug]} mode={isDark ? "dark" : "light"}>
      <LinkProvider component={RouterLinkAdapter}>{children}</LinkProvider>
    </Theme>
  );
}

