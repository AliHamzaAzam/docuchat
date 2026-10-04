# C07 security hardening

Status: partial verification, draft PR. Local implementation and regression checks are complete. No deployment, production database changes, or live AI calls were made.

## Changes and why

- Document, chunk, vector and conversation scopes are checked for registered users and individual demo sessions. Vector results recheck current chunk scope plus a ready, visible parent, including after a stale index prefilter. HTTP tests prove A cannot retrieve B through search, chat, previews or conversation continuation using isolated fixtures.
- Demo seeds remain read-only and visible to demos; private sandbox uploads remain session-scoped. Demo authorization and data access expire after two hours, including legacy seven-day demo tokens. Shared-demo password login cannot mint a sessionless token.
- Three active demo uploads are reserved atomically using a per-session database record and the built-in unique `_id`. Failed uploads release slots when failure is known; ambiguous writes retain capacity conservatively. Deletion and expiry remove the parent first, and late ingestion removes orphan chunks.
- Multer bounds demo buffering to 2 MiB, other uploads to 10 MiB, one file and no extra fields. DOCX validation bounds actual decompression to 20 MiB and 1,000 entries rather than trusting archive metadata. UTF-8 and direct parser input limits reject spoofed binary/oversized text inputs.
- PDF parsing runs outside the HTTP event loop with a five-second deadline, 128 MiB V8 old-generation heap, 100-page and 300,000-character limits, and two concurrent workers. Actual valid PDF and DOCX fixtures pass. The PDF output-limit test caught the parser swallowing page-render errors; a retained failure flag closes that bypass.
- Both AI providers use a static system message. Questions, filenames and document content stay in the user message. Neither adapter provides tools. This limits authority, not a claim of immunity to semantic prompt injection.
- JWT verification restricts algorithms and validates claims/expiry. Chat and authentication inputs reject objects, query operators and excessive lengths. JSON/multipart errors return safe statuses. Ingest diagnostics are sanitized and background database failure cannot escape unhandled.
- Arbitrary forwarding headers cannot bypass rate limits. Trusted proxies require explicit IP/CIDR configuration. Existing per-IP limits and retry headers are regression-tested.

## Independent attempts and selection

Both cloud workers began at `main` commit `81008bb3e6526f63c80fc4135e457378b3efdb32` in separate detached worktrees. Neither read the other attempt. No commits or remote branches were created for the attempts.

| Attempt | Initial complete result | Selection |
| --- | --- | --- |
| A | 83 tests passed; TypeScript passed. Covered JWT and legacy demo lifetime, ordinary/demo conversation separation, parent-gated retrieval, bounded DOCX, provider roles and safe ingest failure handling. | Selected for broader lifecycle and failure containment coverage. |
| B | 82 tests passed; TypeScript passed. Covered JWT, chat validation, parent expiry, DOCX/PDF validation and provider roles. | Not incorporated. Retained only as comparison evidence. |

Only A's patch was copied to `dot/hardening`. Follow-up reviews of that selected implementation added failing regressions before fixes for HTTP isolation/expiry, concurrent quotas, upload/deletion races, request validation, proxy spoofing, PDF resources and stale index ownership. These are new review rounds, not a merge of the two attempt patches.

## Regression-first evidence

All commands below ran in cloud worktrees using fake database/provider values. No actual database or provider requests were needed.

| Suite or focused case | Observed failure before fix |
| --- | --- |
| A `tests/security-boundaries.test.ts` | 15 failures; later legacy-demo review: 1 failure / 16 passes |
| A `tests/security-provider.test.ts` | 3 failures |
| B `tests/security.test.ts` | 11 failures initially; expanded ZIP cases: 13 failures / 1 pass |
| B `tests/provider-boundary.test.ts` | 1 failure |
| B `tests/chat-validation.test.ts` | 4 failures |
| Selected `tests/security-http.test.ts` | 9 failures / 3 passes initially; preview: 1 failure / 16 passes; auth inputs: 4 failures / 17 passes; stale index: 1 failure / 23 passes |
| Selected `tests/upload-lifecycle.test.ts` | 4 failures initially; ambiguous write review: 1 failure / 5 passes |
| Selected `tests/ingest-lifecycle.test.ts` | 3 failures / 1 pass |
| Selected `tests/quota-cleanup.test.ts` | 1 failure initially; deletion-order review: 1 failure / 1 pass |
| Selected `tests/security-rate-limit.test.ts` | 1 failure / 1 pass |
| Selected `tests/parser-safety.test.ts` | 5 failures |
| Selected `tests/http-errors.test.ts` | 4 failures |
| Selected actual PDF output-budget test | 1 failure / 4 passes |

Each focused command used `npm test -- tests/<name>.test.ts` from that worktree's `server` directory, followed by fixes and a passing rerun. Cloud-only working reports and failure logs are retained under `/tmp/c07-*` for this session.

## Final checks

From `/workspace/docuchat/server`:

```sh
env -i PATH="$PATH" DOTENV_CONFIG_PATH=/tmp/c07-no-env npm test
env -i PATH="$PATH" npm run build
```

Results: 150 tests passed in 22 files; TypeScript build passed. The test setup supplies fake values. The environment is cleared, and dotenv points to a nonexistent file.

From `/workspace/docuchat/client`:

```sh
env -i PATH="$PATH" npm run build
env -i PATH="$PATH" npm run lint
```

Results: TypeScript/Vite build passed. Lint: zero errors and the same two baseline `react(only-export-components)` warnings in `AuthContext.tsx` and `Toast.tsx`. No client test script exists.

From `/workspace/docuchat`:

```sh
git diff --check
```

Result: passed. Baseline before changes: 62 server tests passed; both builds passed; the same two client lint warnings.

Dependencies were restored from committed lockfiles with `npm ci --ignore-scripts --no-audit --no-fund`, using writable temporary caches. No dependencies or lockfiles were changed.

## Unverified items

- `npm run test:integration` intentionally not run. Its tests call the live AI provider, which conflicts with the instruction not to write to production APIs. The complete default local suite was run.
- Actual Atlas vector-index filtering and MongoDB multi-process atomic quota behavior need isolated staging verification. HTTP tests execute the real routing/retrieval/answer code against an explicit in-memory query evaluator; they do not substitute for Atlas execution.
- Rate-limit stores and PDF concurrency limits remain per process. A multi-instance deployment needs an approved shared rate-limit store for a global budget.
- PDF V8 heap limits do not bound every native/external allocation; the worker deadline, input/output and concurrency limits provide additional bounds. Host/container memory limits remain a deployment concern.
- Prompt role separation is tested at both provider transports. Adversarial live-model behavior has not been evaluated.
- Crashes or ambiguous database writes can temporarily retain a quota slot; physical orphan cleanup remains best effort during outages. Retrieval rejects missing/failed parents.

## Needs the founder

1. Verify the reverse proxy network and set `TRUSTED_PROXY_CIDRS` to its actual addresses. Without configuration, clients behind a proxy share its IP budget. Do not restore unconditional one-hop trust.
2. Validate Atlas A/B isolation and four simultaneous uploads across multiple server processes in an isolated staging database. No production migration or index recreation was run or is authorized by this PR.
3. Upgrade all serving instances together: older code bypasses the new quota reservation. The new `demoquotas` collection relies on MongoDB's existing `_id` uniqueness, not a new secondary index.
4. Review compatibility limits before rollout: two-hour demo tokens, PDF page/output/deadline caps, strict UTF-8, and 72-byte bcrypt passwords. Existing passwords beyond bcrypt's old truncation boundary may need reset guidance.
5. Decide whether distributed rate limits and an approved live-model adversarial evaluation are required before deployment. Keep this PR draft until the remaining verification is accepted.
