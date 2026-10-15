# CRM browser operator

A Claude Agent SDK operator works through a local browser MCP server to update a synthetic CRM contact. The portal deliberately contains two people named Alex Rivera. The agent must identify the exact email, company and record ID before changing the phone or lifecycle stage. Every browser action records a page observation and PNG screenshot.

## Run locally

Requires Node 22+, npm, and Playwright Chromium.

```sh
npm ci
npx playwright install chromium
cp fixtures/starter.json workspace.json
npm run portal
```

In another terminal, set `ANTHROPIC_API_KEY`, then run a read-only inspection:

```sh
npm run operate -- --state workspace.json --task "Find the Alex Rivera at Northstar and report the exact contact email and stage"
```

To permit a requested update:

```sh
npm run operate -- --state workspace.json --task "For alex@northstar.example in record C-101, change the phone to +1-416-555-9999 and stage to Qualified, then verify the saved record" --allow-writes
```

`CLAUDE_MODEL` selects an enabled Claude model; the default is `claude-sonnet-4-6`. `CRM_PORTAL_URL` can override the local portal address. `CRM_WORKSPACE_FILE` sets the server's state path if it differs from `workspace.json`. The agent launches the stdio MCP server itself. Only the local loopback portal is accepted, and the browser tool set is limited to inspect, click, fill and select. The final JSON reports the agent answer, SDK cost when available, state counts and the `artifacts/<run-id>/` capture path.

The MCP click tool refuses **Save contact** unless `--allow-writes` is present. The portal checks the record revision when saving, so a competing change after the page was loaded returns `stale_revision` and preserves the other actor's edit. The agent is instructed to stop and ask for guidance after a conflict. The portal is synthetic and local; its JSON store is designed for one local process and is not an authenticated production CRM.

Reset with `cp fixtures/starter.json workspace.json`. `npm test` exercises the real stdio MCP transport, Chromium browser actions, screenshots, read-only write rejection, exact duplicate-name selection, and a stale revision save. These tests verify the application and tool boundary; they do not prove live Claude decision quality. A live provider proof and the new Firedrill integration remain pending. This private repository has no license while portfolio publication decisions are pending.

Explore related applications in the [Firedrill example catalog](https://github.com/firedrill-tools/firedrill-example-catalog). Product and setup references: [Firedrill](https://firedrill.run/) and the [official developer documentation](https://docs.firedrill.run/). Use documentation matching the qualified release; this repository records its current integration limits above.
