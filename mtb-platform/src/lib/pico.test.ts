import { describe, it, expect } from "vitest";
import { deriveKnowledge } from "./pico";
import type { Variant, LiteratureHit, Treatment } from "../types";

function variant(over: Partial<Variant> = {}): Variant {
  return {
    gene: "BRCA1",
    alteration: "Q1756fs",
    kind: "mutation",
    oncogenicity: "Oncogenic",
    escat: "I",
    escatDescription: "",
    oncokbLevel: null,
    resistanceLevel: null,
    treatments: [],
    ...over,
  };
}

const niraparib: Treatment = { drugs: "Niraparib", level: "LEVEL_1", fdaApproved: true, description: "" };

describe("deriveKnowledge", () => {
  it("BRCA1 ESCAT I + LEVEL_1 with a treatment → High, OS, named intervention", () => {
    const v = variant({ escat: "I", oncokbLevel: "LEVEL_1", treatments: [niraparib] });
    const k = deriveKnowledge(v, "Ovarian Cancer", []);
    expect(k.grade).toBe("High");
    expect(k.pico.intervention).toBe("Niraparib");
    expect(k.pico.outcome).toBe("Overall survival");
    expect(k.pico.question).toContain("ovarian cancer");
  });

  it("no treatments + ESCAT III → investigational intervention, Low, PFS", () => {
    const v = variant({ escat: "III", oncokbLevel: null, treatments: [] });
    const k = deriveKnowledge(v, "Breast Cancer", []);
    expect(k.pico.intervention).toBe("targeted therapy under investigation");
    expect(k.grade).toBe("Low");
    expect(k.pico.outcome).toBe("Progression-free survival");
  });

  it("ESCAT II without LEVEL_1 → Moderate", () => {
    const v = variant({ escat: "II", oncokbLevel: "LEVEL_3A", treatments: [niraparib] });
    const k = deriveKnowledge(v, "Breast Cancer", []);
    expect(k.grade).toBe("Moderate");
  });

  it("maps literature hits into CiteSource studies", () => {
    const hit: LiteratureHit = {
      pmid: "27717299",
      title: "Niraparib maintenance therapy in platinum-sensitive ovarian cancer.",
      authors: "Mirza MR, Monk BJ, Herrstedt J",
      journal: "N Engl J Med",
      year: "2016",
      gene: "BRCA1",
      alteration: "Q1756fs",
    };
    const k = deriveKnowledge(variant(), "Ovarian Cancer", [hit]);
    expect(k.studies).toHaveLength(1);
    expect(k.studies[0]).toMatchObject({
      pmid: "27717299",
      title: hit.title,
      authors: hit.authors,
      journal: hit.journal,
      year: hit.year,
    });
  });
});
