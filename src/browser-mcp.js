import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {parseJSON} from './json.js';
import {hash} from './schema.js';
export const minimalEnvironment=()=>Object.fromEntries(['PATH','HOME','TMPDIR','TMP','TEMP','USER','LOGNAME','LANG','LC_ALL','DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR','PLAYWRIGHT_BROWSERS_PATH','SystemRoot','WINDIR'].filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
async function within(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('MCP child did not close within cleanup budget')),ms);})]);}finally{clearTimeout(timer);}}
export class BrowserMCP{
 constructor(owner,file,origin,output){Object.assign(this,{owner,file,origin,output});this.closeAttempted=false;this.closed=false;this.connected=false;this.receiptPath=null;this.stderr='';this.exitObserved=false;this.pending=new Set();this.exited=new Promise(resolve=>this.resolveExit=resolve);}
 async open(){
  this.owner.basicGuard();this.client=new Client({name:'owned-crm-application',version:'0.2.0'},{versionNegotiation:{mode:'legacy'}});
  this.transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('./mcp-server.js',import.meta.url))],cwd:this.output,stderr:'pipe',maxBufferSize:2*1024*1024,env:{...minimalEnvironment(),CRM_OWNED_STATE:this.file,CRM_OWNED_PORTAL:this.origin,CRM_OWNED_OUTPUT:this.output,CRM_OWNED_CREDENTIAL:this.owner.portal.credential,CRM_OWNED_TIMEOUT_MS:String(Math.max(1,Math.ceil(this.owner.deadline-performance.now())))}});
  this.transport.onclose=()=>{this.exitObserved=true;this.resolveExit();};this.transport.stderr?.on('data',b=>{this.stderr=(this.stderr+b).slice(-65536);});
  await this.client.connect(this.transport,{signal:this.owner.signal,timeout:10000});this.connected=true;this.owner.receipt.data.lifecycle.mcpAllocated=true;this.owner.receipt.data.mcp={pid:this.transport.pid,protocol:'explicit legacy MCP binding using client/server2.3.1; no negotiation probe siblings'};const status=await this.call('_status',{});const prefix=path.resolve(this.output,'browser')+path.sep;if(typeof status.receiptPath!=='string'||!path.resolve(status.receiptPath).startsWith(prefix)||status.scopeId!==this.owner.portal.scope.id)throw Error('private worker returned foreign source/receipt');this.receiptPath=status.receiptPath;this.owner.receipt.data.mcp.receiptPath=this.receiptPath;this.owner.receipt.save();return this;
 }
 async call(name,args,{cleanup=false}={}){
  if(!cleanup)this.owner.basicGuard();const signal=cleanup?AbortSignal.timeout(5000):this.owner.signal,work=this.client.callTool({name,arguments:args},undefined,{signal,timeout:cleanup?5000:Math.max(1,Math.min(15000,Math.ceil(this.owner.deadline-performance.now()))),resetTimeoutOnProgress:false});this.pending.add(work);
  let response;try{response=await work;}finally{this.pending.delete(work);}if(!response||!Array.isArray(response.content)||response.content.length!==1||response.content[0].type!=='text')throw Error('unexpected browser MCP response');const value=parseJSON(response.content[0].text);if(response.isError)throw Object.assign(Error(value.error??'browser MCP operation failed'),{observation:value.observation??null});return value;
 }
 async execute(name,args){return this.call(name.replace('mcp__browser__',''),args);}
 async close(){
  if(this.closeAttempted)throw Error('browser MCP close already attempted');this.closeAttempted=true;const errors=[];
  if(this.connected){try{const closed=await this.call('_close',{}, {cleanup:true});if(!closed.closed||!closed.cleanupConfirmed||closed.receiptPath!==this.receiptPath)throw Error('browser worker cleanup unconfirmed');const stat=fs.lstatSync(this.receiptPath);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)throw Error('invalid private worker receipt');const raw=fs.readFileSync(this.receiptPath);if(hash(raw)!==closed.receiptSha256)throw Error('browser worker evidence changed after cleanup');this.workerReceipt=parseJSON(new TextDecoder('utf-8',{fatal:true}).decode(raw));this.owner.receipt.data.browserReceipt={path:this.receiptPath,sha256:hash(raw),data:this.workerReceipt};this.owner.receipt.data.lifecycle.browserClosed=this.workerReceipt.lifecycle.browserClosed;this.owner.receipt.data.lifecycle.contextClosed=this.workerReceipt.lifecycle.contextClosed;}catch(e){errors.push(e);}}
  else if(!this.transport){this.owner.receipt.data.lifecycle.browserClosed=true;this.owner.receipt.data.lifecycle.contextClosed=true;}
  try{if(this.client)await this.client.close();else if(this.transport)await this.transport.close();}catch(e){errors.push(e);}if(this.transport){try{await within(this.exited,5000);}catch(e){errors.push(e);}}this.owner.receipt.data.lifecycle.mcpClosed=!this.transport||this.exitObserved;await Promise.allSettled([...this.pending]);this.owner.receipt.data.mcpStderr=this.stderr;
  if(errors.length)throw errors[0];this.closed=true;
 }
}
