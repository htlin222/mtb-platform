import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Worklist from "./pages/Worklist";
import ReportPage from "./pages/Report";
import Upload from "./pages/Upload";
import Process from "./pages/Process";
import Research from "./pages/Research";
import Board from "./pages/Board";
import "./pajamas.css";

// HashRouter: static hosting (GitLab Pages / Netlify) with no server rewrite.
const router = createHashRouter([
  { path: "/", element: <Worklist /> },
  { path: "/upload", element: <Upload /> },
  { path: "/process/:chartNo", element: <Process /> },
  { path: "/report/:chartNo", element: <ReportPage /> },
  { path: "/research", element: <Research /> },
  { path: "/board/:chartNo", element: <Board /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
