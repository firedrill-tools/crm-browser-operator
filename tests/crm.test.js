import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Store } from "../src/state.js";
import { startServer } from "../src/server.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function setup() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-browser-")); const file = path.join(dir, "state.json"); fs.copyFileSync(path.join(root, "fixtures/starter.json"), file); return { dir, file, store: new Store(file) }; }
async function connect(baseUrl,captures,allowWrites,file,id='C-101'){
 const {BrowserMCP}=await import('../src/browser-mcp.js'),{Receipt}=await import('../src/evidence.js'),{hash,same}=await import('../src/schema.js');
 const store=new Store(file),contact=store.read().contacts.find(c=>c.id===id),registered=store.registerOperation(hash('explicit synthetic browser check'),allowWrites,allowWrites?{id:contact.id,email:contact.email,company:contact.company}:null),controller=new AbortController(),receipt=new Receipt(captures,{lifecycle:{browserClosed:false,contextClosed:false,mcpAllocated:false,mcpClosed:false}});
 const owner={portal:registered,receipt,signal:controller.signal,deadline:performance.now()+30000,basicGuard(){this.signal.throwIfAborted();},async guard(){this.basicGuard();const snap=store.snapshot();assert.ok(same(store.operation(snap.state,registered.credential),registered.operation));return{state:snap.state,sha256:snap.digest};}};owner.portal.scope=registered.operation;
 const session=await new BrowserMCP(owner,store.file,baseUrl,path.dirname(receipt.path)).open();return{client:session.client,call:async(name,args={})=>(await session.execute('mcp__browser__'+name,args)).observation,close:async()=>{store.closeOperation(registered.credential);await session.close();assert.ok(receipt.data.lifecycle.mcpClosed);assert.ok(receipt.data.lifecycle.browserClosed);assert.ok(session.workerReceipt.observations.every(o=>fs.existsSync(o.screenshot)));}};
}
function update(store,id,input){const {read}=store.observeContact(id);return store.update(id,{...input,read_id:read.id,read_sha256:read.content_sha256});}

test("duplicate names require exact email and stale revisions reject competing changes", t => {
  const { store,dir } = setup();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const names = store.read().contacts.filter((item) => item.name === "Alex Rivera");
  assert.equal(names.length, 2);
  assert.notEqual(names[0].email, names[1].email);
  const actor = update(store,"C-102", { revision: 1, phone: "+1-416-555-7777", stage: "Customer" });
  assert.equal(actor.contact.revision, 2);
  assert.equal(update(store,"C-102", { revision: 1, phone: "+1-416-555-8888", stage: "Lead" }).error, "stale_revision");
  assert.equal(store.read().contacts[1].phone, "+1-416-555-7777");
});

test("browser MCP performs real actions, captures pages, and blocks writes without authorization", async t => {
  const { dir, file, store } = setup();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const server = await startServer(file, 0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const readOnly = await connect(baseUrl, path.join(dir, "readonly"), false,file);
    try {
      assert.deepEqual((await readOnly.client.listTools()).tools.filter(t=>!t.name.startsWith('_')).map((item) => item.name).sort(), ["click", "fill", "inspect", "select"]);
      assert.match((await readOnly.call("inspect")).text, /alex@northstar\.example/);
      await readOnly.call("click", { role: "link", name: "Open C-101 →" });
      await assert.rejects(readOnly.call("click", { role: "button", name: "Save contact" }),/writes_not_authorized/);
      assert.equal(store.read().contacts[0].revision, 1);
    } finally { await readOnly.close(); }

    const writable = await connect(baseUrl, path.join(dir, "writable"), true,file);
    try {
      await writable.call("inspect");
      await writable.call("click", { role: "link", name: "Open C-101 →" });
      await writable.call("fill", { label: "Phone", value: "+1-416-555-9999" });
      await writable.call("select", { label: "Lifecycle stage", option: "Qualified" });
      const saved = await writable.call("click", { role: "button", name: "Save contact" });
      assert.match(saved.text, /Changes saved to this exact contact/);
      assert.match(saved.text, /alex@northstar\.example/);
      assert.equal(store.read().contacts[0].stage, "Qualified");
      assert.equal(store.read().contacts[1].stage, "Customer");
      assert.equal(store.read().audit.length,1);

    } finally { await writable.close(); }
    const competing=await connect(baseUrl,path.join(dir,'competing'),true,file,'C-102');
    try{await competing.call('inspect');await competing.call('click',{role:'link',name:'Open C-102 →'});update(store,'C-102',{revision:1,phone:'+1-416-555-7777',stage:'Customer'});await competing.call('fill',{label:'Phone',value:'+1-416-555-8888'});await assert.rejects(competing.call('click',{role:'button',name:'Save contact'}),/stale_revision/);assert.equal(store.read().contacts[1].phone,'+1-416-555-7777');}finally{await competing.close();}
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
