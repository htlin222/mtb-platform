// Data loading: reads the integrated JSON produced by scripts/build-data.mjs
// from real ngs-tertiary-analysis-skills output.
import type { Report, WorklistEntry } from "../types";

const base = import.meta.env.BASE_URL;

export async function loadWorklist(): Promise<WorklistEntry[]> {
  const res = await fetch(`${base}data/index.json`);
  if (!res.ok) throw new Error("Could not load the worklist.");
  return res.json();
}

export async function loadReport(chartNo: string): Promise<Report> {
  const res = await fetch(`${base}data/reports/${chartNo}.json`);
  if (!res.ok) throw new Error(`Could not load report ${chartNo}.`);
  return res.json();
}
