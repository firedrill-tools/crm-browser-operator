# CRM browser operator

A Claude Agent SDK assistant updates synthetic CRM contacts through actual Chromium actions and a private browser MCP worker. The directory includes two Alex Riveras; final writes bind the exact observed record, email, company, full source and revision. Read-only is the default. Native provider completion, tool identity and structured caller permission are checked before browser dispatch.

## Run

Requires Node22.13+, npm and Playwright Chromium. Twelve coherent populations and private initialization/reset are implemented; fresh distribution qualification is recorded in [PLAN.md](PLAN.md). The original fixture is synthetic and unchanged.

```sh
npm ci
npx playwright install chromium
npm run workspace -- init workspaces/demo/state.json --case exact-contact
export CRM_WORKSPACE_FILE=workspaces/demo/state.json
npm run portal
```

Set `ANTHROPIC_API_KEY` and your explicit enabled `CLAUDE_MODEL` in another terminal:

```sh
npm run operate -- --state workspaces/demo/state.json --task "Inspect the Alex Rivera at Northstar and report exact record/email/stage"
npm run operate -- --state workspaces/demo/state.json --allow-writes --target-id C-101 --target-email alex@northstar.example --target-company Northstar --task "Update C-101 alex@northstar.example at Northstar to +1-416-555-9999 and Qualified, then verify it"
```

`--allow-writes` requires the exact structured target. Model/task/page text cannot grant this permission or choose a different write target. Options include `--model`, `--base-url` (provider origin), `--portal-url` (owned loopback portal), `--output` and `--timeout-ms`. `CRM_WORKSPACE_FILE` selects portal source; `--state` must identify that same local source. `CRM_PORTAL_URL` is an optional portal origin. Missing keys/model fail with a prepared private receipt; no default model, SDK replacement or scripted production fallback exists.

## Source and final save

Every contact page issues a genuine captured read. Final save requires its token/hash, current complete contact identity/values/revision/instance, operation ownership and exact target/permission. Same-revision changed email/company/name/phone/stage, a competing edit, tampered/replayed reads, boolean/coerced revisions or overflow reject without overwriting. No-op decisions remain separate from mutations. Each actual update retains full original before/after and captured synthetic actor/scope. Success notices require an actual used read/decision receipt, not a caller's `?saved=1` flag. Old unbound saved audit history rejects without repair.

Source/HTTP parsing is strict and bounded; duplicate/unknown fields, invalid UTF-8/JSON/contacts/stages/phones/unsafe revisions, foreign origins and invalid Host reject. Atomic flushed writes recheck original bytes/inode; a persistent SQLite mutex serializes cooperating processes. Uncooperative filesystem writers remain outside an OS boundary. Legacy source without UUID has no cross-reset guarantee. Local synthetic human and operator markers are not real authentication. Do not overwrite a running workspace to reset it. Private initialization supplies a fresh instance; new reads bind it and imported pending reads cannot save without a fresh read.

## Synthetic populations and private workspaces

`npm run workspace -- list` lists12cases/fourprofiles. `crm-populations1.0.0` preserves207470original bytes SHA256 `f07024931538e38b63645754b0913db7bc380ae97a851835b6f49e40ed623868`. Busy80contacts/64reads/48priorupdates/16pendingreads/48ordered audit events exercise real search and imported history. Other cases cover readonly/alternate targets, duplicate names and duplicate emails across accounts, another actor's change, no matching contact, hostile text, Unicode, maximum revision and no-op. Imported records are fictional; earlier model evidence, human authentication and real CRM delivery remain unknown. Fixture/profile/provenance/scoring labels stay outside business model observations.

```sh
npm run workspace -- inspect workspaces/demo/state.json
npm run workspace -- reset workspaces/demo/state.json workspaces/fresh/state.json
npm run datasets:check
```

Model-free init is exclusive with new directories0700/source+provenance0600, refusing source/metadata/mutex collisions. Reset requires a fresh distinct destination and preserves original source/mutex/evidence. Each managed read verifies pinned dataset bytes plus separate instance/seed provenance; missing/corrupt/foreign/stripped authority rejects without repair. Current valid edits stay distinct from seed hash. All new reads bind fresh UUID; imported pending null-instance reads must be reread before saving. Two exclusive files are not a multi-file transaction; partial initialization remains visible and needs a fresh destination. The unchanged original fixture remains a legacy unmanaged source.

## Actual native and browser execution

Same pinned Claude Agent SDK0.3.300 and bundled CLI execute the agent. An application-owned HTTP gateway captures original Anthropic SSE before releasing it to the SDK's eager tool loop. Full framing, message_stop, explicit completed finish, exact one tool ID/name/strict args or final text are required. A public PreToolUse hook checks that original identity again before the real SDK MCP callback forwards to the owned stdio worker. The SDK bridge exposes four tools only; private worker status/close controls are not model tools. No shell, file, arbitrary URL/JavaScript/API or other built-in tools are available. Verbatim prompts disable @file expansion/slash-command dispatch; settings/session persistence are disabled and CLI working/config directories are private and ephemeral in the run directory. The bundled CLI can include its own scratch-directory metadata; business observations exclude capture paths, source/provenance/scoring/permission tokens.

The actual upstream key stays in the parent's HTTP transport. The SDK receives a fresh local proxy credential; the browser worker receives only its separate portal operation scope. Native16prepared requests/4096requested output/disabled thinking/zero upstream retries/30-second HTTP/120-second default cooperative operation bounds apply (maximum300seconds). Request2MiB/decoded SSE1MiB and256retained SDK messages are bounded; limits are not OS memory/network isolation or remote billing cancellation. Original SSE is fully buffered before dispatch; no incremental browser tool authority is claimed. Raw usage retains unknown/invalid/zero distinctions and totals are not inferred. SDK normalized counters/cost remain separate; `costUsd` is unknown and `sdkReportedCostUsd` is not billing proof.

Each run owns actual SDK subprocesses, an inline SDK MCP bridge, a real stdio MCP client/worker, browser/context, HTTP pools and evidence. The public legacy MCP binding explicitly avoids negotiation probe siblings. Page JavaScript/service workers/downloads are disabled; foreign requests/redirects/WebSockets/popups/API paths reject. Redirects are followed only by the owned bounded local request path with scope, then the real final page is fulfilled into Chromium; saved source and original read/receipt are checked before success. Exact visible controls only, and any form/uncertain save error stops the run. SIGINT/SIGTERM/SIGHUP cancel and await cleanup. Server operation closure fences late writes before child cleanup; actual edits remain visible after a later failure. One-attempt failed cleanup stays unconfirmed.

Private UUID run directories (0700) contain atomic `trace.json` and nested browser receipts/real viewport PNGs (0600). Prepared/partial/failed native bytes/events/hashes/unknown fields/IDs/counters, SDK messages separately, actions, before/after source, exact decisions and cleanup are retained. No upstream key or scope credential is recorded. Final prose is separate from observed committed IDs/full before-after/no-op/current target. Prepared delivery is not acknowledgment. Do not blindly retry a failure after a save.

## Verification and remaining work

`npm run check:package` builds a portable complete source archive with an exact file/size/mode/hash manifest, extracts it outside checkout and installs fresh locked complete and production-only dependencies. It runs all73checks/deterministic authoring/all12 private CLI case operations, then normal installed symlink CLI with actual bundled SDK/native SSE/public hook/SDK bridge/stdio MCP/Chromium and real captures, mobile no-overflow, missing-key receipt and pending native SIGTERM drain. Delivered files and repeated portable USTAR/gzip bytes must remain unchanged. Source archive, qualification report and genuine synthetic browser PNGs go under ignored `dist/`; private source artifact creation grants no license/public release.


`npm test` now includes73checks and uses the actual bundled CLI and SDK against owned loopback HTTP, public SDK MCP/PreToolUse, actual stdio MCP and real Chromium/portal forms/captures. Source/native/browser/CLI checks cover current identity, concurrency, original unfinished output, readonly target enforcement, stale changes, source/usage/partial-effect/recording/cancellation/deadline/startup/close faults and all three real CLI signals. Controlled provider responses establish transport/application behavior, not live Claude decision quality or billing. All12 actual SDK/stdio/browser case paths and private CLI init/readback/reset checks pass locally. The local fresh complete/production-only gate passes; exact pushed Linux source artifact verification is recorded in the portfolio catalog/master ledger.

No real CRM/account/notification action exists. Live enabled model/key/budget/semantic+billing review, qualified new Firedrill persisted scenarios and publication/license stay parked. This private repository has no license. See [COMPATIBILITY.md](COMPATIBILITY.md) and the [portfolio catalog](https://github.com/firedrill-tools/firedrill-example-catalog).

## Current Firedrill integration

Released CLI/SDK 2.2.2, current command invocation, remote operator MCP and recovery are documented in [firedrill/README.md](firedrill/README.md). Offline checks preserve the actual portal/native key boundary and existing independent permissions. Authenticated persisted runs and live quality/cost remain separate parked gates.
