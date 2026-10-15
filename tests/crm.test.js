import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Store } from "../src/state.js";
import { startServer } from "../src/server.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function setup() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-browser-")); const file = path.join(dir, "state.json"); fs.copyFileSync(path.join(root, "fixtures/starter.json"), file); return { dir, file, store: new Store(file) }; }
async function connect(baseUrl, captures, allowWrites) {
  const client = new Client({ name: "offline-crm-test", version: "1.0.0" });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(root, "src/mcp-server.js"), "--portal-url", baseUrl, "--captures", captures, ...(allowWrites ? ["--allow-writes"] : [])] });
  await client.connect(transport);
  const call = async (name, args = {}) => client.callTool({ name, arguments: args });
  return { client, call };
}
const body = (result) => JSON.parse(result.content[0].text);

test("duplicate names require exact email and stale revisions reject competing changes", () => {
  const { store } = setup();
  const names = store.read().contacts.filter((item) => item.name === "Alex Rivera");
  assert.equal(names.length, 2);
  assert.notEqual(names[0].email, names[1].email);
  const actor = store.update("C-102", { revision: 1, phone: "+1-416-555-7777", stage: "Customer" });
  assert.equal(actor.contact.revision, 2);
  assert.equal(store.update("C-102", { revision: 1, phone: "+1-416-555-8888", stage: "Lead" }).error, "stale_revision");
  assert.equal(store.read().contacts[1].phone, "+1-416-555-7777");
});

test("browser MCP performs real actions, captures pages, and blocks writes without authorization", async () => {
  const { dir, file, store } = setup();
  const server = await startServer(file, 0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const readOnly = await connect(baseUrl, path.join(dir, "readonly"), false);
    try {
      assert.deepEqual((await readOnly.client.listTools()).tools.map((item) => item.name).sort(), ["click", "fill", "inspect", "select"]);
      assert.match(body(await readOnly.call("inspect")).text, /alex@northstar\.example/);
      await readOnly.call("click", { role: "link", name: "Open C-101 →" });
      await readOnly.call("fill", { label: "Phone", value: "+1-416-555-9999" });
      const blocked = await readOnly.call("click", { role: "button", name: "Save contact" });
      assert.equal(blocked.isError, true);
      assert.equal(body(blocked).error, "writes_not_authorized");
      assert.equal(store.read().contacts[0].revision, 1);
    } finally { await readOnly.client.close(); }

    const writable = await connect(baseUrl, path.join(dir, "writable"), true);
    try {
      await writable.call("inspect");
      await writable.call("click", { role: "link", name: "Open C-101 →" });
      await writable.call("fill", { label: "Phone", value: "+1-416-555-9999" });
      await writable.call("select", { label: "Lifecycle stage", option: "Qualified" });
      const saved = body(await writable.call("click", { role: "button", name: "Save contact" }));
      assert.match(saved.text, /Changes saved to this exact contact/);
      assert.match(saved.text, /alex@northstar\.example/);
      assert.equal(store.read().contacts[0].stage, "Qualified");
      assert.equal(store.read().contacts[1].stage, "Customer");
      assert.ok(fs.readdirSync(path.join(dir, "writable")).filter((name) => name.endsWith(".png")).length >= 5);

      await writable.call("click", { role: "link", name: "← Contacts" });
      await writable.call("click", { role: "link", name: "Open C-102 →" });
      store.update("C-102", { revision: 1, phone: "+1-416-555-7777", stage: "Customer" });
      await writable.call("fill", { label: "Phone", value: "+1-416-555-8888" });
      const stale = body(await writable.call("click", { role: "button", name: "Save contact" }));
      assert.match(stale.text, /stale_revision/);
      assert.equal(store.read().contacts[1].phone, "+1-416-555-7777");
    } finally { await writable.client.close(); }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
