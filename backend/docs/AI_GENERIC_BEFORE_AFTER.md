# AI generic listening — before / after

**Purpose:** Feedback Desk listens to any customer text and tells the business what customers experience—without inventing stories.

**Method:** Same inputs. Before = live production records from this org. After = CX analyst prompt + schema alignment (`PROMPT_VERSION` / `SCHEMA_VERSION` **2.1.0**), verified with Gemini `gemini-3.5-flash-lite` on 2026-10-07 via `scripts/verify_generic_prompts.ts`.

**Approach:** Prompt + JSON schema + typed `DeepAnalysisResult` + frontend display for intents/topics/issues/severity/urgency/capabilities/praise. No hardcoded feedback-type control plane. Critical Alert clamp when `feedbacks.length < 2`.

---

## Case 1 — Keyboard mash (noise)

**Input:** long gibberish (`Bbbbbbdjejdbd…`) · rating null

| Layer | Before (production) | After (verified) |
|-------|---------------------|------------------|
| Category | Bug Report (low confidence) | **Uncategorized** |
| Sentiment | Neutral | Neutral |
| Priority | Low | Low |
| Summary | Incoherent gibberish; no actionable information | Random characters; no meaningful / actionable product feedback |
| Root cause | Accidental key mash / tested input field | **null** (none) |
| Action items | Disregard as spam / accidental input | **[]** |
| Hypotheses | 1 | **0** |
| AI Customer Brief | Recommended: implement validation / detect keyboard mashing | Prompt: no platform recommendations; Critical Alert blocked for n&lt;2 thin samples |

**Business impact before:** Fake product/platform work.  
**Business impact after:** Noise does not become a roadmap item.

---

## Case 2 — “Give me Rs 100000” (unclear · rating 4)

**Input:** `Give me Rs 100000` · rating **4** (rating not passed into classify API in this verify run; text alone)

| Layer | Before (production) | After (verified) |
|-------|---------------------|------------------|
| Category | Payment (high confidence) | **Uncategorized** |
| Sentiment | Negative | **Neutral** |
| Priority | **High Priority** | **Low Priority** |
| Summary | Critical payment issue; missing txn / refund / unauthorized | Monetary request with **no context**; not actionable product feedback |
| Root cause | Owed due to missing payment / refund / txn error | **null** |
| Action items | Audit Rs 100k logs; outreach; review system logs | **[]** |
| Hypotheses | 3 invented | **0** |
| Brief health | **Critical Alert** | Target: Stable / no Critical from one unclear line (brief prompt + n&lt;2 clamp) |
| Brief decisions | Finance audit, gateway review, etc. | Target: 0 decisions or “no clear customer themes”; platform-leak filter on decisions |

**Business impact before:** Fake payment crisis.  
**Business impact after:** Business is not told to run audits on invented failures.

---

## Case 3 — Clear product complaint (must not regress)

**Input:** “Checkout failed twice with a card declined error even though my card works elsewhere. Order never completed.”

| Layer | Before | After (verified) |
|-------|--------|------------------|
| Category | (typical) Bug / Payment | **Payment** |
| Sentiment | Negative | **Negative** |
| Priority | High | **High Priority** |
| Summary | Checkout / card declined | Checkout failed twice; card declined; order never completed |
| Root cause / actions | Product investigation | Investigate checkout / payment processing failure |
| Brief | Eligible theme | Still eligible — listening still works |

---

## Summary scorecard

| Check | Before | After |
|-------|--------|-------|
| Invents facts on mash | Yes (platform validation brief) | **No** (Uncategorized, empty actions) |
| Invents payment crisis on bare demand | Yes | **No** |
| Critical Alert on n=1 unclear | Yes | **Guarded** (prompt + clamp) |
| Clear bugs still surfaced | Yes | **Yes** |
| New types/parameters added | Over-eng reverted | **No** |

---

## What changed in code

- [`backend/src/ai/classify.ts`](../src/ai/classify.ts) — generic listen prompt; allow `Uncategorized`
- [`backend/src/executive_brief.ts`](../src/executive_brief.ts) — customer-experience brief; 0–3 decisions; no platform-leak decisions; no Critical Alert when fewer than 2 samples
- [`backend/src/ai/types.ts`](../src/ai/types.ts) — `PROMPT_VERSION` → `2.0.1`

Re-verify:

```bash
cd backend && npx tsx scripts/verify_generic_prompts.ts
```
