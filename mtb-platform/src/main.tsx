import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Worklist from "./pages/Worklist";
import ReportPage from "./pages/Report";
import Upload from "./pages/Upload";
import Process from "./pages/Process";
import Research from "./pages/Research";
import Board from "./pages/Board";
import Cohort from "./pages/Cohort";
import Evidence from "./pages/Evidence";
import "./pajamas.css";

// Batch pulls in IGV.js (~1.3 MB) — load it only when visited.
const Batch = lazy(() => import("./pages/Batch"));
const withSuspense = (el: React.ReactNode) => (
  <Suspense fallback={<div className="gl-page"><div className="gl-spinner" /></div>}>{el}</Suspense>
);

// HashRouter: static hosting (GitLab Pages / Netlify) with no server rewrite.
const router = createHashRouter([
  { path: "/", element: <Worklist /> },
  { path: "/upload", element: <Upload /> },
  { path: "/process/:chartNo", element: <Process /> },
  { path: "/report/:chartNo", element: <ReportPage /> },
  { path: "/research", element: <Research /> },
  { path: "/board/:chartNo", element: <Board /> },
  { path: "/cohort", element: <Cohort /> },
  { path: "/evidence", element: <Evidence /> },
  { path: "/batch", element: withSuspense(<Batch />) },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
