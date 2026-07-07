import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, type ChartOptions } from "chart.js";
import type { Report } from "../types";
import { ESCAT_ORDER } from "../lib/format";

Chart.register(ArcElement, Tooltip, Legend);
// Pajamas defaults so every chart matches the design system.
Chart.defaults.font.family =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans TC', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#737278"; // --gray-500

const TIER_HEX: Record<string, string> = {
  I: "#108548", II: "#1f75cb", III: "#c17d10", IV: "#89888d", X: "#dcdcde",
};

const doughnutOpts: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "62%",
  plugins: {
    legend: { position: "right", labels: { boxWidth: 12, boxHeight: 12, padding: 12, color: "#535158" } },
    tooltip: {
      backgroundColor: "#333238", titleColor: "#fff", bodyColor: "#fff",
      cornerRadius: 4, padding: 8, displayColors: true,
    },
  },
};

/** Doughnut of a report's alterations by ESCAT tier. */
export function TierDoughnut({ report }: { report: Report }) {
  const counts: Record<string, number> = {};
  for (const v of report.variants) counts[v.escat] = (counts[v.escat] ?? 0) + 1;
  const tiers = ESCAT_ORDER.filter((t) => counts[t]);
  const data = {
    labels: tiers.map((t) => `Tier ${t} (${counts[t]})`),
    datasets: [{
      data: tiers.map((t) => counts[t]),
      backgroundColor: tiers.map((t) => TIER_HEX[t]),
      borderColor: "#ffffff",
      borderWidth: 2,
    }],
  };
  return (
    <div style={{ height: 180 }}>
      <Doughnut data={data} options={doughnutOpts} />
    </div>
  );
}
