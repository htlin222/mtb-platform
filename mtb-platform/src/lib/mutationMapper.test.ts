import { describe, it, expect } from "vitest";
import {
  classifyMutation, proteinPosition, buildLollipops, mutatedGenes,
} from "./mutationMapper";
import type { Report } from "../types";

describe("classifyMutation", () => {
  it("missense", () => {
    expect(classifyMutation("V600E")).toBe("missense");
    expect(classifyMutation("R248W")).toBe("missense");
    expect(classifyMutation("Y537S")).toBe("missense");
  });
  it("truncating (nonsense + frameshift)", () => {
    expect(classifyMutation("R1276*")).toBe("truncating");
    expect(classifyMutation("E1836fs")).toBe("truncating");
    expect(classifyMutation("K264Efs*29")).toBe("truncating");
    expect(classifyMutation("S149Ffs*32")).toBe("truncating");
  });
  it("inframe indels", () => {
    expect(classifyMutation("E457del")).toBe("inframe");
    expect(classifyMutation("C258_Q263delinsAR")).toBe("inframe");
    expect(classifyMutation("W11_P18del")).toBe("inframe");
  });
});

describe("proteinPosition", () => {
  it("extracts the first residue number", () => {
    expect(proteinPosition("V600E")).toBe(600);
    expect(proteinPosition("C258_Q263delinsAR")).toBe(258);
    expect(proteinPosition("E1836fs")).toBe(1836);
    expect(proteinPosition("AMPLIFICATION")).toBeNull();
  });
});

function mkReport(name: string, variants: { gene: string; alteration: string; kind?: string; escat?: string }[]): Report {
  return {
    patient: { name, chartNo: name, cancerType: "Test" } as Report["patient"],
    variants: variants.map((v) => ({
      gene: v.gene, alteration: v.alteration, kind: (v.kind ?? "mutation"),
      escat: (v.escat ?? "III"), oncogenicity: "", escatDescription: "",
      oncokbLevel: null, resistanceLevel: null, treatments: [],
    })) as Report["variants"],
  } as Report;
}

describe("buildLollipops", () => {
  it("aggregates recurrent residues across reports and keeps the top ESCAT tier", () => {
    const reports = [
      mkReport("A", [{ gene: "TP53", alteration: "R248W", escat: "II" }]),
      mkReport("B", [{ gene: "TP53", alteration: "R248W", escat: "III" }]),
      mkReport("C", [{ gene: "TP53", alteration: "R282W", escat: "III" }]),
    ];
    const built = buildLollipops("TP53", reports)!;
    expect(built.model.length).toBe(393); // curated
    const r248 = built.lollipops.find((l) => l.pos === 248)!;
    expect(r248.count).toBe(2);
    expect(r248.escat).toBe("II"); // most actionable wins
    expect(built.lollipops.map((l) => l.pos)).toEqual([248, 282]); // sorted
  });

  it("ignores CNA / fusion and unparseable alterations", () => {
    const reports = [mkReport("A", [{ gene: "MYC", alteration: "AMPLIFICATION", kind: "cna" }])];
    expect(buildLollipops("MYC", reports)).toBeNull();
  });

  it("falls back to a rounded length for uncurated genes", () => {
    const reports = [mkReport("A", [{ gene: "FAKE1", alteration: "P100L" }])];
    const built = buildLollipops("FAKE1", reports)!;
    expect(built.model.length).toBeGreaterThanOrEqual(115);
    expect(built.model.domains).toEqual([]);
  });
});

describe("mutatedGenes", () => {
  it("ranks genes by point-mutation count, excluding CNA/fusion", () => {
    const reports = [
      mkReport("A", [{ gene: "TP53", alteration: "R248W" }, { gene: "KRAS", alteration: "G12D" }]),
      mkReport("B", [{ gene: "TP53", alteration: "R282W" }, { gene: "MYC", alteration: "AMPLIFICATION", kind: "cna" }]),
    ];
    const ranked = mutatedGenes(reports);
    expect(ranked[0]).toEqual({ gene: "TP53", count: 2 });
    expect(ranked.some((g) => g.gene === "MYC")).toBe(false);
  });
});
