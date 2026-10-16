/** Private application stdio worker. The model sees only the parent's four tools. */
import fs from 'node:fs';
import path from 'node:path';
import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio,StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import {z} from 'zod';
import {Store} from './state.js';
import {same,hash} from './schema.js';
import {Receipt,errorInfo} from './evidence.js';
import {portalOrigin} from './portal.js';
import {BrowserSession} from './browser.js';
import {argumentsFor} from './native-stream.js';
const file=process.env.CRM_OWNED_STATE,credential=process.env.CRM_OWNED_CREDENTIAL,root=process.env.CRM_OWNED_OUTPUT,origin=portalOrigin(process.env.CRM_OWNED_PORTAL),timeoutMs=Number(process.env.CRM_OWNED_TIMEOUT_MS);
if(!file||!root||!/^[a-f0-9]{64}$/.test(credential??'')||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error('private worker configuration required');
const store=new Store(file),scope=store.operation(store.read(),credential),controller=new AbortController(),receipt=new Receipt(path.join(root,'browser'),{operation:scope,observations:[],lifecycle:{browserAllocated:false,contextAllocated:false,browserClosed:false,contextClosed:false}}),owner={receipt,signal:controller.signal,deadline:performance.now()+timeoutMs,allowWrites:scope.allow_writes,portal:{scope,credential},failure:null,
 basicGuard(){if(this.failure)throw this.failure;if(this.receipt.recordingError)throw this.receipt.recordingError;this.signal.throwIfAborted();if(performance.now()>=this.deadline)throw Error('browser operation deadline exceeded');},
 async guard(){this.basicGuard();const s=store.snapshot(),current=store.operation(s.state,credential);if(!same(current,scope))throw Error('browser operation authority changed');return{state:s.state,sha256:s.digest};},
 fail(e){this.failure??=e;controller.abort(e);}
};
let browser,active=null,cleanupPromise,closing=false,handle;
const timer=setTimeout(()=>owner.fail(Error('browser operation deadline exceeded')),timeoutMs);
const result=(value,error=false)=>({content:[{type:'text',text:JSON.stringify(value)}],isError:error});
async function session(){if(!browser){browser=new BrowserSession(origin,path.dirname(receipt.path),owner);await browser.open();}return browser;}
async function finish(){
 if(cleanupPromise)return cleanupPromise;closing=true;cleanupPromise=(async()=>{
  clearTimeout(timer);controller.abort(Error('browser worker cleanup'));
  let failure=owner.failure;
  if(browser)try{if(!browser.closeAttempted)await browser.close();else await browser.cancelPromise;if(!browser.closed)throw Error('browser cleanup unconfirmed');}catch(e){failure??=e;}
  else{receipt.data.lifecycle.browserClosed=true;receipt.data.lifecycle.contextClosed=true;}
  if(active)await active.catch(()=>{});failure??=owner.failure;receipt.data.status=failure?'failed':'completed';receipt.data.error=failure?errorInfo(failure):null;receipt.data.finishedAt=new Date().toISOString();receipt.data.cleanupConfirmed=receipt.data.lifecycle.browserClosed&&receipt.data.lifecycle.contextClosed;
  try{receipt.save();}catch(e){receipt.data.durableStatus='unknown';throw e;}
  return{closed:true,cleanupConfirmed:receipt.data.cleanupConfirmed,receiptPath:receipt.path,receiptSha256:hash(fs.readFileSync(receipt.path)),runId:receipt.data.runId};
 })();return cleanupPromise;
}
const server=new McpServer({name:'owned-synthetic-crm-browser',version:'0.2.0'});
for(const [full,schema]of Object.entries(argumentsFor)){
 const name=full.replace('mcp__browser__','');server.registerTool(name,{description:`Perform the exact visible local CRM browser ${name}.`,inputSchema:schema},async args=>{
  if(closing||active)return result({error:'browser worker is closing or already executing'},true);
  const work=(async()=>{let action;try{owner.basicGuard();schema.parse(args);action={number:receipt.data.actions.length+1,name:full,args:structuredClone(args),status:'prepared'};receipt.data.actions.push(action);owner.activeAction=action;receipt.save();const page=await session(),observation=await page.execute(full,args);action.status='finished';action.observation=observation;owner.activeAction=null;receipt.save();return result({observation,workerActionNumber:action.number});}catch(e){if(action){action.status='failed';action.error=errorInfo(e);if(e.observation)action.observation=e.observation;}owner.fail(e);try{receipt.save();}catch{}return result({error:e.message,observation:e.observation??null,workerActionNumber:action?.number??null},true);}})();active=work;try{return await work;}finally{active=null;}
 });
}
server.registerTool('_status',{description:'Private application session status; not exposed by the SDK bridge.',inputSchema:z.strictObject({})},async()=>result({receiptPath:receipt.path,runId:receipt.data.runId,scopeId:scope.id}));
server.registerTool('_close',{description:'Private application cleanup; not exposed by the SDK bridge.',inputSchema:z.strictObject({})},async()=>{try{return result(await finish());}catch(e){return result({error:e.message,cleanupConfirmed:false},true);}});
const transport=new StdioServerTransport(process.stdin,process.stdout,{maxBufferSize:2*1024*1024});transport.onclose=()=>{void finish().catch(()=>{process.exitCode=1;});};
handle=serveStdio(()=>server,{transport,onerror:e=>{owner.fail(e);}});
for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.once(signal,()=>{void finish().then(()=>handle.close()).catch(()=>{process.exitCode=1;});});
