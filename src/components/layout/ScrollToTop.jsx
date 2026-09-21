/**
 * ScrollToTop.jsx
 * ===============
 * Automatically scrolls window to top when navigating to a new route.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
