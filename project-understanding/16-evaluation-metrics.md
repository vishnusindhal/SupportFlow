# Evaluation Metrics and Query Latency

This document lists the metrics used to evaluate SupportFlow and records the
measured execution time of one chat query.

The labelled evaluation set is
[`docs/fixtures/northstar_store/evaluation_questions.json`](../docs/fixtures/northstar_store/evaluation_questions.json).
It holds 20 questions:

- **13 supported questions.** Each one names the policy file that answers it
  (`expected_source`).
- **7 unsupported questions.** For each one the expected behaviour is
  `safe_fallback`: the assistant must not invent an answer.

## 1. Retrieval metrics (V3)

These are measured on the 13 supported questions. A retrieved chunk counts as
correct when it comes from `expected_source`.

| Metric | Definition | Target |
|---|---|---|
| Hit Rate@k (Recall@k) | Share of questions where the correct source appears in the top k chunks | ≥ 90% at k = 5 |
| MRR (Mean Reciprocal Rank) | Average of 1 / rank of the first correct chunk | ≥ 0.8 |
| Precision@k | Share of the top k chunks that are relevant | ≥ 60% |

## 2. Answer-quality metrics (V4)

| Metric | Definition | Target |
|---|---|---|
| Faithfulness / groundedness | Every claim in the answer is supported by the cited excerpts | ≥ 95% |
| Answer correctness | The answer matches the policy fact, judged by a person or an LLM judge | ≥ 90% |
| Citation accuracy | The cited document equals `expected_source` | ≥ 90% |
| Answer relevancy | The answer addresses the question that was asked | ≥ 90% |

## 3. Safety and fallback metrics

Fallback is scored as binary classification, with "should fall back" as the
positive class.

| Metric | Formula | Target |
|---|---|---|
| Fallback precision | correct fallbacks ÷ all fallbacks returned | ≥ 90% |
| Fallback recall | correct fallbacks ÷ 7 unsupported questions | 100% |
| F1 score | 2 · P · R / (P + R) | ≥ 0.9 |
| Prompt-injection resistance | Share of instruction-like text in documents that is treated as quoted evidence and ignored | 100% |

Fallback recall has a 100% target because a single invented answer to an
unsupported question is a policy failure.

## 4. Intent, flow and rule metrics (V5–V6)

| Metric | Target |
|---|---|
| Intent classification accuracy, reported with a confusion matrix | ≥ 95% |
| Entity extraction accuracy (order IDs such as `ORD-1234`) | 100% |
| Rule-matching accuracy (the correct rule fires; first match wins) | 100%, because rules are deterministic |

## 5. Support-outcome metrics (V7)

- **Escalation rate:** share of conversations handed to a human agent.
- **Containment (deflection) rate:** share of conversations resolved without
  a human. This is the main business metric.
- **Ticket resolution time:** time from ticket creation to resolution.

## 6. System and non-functional metrics

| Metric | Target |
|---|---|
| End-to-end response latency (p50 / p95) | p95 < 3 s |
| Tokens and cost per conversation (from stored LLM usage) | Tracked |
| Cross-tenant leakage (rows readable by another tenant) | 0 |
| Automated test pass rate | 100% |
| Code coverage (`pytest --cov`) | ≥ 80% |

## 7. Measured execution time for one query

### Setup

| Item | Value |
|---|---|
| Date | 2026-11-27 |
| Environment | Local Docker Compose stack (`docker compose up --build`) |
| LLM | Gemini (`GEMINI_MODEL` from `.env`), with a key configured |
| Embeddings | `google/gemini-embedding-001`, 384 dimensions |
| Knowledge base | The 3 Northstar policy files, uploaded as `.txt` |
| Query | "How many days do I have to return an item?" |
| Runs | 5 per endpoint |

### Results

| Stage | Min | Median | Average | Max |
|---|---|---|---|---|
| Retrieval only (`POST /api/v1/knowledge/retrieve`) | 472 ms | 546 ms | 532 ms | 551 ms |
| Full chat query (`POST /api/v1/chat/preview`) | 1,266 ms | **1,733 ms** | 1,648 ms | 1,760 ms |

Uploading one policy document took 0.5–1.2 s. This is a one-time ingestion
cost and is not part of the query time.

### Response check

The chat answer was correct:

> Customers may request a return within 30 calendar days of delivery for
> unused items in original packaging.

It cited `returns.txt`, returned `fallback: false`, and detected the intent
as `returns`.

### Where the time goes

| Part | Approx. time | Work done |
|---|---|---|
| Retrieval | ~0.5 s | Gemini embedding of the question, then vector and lexical ranking |
| Rest of the pipeline | ~1.1 s | Intent detection, rule evaluation, Gemini answer generation, saving the conversation and messages |

### Summary

One query takes about **1.6–1.7 s** end to end: about 0.5 s for retrieval and
about 1.1 s for LLM generation and the rest of the pipeline. This meets the
p95 target of 3 s.

### Limitations

- The numbers come from one local machine and network. Gemini response time
  varies, so measure again before a demo.
- Five runs is a small sample. Report p95 from a larger run (for example 50
  queries) for a stronger claim.
- Without `GEMINI_API_KEY`, the app returns the safe fallback. Query time is
  then much lower but does not reflect real usage.

## Reproducing the measurement

Start the stack, then run this from the repository root:

```powershell
python demo-inputs/time_query.py docs/fixtures/northstar_store/policies
```

The script registers a throwaway "Timing Test" organization, uploads the
policy files, and prints min, median, max and average latency for retrieval
and for full chat.
