import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

export class Store {
  constructor(file) { this.file = file; this.read(); }
  read() { const state = JSON.parse(fs.readFileSync(this.file, "utf8")); if (state.synthetic !== true || state.version !== 1) throw new Error("only synthetic CRM state is supported"); return state; }
  write(state) { const temp = path.join(path.dirname(this.file), `.crm-${crypto.randomUUID()}.tmp`); fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { flag: "wx", mode: 0o600 }); fs.renameSync(temp, this.file); }
  update(id, input) {
    const state = this.read(); const contact = state.contacts.find((item) => item.id === id);
    if (!contact) return { error: "contact_not_found" };
    if (Number(input.revision) !== contact.revision) return { error: "stale_revision" };
    const phone = String(input.phone || "").trim(); const stage = String(input.stage || "");
    if (!/^\+?[0-9-]{7,20}$/.test(phone)) return { error: "invalid_phone" };
    if (!["Lead", "Qualified", "Customer"].includes(stage)) return { error: "invalid_stage" };
    if (phone === contact.phone && stage === contact.stage) return { contact, unchanged: true };
    const before = { phone: contact.phone, stage: contact.stage };
    contact.phone = phone; contact.stage = stage; contact.revision++;
    state.audit.push({ action: "update_contact", id, before, after: { phone, stage }, revision: contact.revision });
    this.write(state);
    return { contact };
  }
}
