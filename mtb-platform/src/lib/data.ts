// Data loading: reads the integrated JSON produced by scripts/build-data.mjs
// from real ngs-tertiary-analysis-skills output. The special "live" id is a
// report built in-browser from an uploaded VCF and stashed in sessionStorage.
import type { Report, WorklistEntry } from "../types";

const base = import.meta.env.BASE_URL;
export const LIVE_KEY = "mtb-live-report";

export async function loadWorklist(): Promise<WorklistEntry[]> {
  const res = await fetch(`${base}data/index.json`);
  if (!res.ok) throw new Error("Could not load the worklist.");
  return res.json();
}

export async function loadReport(chartNo: string): Promise<Report> {
  if (chartNo === "live") {
    const raw = sessionStorage.getItem(LIVE_KEY);
    if (!raw) throw new Error("No uploaded analysis found — start from the upload page.");
    return JSON.parse(raw) as Report;
  }
  const res = await fetch(`${base}data/reports/${chartNo}.json`);
  if (!res.ok) throw new Error(`Could not load report ${chartNo}.`);
  return res.json();
}
