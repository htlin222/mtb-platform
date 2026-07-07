# 07 · 三分鐘 Demo Run-sheet（綁定已部署平台）

> 上線網址：**https://mtb-platform.pages.dev/**
> 一句話：社區癌症中心自己造的分子腫瘤委員會。跑真實 pipeline 輸出、吃評審丟的 VCF、簽核過的報告會自己升級。

鐵律（照 `05`）：**只走一條故事線**。平台有 8+ 個模組（Board / Research / Cohort / Evidence / Batch-IGV…），demo 時**大部分都不點**。兩個高峰：① 吃評審的 VCF 現場跑；② 簽核報告的 re-annotation 升級。其餘壓低。

---

## 0:00–0:20 · 鉤子（第一人稱，先講問題）

> 「我們是一間**社區癌症中心**——不是醫學中心。我們得做 NGS，卻養不起、也湊不齊一個分子腫瘤委員會的專科陣容。所以我們自己造了一個。而且——它就跑在你們手上這份資料上。」

- 開場句先講，**不自我介紹**。
- 螢幕停在 worklist（首句 framing 已印在頁面上）。

## 0:20–1:00 · 吃評審的 VCF，現場跑（高峰 ①，信任籌碼）

1. 點右上 **New analysis** → 拖一個 VCF 進去（可請評審給，或用 `use a sample VCF`）。
2. 指著 client-side 解析結果：「這是**在你們瀏覽器裡**解析的，沒上傳任何伺服器。12 個 PASS 變異、AF、落在 actionable gene 的即時亮起——BRAF V600E、EGFR L858R…」
3. 點 **Run tertiary analysis** → 9 階段 pipeline 動畫（FastQC→DRAGEN→VEP→OncoKB→…→Quarto），每階段真實工具與數字。
4. 落地到報告。

> 講稿要點：顏色只講臨床意義（綠=可用藥），不解釋任何技術。

## 1:00–1:40 · 往下鑽到證據（信任節拍）

1. 報告 **Overview** 只掃結論：「BRCA1 → PARP（Tier I）、HRD-positive」。
2. 切 **Literature** 分頁 → 展開一個 appraisal：PICO → **PRISMA 漏斗** → GRADE → 納入研究（Q1 / CrossRef-verified / PMID 可點）。
3. 一句：「隨便點一條 citation，往下追到原始文獻。能扛住檢驗的系統才值得信。」

## 1:40–2:20 · Re-annotation 飛輪（全案最強差異化）

1. 回 worklist：指著病人旁的 **⟳ Re-review** 旗標。
2. 進那位病人 → 頂端橘色示警：**「CCNE1：VUS（Tier X）→ Oncogenic（Tier II）· Now actionable」**。
3. 收斂句：
   > 「一份**簽核過的報告不是凍結的**。我們的資料庫每週重新註解；當一個曾經是 VUS 的變異變成可用藥，病人**自動被標記回來**。對一間追不動最新知識的社區醫院，這就是我們最需要的超能力。」
- 想加一拍可帶 **Evidence base** 頁一秒：「每個分級都錨定在 PubMed 文獻上」——但**別展開**。

## 2:20–2:50 · 沒排練的一刻（信任籌碼）

- 邀評審**當場再丟一個 VCF / 一個基因**，重跑 upload→parse→亮起。
- 只有系統真能動的隊伍敢這樣。這是獨佔的一步。

## 2:50–3:00 · 收尾

> 「一間社區中心，用你們自己的資料，跑出醫學中心等級的分子委員會——而且它會自己保持最新。這就是我們做的。」

---

## 現場翻車退路（30 秒）

- IGV / hg19 reference 或 CDN 卡住 → **別停在 Batch/IGV**（它吃網路最重，demo 主線本來就不走它）。
- Live VCF 若卡 → 坦白切換到預備好的 demo case（`Run pipeline`），誠實加分：「網路當下有狀況，這是同一份資料稍早跑的結果」。切勿假裝 live。

## 講者小抄

- 開場句先講，不要先自我介紹。
- 全程只走**一條**線；忍住不點 Board / Research / Cohort / Batch。
- 兩個高峰：**吃評審 VCF** + **re-annotation 升級**。
- 顏色只講臨床意義，不解釋技術。
- 被問技術 → 拉回「這對社區中心的主治意味什麼」。

## 一頁 talking points（給評審記憶點）

- **對象真實**：我們就是那間社區癌症中心（taiwancancercare.org）。
- **真資料**：分子結果是真實 ngs-tertiary-analysis pipeline 輸出（OncoKB · ESCAT · PubMed）。
- **吃你的資料**：client-side 解析評審的 VCF，零後端。
- **證據可稽核**：PRISMA + GRADE + PMID/DOI，一鍵到原始文獻。
- **會自己更新**：cron re-annotation，VUS→actionable 自動示警。
- **兩賽道橋接**：開發組工具，引擎跑實驗室組等級推理。
