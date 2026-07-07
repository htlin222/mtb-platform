import React, { useState } from "react";
import {
  ChevronRight, Check, TriangleAlert, FlaskConical, FileText,
  BookText, Scale, ShieldCheck, MessageCircleQuestion, X, Dna, Info
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  分子腫瘤委員會（MTB）報告 — 主治醫師閱讀介面 / Primer 風格 mockup
 *  設計重點：三層閱讀深度。預設只給臨床結論，理由與原始證據皆一鍵展開。
 *  介面用詞全為臨床語言，不洩漏任何工程／資訊科學術語。
 * ------------------------------------------------------------------ */

// Primer 光色票（以 inline style 使用，避免依賴 Tailwind 編譯器）
const C = {
  canvas: "#ffffff",
  inset: "#f6f8fa",
  border: "#d0d7de",
  borderMuted: "#d8dee4",
  fg: "#1f2328",
  muted: "#656d76",
  accent: "#0969da",
  accentSubtle: "#ddf4ff",
  success: "#1a7f37",
  successBg: "#dafbe1",
  successBorder: "#4ac26b",
  attention: "#9a6700",
  attentionBg: "#fff8c5",
  attentionBorder: "#d4a72c",
  danger: "#cf222e",
  dangerBg: "#ffebe9",
  done: "#8250df",
  doneBg: "#fbefff",
  neutralBg: "#eaeef2",
};

const styleTag = `
  * { box-sizing: border-box; }
  .mtb {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC",
      "PingFang TC", "Microsoft JhengHei", Helvetica, Arial, sans-serif;
    color: ${C.fg};
    background: ${C.inset};
    -webkit-font-smoothing: antialiased;
    line-height: 1.5;
    font-size: 14px;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
      "Liberation Mono", monospace;
    font-variant-ligatures: none;
  }
  .btn {
    font: inherit; cursor: pointer; border-radius: 6px;
    border: 1px solid ${C.border}; background: ${C.canvas}; color: ${C.fg};
    padding: 6px 14px; font-weight: 500; transition: background .12s;
  }
  .btn:hover { background: ${C.inset}; }
  .btn:disabled { color: #8c959f; cursor: not-allowed; background: ${C.inset}; }
  .btn-primary {
    background: ${C.success}; border-color: rgba(31,35,40,.15); color: #fff;
  }
  .btn-primary:hover { background: #187733; }
  .btn-primary:disabled { background: #94d3a2; border-color: rgba(31,35,40,.1); color: #fff; }
  .btn-ghost { border-color: transparent; background: transparent; color: ${C.accent}; padding: 6px 10px; }
  .btn-ghost:hover { background: ${C.accentSubtle}; }
  .discl {
    width: 100%; text-align: left; font: inherit; cursor: pointer;
    background: transparent; border: none; padding: 0; color: ${C.accent};
    display: inline-flex; align-items: center; gap: 4px; font-weight: 500;
  }
  .discl:hover { text-decoration: underline; }
  .chev { transition: transform .15s; }
  .chev.open { transform: rotate(90deg); }
  .cite {
    display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
    border: 1px solid ${C.border}; background: ${C.canvas}; border-radius: 2em;
    padding: 3px 10px 3px 8px; font-size: 12px; color: ${C.fg}; transition: border-color .12s;
  }
  .cite:hover { border-color: ${C.accent}; }
  .step { position: relative; }
  .step .why { color: ${C.accent}; cursor: pointer; }
  .step .why:hover { text-decoration: underline; }
  a, .lnk { color: ${C.accent}; text-decoration: none; }
  a:hover, .lnk:hover { text-decoration: underline; }
  :focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

// ---- 小元件：分級標籤 ----
function Tag({ tone = "neutral", children }) {
  const map = {
    success: [C.successBg, C.success, C.successBorder],
    attention: [C.attentionBg, C.attention, C.attentionBorder],
    danger: [C.dangerBg, C.danger, "#ff818266"],
    accent: [C.accentSubtle, C.accent, "#54aeff66"],
    neutral: [C.neutralBg, C.muted, C.border],
    done: [C.doneBg, C.done, "#c297ff66"],
  };
  const [bg, fg, bd] = map[tone] || map.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: bg, color: fg, border: `1px solid ${bd}`,
      borderRadius: "2em", padding: "1px 9px", fontSize: 12, fontWeight: 600,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ---- 小元件：證據等級小片 ----
function Evidence({ level }) {
  const m = { 高: "success", 中: "attention", 低: "neutral" };
  return <Tag tone={m[level]}>證據：{level}</Tag>;
}

// ---- PRISMA 迷你漏斗（可查排除原因，體現可稽核）----
function PrismaFunnel() {
  const [openWhy, setOpenWhy] = useState(false);
  const steps = [
    ["資料庫檢索命中", 1284, 100],
    ["初篩後保留", 312, 24],
    ["全文評讀合格", 47, 4],
    ["最終納入", 9, 1.6],
  ];
  return (
    <div style={{
      border: `1px solid ${C.borderMuted}`, borderRadius: 6,
      background: C.canvas, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Scale size={15} color={C.muted} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>證據來源：系統性回顧</span>
        <Tag tone="done">PRISMA・已人工驗證</Tag>
      </div>
      {steps.map(([label, n, pct], i) => (
        <div key={i} className="step" style={{ marginBottom: i < 3 ? 8 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: C.muted }}>
              {label}
              {i === 2 && (
                <> ・<span className="why" onClick={() => setOpenWhy(v => !v)}>為什麼排除 {312 - 47}？</span></>
              )}
            </span>
            <span className="mono" style={{ color: C.fg, fontWeight: 600 }}>n = {n.toLocaleString()}</span>
          </div>
          <div style={{ height: 6, background: C.inset, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${Math.max(pct, 2)}%`, height: "100%",
              background: i === 3 ? C.success : C.accent, opacity: i === 3 ? 1 : 0.55,
            }} />
          </div>
          {i === 2 && openWhy && (
            <div style={{
              marginTop: 6, fontSize: 12, color: C.muted, background: C.inset,
              border: `1px solid ${C.borderMuted}`, borderRadius: 6, padding: "8px 10px",
            }}>
              非隨機對照（n=118）・族群不符：非亞洲人（n=94）・僅摘要無全文（n=53）
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- 引用片 ----
function Cite({ label, tone, detail }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ display: "inline-block" }}>
      <button className="cite" onClick={() => setOpen(v => !v)} title="查看來源">
        <BookText size={13} color={C.muted} />
        <span>{label}</span>
        <Tag tone={tone}>{tone === "success" ? "隨機對照" : "回溯性"}</Tag>
      </button>
      {open && (
        <div style={{
          fontSize: 12, color: C.muted, marginTop: 6, marginBottom: 4,
          borderLeft: `2px solid ${C.border}`, paddingLeft: 10,
        }}>{detail} <span className="lnk">開啟原文 ↗</span></div>
      )}
    </span>
  );
}

// ---- 一則發現卡（Layer 1 收合／展開至 Layer 2–3）----
function Finding({ gene, variant, coord, vaf, tier, tierTone, rec, level, evidenceBlock, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 8, background: C.canvas,
      marginBottom: 12, overflow: "hidden",
    }}>
      {/* Layer 1：一眼可讀的臨床結論 */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{gene}</span>
          <span className="mono" style={{ color: C.fg, fontSize: 14 }}>{variant}</span>
          <Tag tone={tierTone}>{tier}</Tag>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>{rec}</span>
          <Evidence level={level} />
        </div>
        <button className="discl" onClick={() => setOpen(v => !v)}>
          <ChevronRight size={15} className={`chev${open ? " open" : ""}`} />
          {open ? "收合依據" : "查看依據"}
        </button>
      </div>

      {/* Layer 2–3：理由、原始變異、指引、文獻、PRISMA */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.borderMuted}`, background: C.inset, padding: "14px 16px" }}>
          {/* 原始變異（給願意深究的人，mono 呈現） */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Dna size={15} color={C.muted} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>定序原始資料</span>
          </div>
          <div className="mono" style={{
            fontSize: 12.5, background: C.canvas, border: `1px solid ${C.borderMuted}`,
            borderRadius: 6, padding: "8px 12px", marginBottom: 14, color: C.fg,
          }}>
            {coord}　<span style={{ color: C.muted }}>|</span>　VAF {vaf}　<span style={{ color: C.muted }}>|</span>　讀取深度 1,240×
          </div>

          {evidenceBlock}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [ackChecked, setAckChecked] = useState(false);
  const [signed, setSigned] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div className="mtb" style={{ minHeight: "100vh", padding: "24px 16px" }}>
      <style>{styleTag}</style>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* 常駐提示：AI 產生・需醫師審閱 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: signed ? C.successBg : C.attentionBg,
          border: `1px solid ${signed ? C.successBorder : C.attentionBorder}`,
          borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13,
        }}>
          {signed
            ? <><ShieldCheck size={17} color={C.success} />
                <span>本報告已由 <b>林○○ 主治醫師</b> 於 2026/07/07 14:32 審閱簽核。</span></>
            : <><TriangleAlert size={17} color={C.attention} />
                <span>本報告由系統依定序結果與文獻自動彙整，屬草稿，須經主治醫師審閱簽核後方可作為臨床參考。</span></>}
        </div>

        {/* 病人表頭 */}
        <div style={{
          background: C.canvas, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "18px 20px", marginBottom: 20,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <FlaskConical size={18} color={C.done} />
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>分子腫瘤委員會報告</h1>
                <Tag tone="neutral">示範資料</Tag>
              </div>
              <div style={{ color: C.muted, fontSize: 13.5 }}>
                王○明・58 歲 男　<span className="mono">病歷號 A2291045</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Tag tone={signed ? "success" : "attention"}>
                {signed ? <><Check size={13} />已簽核</> : "待審閱"}
              </Tag>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>產生於 2026/07/07 09:14</div>
            </div>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 14, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.borderMuted}`,
          }}>
            {[
              ["診斷", "非小細胞肺癌（腺癌）"],
              ["分期", "IV 期（cM1c）"],
              ["前線治療", "初診斷・尚未用藥"],
              ["檢體", "血液 ctDNA 次世代定序"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Layer 1：可用藥發現（醫師 90% 停留處） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 12px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>臨床重點：可用藥發現</h2>
          <span style={{ color: C.muted, fontSize: 13 }}>2 項</span>
        </div>

        <Finding
          gene="EGFR" variant="p.L858R" coord="chr7:g.55191822 T>G（c.2573T>G）"
          vaf="42%" tier="第 I 級・可用藥" tierTone="success" level="高" defaultOpen
          rec="建議第一線：Osimertinib（泰格莎）"
          evidenceBlock={
            <>
              <div style={{ marginBottom: 14, fontSize: 13.5, lineHeight: 1.6 }}>
                此為 EGFR 敏感性突變，對第三代 EGFR-TKI 反應良好。指引將 Osimertinib 列為第一線首選，
                中樞神經滲透佳，適合本例。用藥期間建議監測 QT 間期與間質性肺病徵象。
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <FileText size={15} color={C.muted} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>指引對照</span>
              </div>
              <div style={{
                background: C.canvas, border: `1px solid ${C.borderMuted}`, borderRadius: 6,
                padding: "10px 12px", marginBottom: 14, fontSize: 13,
              }}>
                <b>NCCN 非小細胞肺癌 v3.2026</b>・EGFR 突變陽性一線治療 　
                <span className="lnk">查看條目 ↗</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <BookText size={15} color={C.muted} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>支持文獻（3）</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <Cite label="Soria 等，2018・NEJM" tone="success"
                  detail="FLAURA 試驗：Osimertinib 相較第一代 TKI 顯著延長無惡化存活期。" />
                <Cite label="Ramalingam 等，2020・NEJM" tone="success"
                  detail="FLAURA 總存活期更新：整體存活獲益。" />
                <Cite label="Reungwetwattana 等，2018・JCO" tone="attention"
                  detail="中樞神經轉移次族群分析：顱內控制良好。" />
              </div>

              <PrismaFunnel />

              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 12,
                fontSize: 12, color: C.muted,
              }}>
                <Info size={13} /> 此發現對應本院已完成之系統性回顧，證據經人工雙篩驗證。
              </div>
            </>
          }
        />

        <Finding
          gene="TP53" variant="p.R273H" coord="chr17:g.7673802 C>T（c.818G>A）"
          vaf="38%" tier="第 III 級" tierTone="neutral" level="中"
          rec="預後相關，目前無對應標靶用藥；與 EGFR 共突變者反應可能較差，建議追蹤。"
          evidenceBlock={
            <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              TP53 為常見共突變，具預後意義但目前尚無獲批標靶。與 EGFR 敏感突變並存時，
              部分研究顯示 TKI 反應期較短，建議納入療效監測與後續抗藥機轉評估。
              <div style={{ marginTop: 12 }}>
                <Cite label="Canale 等，2017・Clin Cancer Res" tone="attention"
                  detail="TP53 共突變與 EGFR-TKI 較差預後之相關性（回溯性）。" />
              </div>
            </div>
          }
        />

        {/* 降噪：意義未明／低證據，預設收合 */}
        <button className="discl" onClick={() => setShowOther(v => !v)}
          style={{ margin: "4px 2px 0", fontSize: 13 }}>
          <ChevronRight size={15} className={`chev${showOther ? " open" : ""}`} />
          其他變異（7）— 意義未明或無臨床可用性
        </button>
        {showOther && (
          <div style={{
            border: `1px solid ${C.borderMuted}`, borderRadius: 8, background: C.canvas,
            marginTop: 10, padding: "6px 4px",
          }}>
            {[
              ["KRAS", "p.G12S（意義未明）", "chr12:g.25245348"],
              ["PIK3CA", "p.E545K（意義未明）", "chr3:g.179218303"],
              ["ARID1A", "p.Q1334fs（意義未明）", "chr1:g.26774812"],
            ].map(([g, v, c], i) => (
              <div key={i} style={{
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
                padding: "9px 14px", borderBottom: i < 2 ? `1px solid ${C.inset}` : "none",
              }}>
                <span className="mono" style={{ fontWeight: 600 }}>{g}</span>
                <span className="mono" style={{ color: C.muted, fontSize: 13 }}>{v}</span>
                <span className="mono" style={{ color: "#8c959f", fontSize: 12, marginLeft: "auto" }}>{c}</span>
              </div>
            ))}
            <div style={{ padding: "9px 14px", fontSize: 12, color: C.muted }}>
              另有 4 項同義／低頻變異，未達報告門檻。
            </div>
          </div>
        )}

        {/* 簽核列：gated、具署名、可撤銷 */}
        <div style={{
          marginTop: 24, background: C.canvas, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "16px 20px",
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between", gap: 14,
        }}>
          {!signed ? (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                <input type="checkbox" checked={ackChecked}
                  onChange={e => setAckChecked(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: C.success }} />
                我已審閱以上發現與依據
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setAskOpen(true)}>
                  <MessageCircleQuestion size={15} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  問這份報告
                </button>
                <button className="btn btn-primary" disabled={!ackChecked}
                  onClick={() => setShowConfirm(true)}>
                  <ShieldCheck size={15} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                  簽核報告
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.success }}>
                <ShieldCheck size={17} /> 已由林○○主治醫師簽核・2026/07/07 14:32
              </div>
              <button className="btn" onClick={() => { setSigned(false); setAckChecked(false); }}>
                撤銷簽核
              </button>
            </>
          )}
        </div>

        <div style={{ color: "#8c959f", fontSize: 11.5, textAlign: "center", marginTop: 20, lineHeight: 1.7 }}>
          示範用途・非真實病人資料・不構成醫療建議<br />
          資料來源：血液 ctDNA 定序 + NCCN v3.2026 + 本院系統性回顧證據庫
        </div>
      </div>

      {/* 簽核確認 */}
      {showConfirm && (
        <div onClick={() => setShowConfirm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(31,35,40,.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.canvas, borderRadius: 12, maxWidth: 420, width: "100%",
            boxShadow: "0 8px 24px rgba(31,35,40,.2)", overflow: "hidden",
          }}>
            <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={18} color={C.success} />
                <b style={{ fontSize: 15 }}>確認簽核</b>
              </div>
              <X size={18} color={C.muted} style={{ cursor: "pointer" }} onClick={() => setShowConfirm(false)} />
            </div>
            <div style={{ padding: "12px 20px 20px", fontSize: 13.5, color: C.fg, lineHeight: 1.6 }}>
              簽核後，本報告將以 <b>林○○ 主治醫師</b> 名義存入病歷並可供會診共享。
              簽核紀錄會留存於稽核軌跡，仍可隨時撤銷。
            </div>
            <div style={{
              padding: "12px 20px", background: C.inset, borderTop: `1px solid ${C.borderMuted}`,
              display: "flex", justifyContent: "flex-end", gap: 8,
            }}>
              <button className="btn" onClick={() => setShowConfirm(false)}>取消</button>
              <button className="btn btn-primary" onClick={() => { setSigned(true); setShowConfirm(false); }}>
                確認簽核
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 「問這份報告」：次要功能，非主入口 */}
      {askOpen && (
        <div onClick={() => setAskOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(31,35,40,.35)",
          display: "flex", justifyContent: "flex-end", zIndex: 50,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.canvas, width: "min(380px, 90vw)", height: "100%",
            boxShadow: "-8px 0 24px rgba(31,35,40,.15)", padding: 20,
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 15 }}>問這份報告</b>
              <X size={18} color={C.muted} style={{ cursor: "pointer" }} onClick={() => setAskOpen(false)} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 0 }}>
              針對這位病人的報告內容提問，答案一律附上處來源。此為輔助，主要結論已呈現於上方報告。
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "auto" }}>
              {["有沒有臨床試驗適合？", "Osimertinib 常見副作用？", "抗藥後有什麼選擇？"].map(q => (
                <span key={q} style={{
                  fontSize: 12.5, border: `1px solid ${C.border}`, borderRadius: "2em",
                  padding: "5px 12px", color: C.accent, cursor: "pointer", background: C.canvas,
                }}>{q}</span>
              ))}
            </div>
            <div style={{
              border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px",
              color: "#8c959f", fontSize: 13,
            }}>輸入問題…（示範）</div>
          </div>
        </div>
      )}
    </div>
  );
}
