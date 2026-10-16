import {z} from 'zod';
import {createHash} from 'node:crypto';
import {DATASET_SHA256} from './_dataset-manifest.js';
export const utc=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/).refine(v=>{const d=new Date(v);return Number.isFinite(d.valueOf())&&d.toISOString().replace('.000Z','Z')===v.replace('.000Z','Z');},'valid exact UTC instant required');
export const identifier=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/),digest=z.string().regex(/^[a-f0-9]{64}$/),revision=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const line=max=>z.string().min(1).max(max).refine(v=>!!v.trim()&&v.isWellFormed()&&!/[\x00-\x1f\x7f]/.test(v));
export const email=z.string().min(3).max(254).regex(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.example$/).refine(v=>{const local=v.split('@')[0];return local.length<=64&&!local.startsWith('.')&&!local.endsWith('.')&&!local.includes('..');});
export const phone=z.string().regex(/^\+?[0-9][0-9-]{6,19}$/),stage=z.enum(['Lead','Qualified','Customer']);
export const contactSchema=z.strictObject({id:identifier,name:line(160),email,company:line(160),phone,stage,revision});
export const targetSchema=z.strictObject({id:identifier,email,company:line(160)});
export const sourceSchema=z.strictObject({instance_id:z.string().uuid().nullable(),contact:contactSchema});
export const scopeSchema=z.strictObject({kind:z.enum(['operator','synthetic_human']),operation_id:z.string().uuid().nullable(),task_sha256:digest.nullable(),allow_writes:z.boolean(),target:targetSchema.nullable()});
const operationSchema=z.strictObject({id:z.string().uuid(),credential_sha256:digest,task_sha256:digest,allow_writes:z.boolean(),target:targetSchema.nullable(),status:z.enum(['active','closed'])});
const decisionSchema=z.strictObject({actor_kind:z.enum(['operator','synthetic_human']),operation_id:z.string().uuid().nullable(),task_sha256:digest.nullable(),read_sha256:digest,source:sourceSchema,after:contactSchema});
const readSchema=z.strictObject({id:z.string().uuid(),source:sourceSchema,scope:scopeSchema,content_sha256:digest,status:z.enum(['observed','applied','unchanged']),decision:decisionSchema.nullable()});
const auditSchema=z.strictObject({action:z.literal('update_contact'),id:identifier,read_id:z.string().uuid(),read_sha256:digest,before:contactSchema,after:contactSchema,revision});
export const stateSchema=z.strictObject({synthetic:z.literal(true),version:z.literal(1),instance_id:z.string().uuid().optional(),dataset:z.strictObject({id:z.literal('crm-populations'),version:z.literal('1.0.0'),case_id:identifier,source_sha256:z.literal(DATASET_SHA256)}).optional(),contacts:z.array(contactSchema).min(1).max(2000),operations:z.array(operationSchema).max(512).optional(),reads:z.array(readSchema).max(4000).optional(),audit:z.array(auditSchema).max(8000)});
export const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v!==null&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
export const hash=v=>createHash('sha256').update(v).digest('hex'),same=(a,b)=>canonical(a)===canonical(b),source=(state,contact)=>structuredClone({instance_id:state.instance_id??null,contact});
export const readHash=r=>hash(canonical({id:r.id,source:r.source,scope:r.scope}));
export const matches=(contact,target)=>!!contact&&!!target&&contact.id===target.id&&contact.email===target.email&&contact.company===target.company;
const identity=c=>({id:c.id,name:c.name,email:c.email,company:c.company});
function unique(values,name){if(new Set(values).size!==values.length)throw Error(`duplicate ${name}`);}
export function validateState(value){
 const state=stateSchema.parse(value);if(state.dataset&&!state.instance_id)throw Error('managed source requires a private instance');const contacts=new Map(state.contacts.map(c=>[c.id,c])),ops=new Map((state.operations??[]).map(o=>[o.id,o])),reads=new Map((state.reads??[]).map(r=>[r.id,r]));
 unique(state.contacts.map(c=>c.id),'contact ID');unique((state.operations??[]).map(o=>o.id),'operation ID');unique((state.operations??[]).map(o=>o.credential_sha256),'operation credential');unique((state.reads??[]).map(r=>r.id),'observed read ID');unique(state.audit.map(a=>a.read_id),'applied read audit');
 for(const op of ops.values())if(op.allow_writes?!op.target:op.target!==null)throw Error('write authority requires an exact structured target');
 for(const r of reads.values()){
  const contact=contacts.get(r.source.contact.id),scope=r.scope,op=ops.get(scope.operation_id);
  if(!contact||r.content_sha256!==readHash(r))throw Error('observed read differs from captured source/hash');
  if(r.source.instance_id!==null&&r.source.instance_id!==(state.instance_id??null)||scope.kind==='operator'&&r.source.instance_id!==(state.instance_id??null))throw Error('workspace instance changed in observed source');
  if(scope.kind==='operator'?!op||scope.task_sha256!==op.task_sha256||scope.allow_writes!==op.allow_writes||!same(scope.target,op.target):scope.operation_id!==null||scope.task_sha256!==null||scope.allow_writes!==true||scope.target!==null)throw Error('invalid observed read scope');
  const audits=state.audit.filter(a=>a.read_id===r.id);
  if(r.status==='observed'){if(r.decision!==null||audits.length)throw Error('observed read cannot claim a committed update');continue;}
  const d=r.decision,actor=ops.get(d?.operation_id);if(!d||d.read_sha256!==r.content_sha256||!same(d.source,r.source)||!same(identity(d.after),identity(r.source.contact)))throw Error('invalid exact CRM update decision');
  if(d.actor_kind==='operator'?!actor||d.operation_id!==scope.operation_id||d.task_sha256!==scope.task_sha256||!actor.allow_writes||!scope.allow_writes||!matches(r.source.contact,scope.target):d.operation_id!==null||d.task_sha256!==null)throw Error('CRM update lacked captured authority');
  if(r.status==='unchanged'){if(audits.length||!same(d.after,r.source.contact))throw Error('unchanged read cannot claim a mutation');}
  else if(audits.length!==1||r.source.contact.revision===Number.MAX_SAFE_INTEGER||d.after.revision!==r.source.contact.revision+1||d.after.phone===r.source.contact.phone&&d.after.stage===r.source.contact.stage||contact.revision<d.after.revision)throw Error('applied CRM history is inconsistent');
 }
 for(const a of state.audit){const r=reads.get(a.read_id);if(!contacts.has(a.id)||!r||r.status!=='applied'||a.id!==r.source.contact.id||a.read_sha256!==r.content_sha256||a.revision!==r.decision.after.revision||!same(a.before,r.source.contact)||!same(a.after,r.decision.after))throw Error('audit differs from exact authorized read/decision');}
 return state;
}
