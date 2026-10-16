import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {readSource,saveSource} from './source.js';
import {identifier,digest,revision,phone,stage,targetSchema,source,same,hash,readHash,matches} from './schema.js';
const inputSchema=z.strictObject({read_id:z.string().uuid(),read_sha256:digest,revision,phone,stage});
const error=message=>({error:message});
export class Store{
 constructor(file){const s=readSource(file);this.file=fs.realpathSync(file);this.instance=s.state.instance_id??null;this.provenance=s.state.dataset??null;this.lock=path.join(path.dirname(this.file),`.${path.basename(this.file)}.crm-lock.sqlite`);}
 snapshot(){const s=readSource(this.file);if((s.state.instance_id??null)!==this.instance||!same(s.state.dataset??null,this.provenance))throw Error('workspace instance changed');return s;}
 read(){return this.snapshot().state;}
 transaction(fn){
  if(fs.existsSync(this.lock)&&(!fs.lstatSync(this.lock).isFile()||fs.lstatSync(this.lock).isSymbolicLink()))throw Error('invalid workspace mutex');try{fs.closeSync(fs.openSync(this.lock,'wx',0o600));}catch(e){if(e.code!=='EEXIST')throw e;}
  const db=new DatabaseSync(this.lock);try{db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');const prior=this.snapshot(),{result,dirty}=fn(prior.state);if(dirty)saveSource(this.file,prior.state,prior);db.exec('COMMIT');return structuredClone(result);}catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}finally{db.close();}
 }
 operation(state,credential,allowClosed=false){if(credential===null)return null;if(typeof credential!=='string'||!/^[a-f0-9]{64}$/.test(credential))throw Error('unknown_operation');const op=(state.operations??[]).find(o=>o.credential_sha256===hash(credential));if(!op)throw Error('unknown_operation');if(op.status!=='active'&&!allowClosed)throw Error('operation_closed');return op;}
 registerOperation(taskHash,allowWrites,target=null){
  digest.parse(taskHash);if(typeof allowWrites!=='boolean')throw Error('allowWrites must be a boolean');if(allowWrites)target=targetSchema.parse(target);else if(target!==null)throw Error('read-only operation cannot claim a write target');
  return this.transaction(state=>{if(target&&!state.contacts.some(c=>matches(c,target)))throw Error('exact_target_not_found');const credential=randomBytes(32).toString('hex'),operation={id:randomUUID(),credential_sha256:hash(credential),task_sha256:taskHash,allow_writes:allowWrites,target:structuredClone(target),status:'active'};(state.operations??=[]).push(operation);return{result:{credential,operation},dirty:true};});
 }
 closeOperation(credential){return this.transaction(state=>{const op=this.operation(state,credential);if(!op)throw Error('operator credential required');op.status='closed';return{result:{operation:op},dirty:true};});}
 observeContact(id,credential=null){
  if(!identifier.safeParse(id).success)return error('invalid_contact_id');
  return this.transaction(state=>{const op=this.operation(state,credential),contact=state.contacts.find(c=>c.id===id);if(!contact)return{result:error('contact_not_found'),dirty:false};const read={id:randomUUID(),source:source(state,contact),scope:{kind:op?'operator':'synthetic_human',operation_id:op?.id??null,task_sha256:op?.task_sha256??null,allow_writes:op?.allow_writes??true,target:op?.target??null},content_sha256:'',status:'observed',decision:null};read.content_sha256=readHash(read);(state.reads??=[]).push(read);return{result:{contact,read},dirty:true};});
 }
 update(id,input,credential=null){
  if(!identifier.safeParse(id).success||!inputSchema.safeParse(input).success)return error('invalid_update_arguments');
  return this.transaction(state=>{
   const op=this.operation(state,credential),contact=state.contacts.find(c=>c.id===id),read=state.reads?.find(r=>r.id===input.read_id);
   const reason=!contact?'contact_not_found':!read||read.source.contact.id!==id?'observed_read_required':read.content_sha256!==input.read_sha256?'read_hash_changed':read.status!=='observed'?'read_already_used':op&&read.scope.operation_id!==op.id?'read_not_owned':op&&(!op.allow_writes||!read.scope.allow_writes||!matches(contact,op.target))?'writes_not_authorized':input.revision!==read.source.contact.revision||contact.revision!==input.revision?'stale_revision':!same(read.source,source(state,contact))?'contact_changed':null;
   if(reason)return{result:error(reason),dirty:false};
   const unchanged=contact.phone===input.phone&&contact.stage===input.stage;if(!unchanged&&contact.revision===Number.MAX_SAFE_INTEGER)throw Error('revision_exhausted');
   const after={...contact,phone:input.phone,stage:input.stage,revision:unchanged?contact.revision:contact.revision+1};read.status=unchanged?'unchanged':'applied';read.decision={actor_kind:op?'operator':'synthetic_human',operation_id:op?.id??null,task_sha256:op?.task_sha256??null,read_sha256:read.content_sha256,source:structuredClone(read.source),after:structuredClone(after)};
   if(!unchanged){Object.assign(contact,after);state.audit.push({action:'update_contact',id,read_id:read.id,read_sha256:read.content_sha256,before:structuredClone(read.source.contact),after:structuredClone(after),revision:after.revision});}
   return{result:{contact,read_id:read.id,unchanged},dirty:true};
  });
 }
}
