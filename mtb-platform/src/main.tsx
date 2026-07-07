import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Worklist from "./pages/Worklist";
import ReportPage from "./pages/Report";
import "./pajamas.css";

// HashRouter: static hosting (GitLab Pages / Netlify) with no server rewrite.
const router = createHashRouter([
  { path: "/", element: <Worklist /> },
  { path: "/report/:chartNo", element: <ReportPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
