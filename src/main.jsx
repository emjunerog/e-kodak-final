/**
 * main.jsx
 * ========
 * APPLICATION ENTRY POINT
 *
 * This is where React mounts the application into the DOM (#root in index.html).
 * We wrap the entire app with <BrowserRouter> here so every component
 * can use React Router's hooks (useNavigate, useLocation, Link, etc.)
 * without needing to add the Router deeper in the tree.
 *
 * StrictMode: Enabled in development to help catch bugs early.
 * In production builds, StrictMode has no effect on performance.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
