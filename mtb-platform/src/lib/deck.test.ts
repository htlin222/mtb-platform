import { describe, it, expect } from "vitest";
import { buildSlides } from "./deck";
import type { Report } from "../types";
import fixture from "../../public/data/reports/99231004.json";

const report = fixture as unknown as Report;

describe("buildSlides", () => {
  it("returns 6 slides in the expected order", () => {
    const slides = buildSlides(report);
    expect(slides.map((s) => s.kind)).toEqual([
      "title",
      "history",
      "molecular",
      "actionable",
      "evidence",
      "recommendation",
    ]);
  });

  it("title slide carries patient name and cancer type", () => {
    const t = buildSlides(report)[0];
    expect(t.patientName).toBe("Amelia Chen");
    expect(t.subtitle).toContain("High-grade serous ovarian carcinoma");
    expect(t.subtitle).toContain("Stage IIIC");
    expect(t.meta).toContain(report.patient.sampleId);
  });

  it("history slide summarises consult reason, prior therapy, ECOG and chemo", () => {
    const h = buildSlides(report).find((s) => s.kind === "history")!;
    expect(h.bullets).toBeDefined();
    expect(h.bullets!).toContain(report.clinical.consultReason);
    expect(h.bullets!.some((b) => b.includes("ECOG"))).toBe(true);
    expect(h.bullets!.length).toBeGreaterThanOrEqual(4);
  });

  it("molecular slide includes all variants and biomarker badges", () => {
    const m = buildSlides(report).find((s) => s.kind === "molecular")!;
    expect(m.variantRows!.length).toBe(report.variants.length);
    expect(m.biomarkerBadges!.length).toBeGreaterThanOrEqual(3);
  });

  it("actionable slide lists BRCA1 with its drug", () => {
    const a = buildSlides(report).find((s) => s.kind === "actionable")!;
    expect(a.findings!.some((f) => f.gene === "BRCA1")).toBe(true);
    const brca = a.findings!.find((f) => f.gene === "BRCA1")!;
    expect(brca.drugs).toBeTruthy();
    expect(brca.drugs).not.toBe("—");
  });

  it("actionable slide only carries ESCAT I/II findings", () => {
    const a = buildSlides(report).find((s) => s.kind === "actionable")!;
    expect(a.findings!.every((f) => f.escat === "I" || f.escat === "II")).toBe(true);
  });

  it("evidence slide echoes the actionable findings without narration", () => {
    const slides = buildSlides(report);
    const actionable = slides.find((s) => s.kind === "actionable")!;
    const evidence = slides.find((s) => s.kind === "evidence")!;
    expect(evidence.findings!.length).toBe(actionable.findings!.length);
    expect(evidence.narration).toBeUndefined();
  });

  it("recommendation slide has placeholder bullets and no narration", () => {
    const r = buildSlides(report).find((s) => s.kind === "recommendation")!;
    expect(r.bullets!.length).toBeGreaterThan(0);
    expect(r.narration).toBeUndefined();
  });
});
