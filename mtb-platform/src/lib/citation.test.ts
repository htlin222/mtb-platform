import { describe, it, expect } from "vitest";
import { formatCitation, mybibUrl } from "./citation";

const s = { authors: "Mirza MR, Monk BJ, Herrstedt J", title: "Niraparib maintenance therapy in platinum-sensitive ovarian cancer.", journal: "N Engl J Med", year: "2016", pmid: "27717299" };

describe("formatCitation", () => {
  it("AMA is the default and ends with the period + PMID", () => {
    const out = formatCitation(s);
    expect(out).toBe("Mirza MR, Monk BJ, Herrstedt J. Niraparib maintenance therapy in platinum-sensitive ovarian cancer. N Engl J Med. 2016. PMID: 27717299");
  });
  it("AMA includes volume(issue):pages when present", () => {
    expect(formatCitation({ ...s, volume: "375", issue: "22", pages: "2154-2164" }))
      .toContain("N Engl J Med. 2016;375(22):2154-2164.");
  });
  it("collapses >6 authors to et al", () => {
    const many = "A B, C D, E F, G H, I J, K L, M N";
    expect(formatCitation({ ...s, authors: many })).toMatch(/^A B, C D, E F, G H, I J, K L, et al\./);
  });
  it("Vancouver appends period after PMID", () => {
    expect(formatCitation(s, "vancouver")).toMatch(/PMID: 27717299\.$/);
  });
  it("APA uses (year) and sentence order", () => {
    expect(formatCitation(s, "apa")).toContain("(2016).");
  });
});

describe("mybibUrl", () => {
  it("links to the AMA generator with the identifier", () => {
    expect(mybibUrl(s)).toBe("https://www.mybib.com/tools/ama-citation-generator?q=27717299");
    expect(mybibUrl({ ...s, doi: "10.1056/NEJMoa1611310" })).toContain("q=10.1056%2FNEJMoa1611310");
  });
});
