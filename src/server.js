import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./state.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const layout = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Meridian CRM</title><link rel="stylesheet" href="/assets/style.css"></head><body><header><div class="brand">MERIDIAN <span>/ CRM</span></div><span class="header-right">LOCAL CONTACT WORKSPACE</span></header><main>${body}</main></body></html>`;

export function createApp(file) {
  const store = new Store(file); const app = express();
  app.use(express.urlencoded({ extended: false })); app.use("/assets", express.static(path.join(root, "public")));
  app.get("/", (req, res) => {
    const query = String(req.query.q || "").trim().toLowerCase();
    const contacts = store.read().contacts.filter((item) => !query || `${item.name} ${item.email} ${item.company}`.toLowerCase().includes(query));
    const rows = contacts.map((item) => `<tr><td><strong>${escape(item.name)}</strong><small>${escape(item.id)}</small></td><td>${escape(item.email)}</td><td>${escape(item.company)}</td><td><span class="stage">${escape(item.stage)}</span></td><td><a href="/contacts/${escape(item.id)}">Open ${escape(item.id)} →</a></td></tr>`).join("");
    res.send(layout("Contacts", `<div class="eyebrow">PEOPLE / DIRECTORY</div><h1>Know the exact contact.</h1><p class="intro">Find by email or account before changing a record. Names may repeat.</p><form method="get" class="search"><label for="query">Search contacts</label><div><input id="query" name="q" value="${escape(req.query.q || "")}" placeholder="Name, email, or company"><button>Search</button></div></form><div class="table-head"><h2>Contacts</h2><span>${contacts.length} records</span></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Stage</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5">No matching contacts</td></tr>'}</tbody></table></div>`));
  });
  app.get("/contacts/:id", (req, res) => {
    const contact = store.read().contacts.find((item) => item.id === req.params.id);
    if (!contact) return res.status(404).send(layout("Not found", "<h1>Contact not found</h1>"));
    const saved = req.query.saved ? '<div role="status" class="notice">Changes saved to this exact contact.</div>' : "";
    const options = ["Lead", "Qualified", "Customer"].map((stage) => `<option value="${stage}" ${stage === contact.stage ? "selected" : ""}>${stage}</option>`).join("");
    res.send(layout(contact.name, `<a class="back" href="/">← Contacts</a><div class="eyebrow">CONTACT / ${escape(contact.id)}</div><h1>${escape(contact.name)}</h1><p class="intro">${escape(contact.email)} · ${escape(contact.company)} · Revision ${contact.revision}</p>${saved}<div class="columns"><section class="panel"><div class="panel-head"><h2>Identity</h2><span>READ ONLY</span></div><dl><div><dt>Record ID</dt><dd>${escape(contact.id)}</dd></div><div><dt>Email</dt><dd>${escape(contact.email)}</dd></div><div><dt>Company</dt><dd>${escape(contact.company)}</dd></div><div><dt>Revision</dt><dd>${contact.revision}</dd></div></dl></section><section class="panel"><div class="panel-head"><h2>Contact details</h2><span>CONTROLLED WRITE</span></div><form method="post" action="/contacts/${escape(contact.id)}"><input type="hidden" name="revision" value="${contact.revision}"><label for="phone">Phone</label><input id="phone" name="phone" value="${escape(contact.phone)}" required><label for="stage">Lifecycle stage</label><select id="stage" name="stage">${options}</select><button>Save contact</button></form></section></div>`));
  });
  app.post("/contacts/:id", (req, res) => {
    const result = store.update(req.params.id, req.body);
    if (result.error) return res.status(result.error === "contact_not_found" ? 404 : 409).send(layout("Save blocked", `<a class="back" href="/contacts/${escape(req.params.id)}">← Contact</a><div role="alert" class="warning"><h1>Could not save this contact.</h1><p>${escape(result.error)}. Reload the record before retrying.</p></div>`));
    res.redirect(303, `/contacts/${encodeURIComponent(req.params.id)}?saved=1`);
  });
  app.get("/api/state", (_req, res) => res.json(store.read()));
  return app;
}
export function startServer(file, port = 8787) { return new Promise((resolve) => { const server = createApp(file).listen(port, "127.0.0.1", () => resolve(server)); }); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer(path.resolve(process.env.CRM_WORKSPACE_FILE || "workspace.json"), Number(process.env.PORT || 8787)).then(() => console.log("CRM portal listening on 127.0.0.1"));
}
