import express, { Response } from 'express';
import { getPool } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';
import { requireProductAccess } from '../authz/access.js';
import { toSafeClientError } from '../errors/httpError.js';
import { reconcile, listIssues, evidenceForIssue, answerQuestion, resolutionImpact } from '../intelligence/issues.js';
import { askConversational, createSignals, deliverAlertEmails, syncCustomerIdentities, customerToken } from '../intelligence/advanced.js';
import { logger } from '../logging/logger.js';
const router = express.Router();
router.use(authenticateUser as any);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function period(value: unknown): number { const n=Number(value||30); return Number.isInteger(n)&&n>=7&&n<=365?n:30; }
function product(req: AuthenticatedRequest):string {return typeof req.query.product_id==='string'?req.query.product_id:'';}
function fail(res:Response, err:unknown) { logger.error('Issue intelligence API', {error:err instanceof Error?err.message:'unknown'}); const safe=toSafeClientError(err);return res.status(safe.status).json(safe.body); }
router.get('/issues', async (req:AuthenticatedRequest,res:Response)=>{
  const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
  try {const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const issues=await listIssues(pool,id,period(req.query.days));return res.json({issues,count:issues.length,note:'Reconcile to link new feedback. Clusters are approximate.'});}
  catch(e){return fail(res,e);}
});
router.post('/reconcile',async(req:AuthenticatedRequest,res:Response)=>{
  const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
  try {const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');const result=await reconcile(pool,id,300);await createSignals(pool,id);await syncCustomerIdentities(pool,id);await deliverAlertEmails(pool,id);return res.json(result);}
  catch(e){return fail(res,e);}
});
router.get('/issues/:id/evidence',async(req:AuthenticatedRequest,res:Response)=>{
  const id=product(req),issueId=String(req.params.id);
  if(!uuid.test(id)||!uuid.test(issueId))return res.status(400).json({error:'Valid IDs required'});
  try {const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');
    const owner=await pool.query('SELECT 1 FROM intelligence_issues WHERE id=$1 AND product_id=$2',[issueId,id]);if(!owner.rowCount)return res.status(404).json({error:'Issue not found'});
    return res.json({evidence:await evidenceForIssue(pool,id,issueId)});
  }catch(e){return fail(res,e);}
});
router.patch('/issues/:id',async(req:AuthenticatedRequest,res:Response)=>{
  const id=product(req),issueId=String(req.params.id);
  if(!uuid.test(id)||!uuid.test(issueId))return res.status(400).json({error:'Valid IDs required'});
  const body=req.body||{};
  const allowed=['status','assignee','due_at','resolution_notes','priority'] as const;
  if(Object.keys(body).some(k=>!allowed.includes(k as typeof allowed[number])))return res.status(400).json({error:'Unknown issue field'});
  if(body.status!==undefined&&!['open','investigating','planned','resolved','dismissed'].includes(body.status))return res.status(400).json({error:'Invalid status'});
  if(body.priority!==undefined&&!['low','medium','high','critical'].includes(body.priority))return res.status(400).json({error:'Invalid priority'});
  if(body.assignee!==undefined&&body.assignee!==null&&(typeof body.assignee!=='string'||body.assignee.length>160))return res.status(400).json({error:'Invalid assignee'});
  if(body.resolution_notes!==undefined&&body.resolution_notes!==null&&(typeof body.resolution_notes!=='string'||body.resolution_notes.length>10000))return res.status(400).json({error:'Invalid resolution notes'});
  if(body.due_at!==undefined&&body.due_at!==null&&(typeof body.due_at!=='string'||Number.isNaN(Date.parse(body.due_at))))return res.status(400).json({error:'Invalid due date'});
  if(!Object.keys(body).length)return res.status(400).json({error:'No fields supplied'});
  try {const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');
    const client=await pool.connect();try {await client.query('BEGIN');
      const fields=allowed.filter(key=>Object.prototype.hasOwnProperty.call(body,key));
      const params=fields.map(key=>body[key]);
      const sets=fields.map((field,index)=>`${field}=$${index+1}`);
      if(fields.includes('status'))sets.push(`resolved_at=CASE WHEN $${fields.indexOf('status')+1}::text='resolved' THEN NOW() ELSE NULL END`);
      const result=await client.query(`UPDATE intelligence_issues SET ${sets.join(',')},updated_at=NOW() WHERE product_id=$${params.length+1} AND id=$${params.length+2} RETURNING *`,[...params,id,issueId]);
      if(!result.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Issue not found'});}
      await client.query(`INSERT INTO intelligence_issue_events(issue_id,actor_id,event_type,details) VALUES($1,$2,'updated',$3::jsonb)`,[issueId,req.user!.id,JSON.stringify(body)]);
      await client.query('COMMIT');return res.json({issue:result.rows[0]});
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }catch(e){return fail(res,e);}
});
router.get('/issues/:id/history',async(req:AuthenticatedRequest,res:Response)=>{
  const id=product(req),issueId=String(req.params.id);
  if(!uuid.test(id)||!uuid.test(issueId))return res.status(400).json({error:'Valid IDs required'});
  try {const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');
    const result=await pool.query(`SELECT e.event_type,e.details,e.created_at FROM intelligence_issue_events e JOIN intelligence_issues i ON i.id=e.issue_id WHERE e.issue_id=$1 AND i.product_id=$2 ORDER BY e.created_at DESC LIMIT 100`,[issueId,id]);return res.json({events:result.rows});
  }catch(e){return fail(res,e);}
});
router.post('/ask',async(req:AuthenticatedRequest,res:Response)=>{
  const id=product(req),question=req.body?.question;
  if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
  if(typeof question!=='string'||question.trim().length<3||question.length>500)return res.status(400).json({error:'Question must be 3-500 characters'});
  try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');return res.json(await answerQuestion(pool,id,question,period(req.body?.days)));}
  catch(e){return fail(res,e);}
});
router.get('/issues/:id/impact',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),issueId=String(req.params.id);if(!uuid.test(id)||!uuid.test(issueId))return res.status(400).json({error:'Invalid IDs'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const impact=await resolutionImpact(pool,id,issueId,period(req.query.days));return impact?res.json({impact}):res.status(404).json({error:'Issue not found'});}catch(e){return fail(res,e);}
});
router.post('/conversations',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),question=req.body?.question,conversationId=req.body?.conversation_id;
 if(!uuid.test(id)||typeof question!=='string'||question.trim().length<3||question.length>500||conversationId!==undefined&&!uuid.test(conversationId))return res.status(400).json({error:'Invalid question or IDs'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');return res.json(await askConversational(pool,id,req.user!.id,question,conversationId));}catch(e){return fail(res,e);}
});
router.get('/conversations',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const results=await pool.query('SELECT id,title,created_at FROM intelligence_conversations WHERE product_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 50',[id,req.user!.id]);return res.json({conversations:results.rows});}catch(e){return fail(res,e);}
});
router.get('/conversations/:id',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),chatId=String(req.params.id);if(!uuid.test(id)||!uuid.test(chatId))return res.status(400).json({error:'Invalid IDs'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const result=await pool.query(`SELECT m.role,m.content,m.citations,m.created_at FROM intelligence_messages m JOIN intelligence_conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.product_id=$2 AND c.user_id=$3 ORDER BY m.created_at LIMIT 100`,[chatId,id,req.user!.id]);return res.json({messages:result.rows});}catch(e){return fail(res,e);}
});
router.get('/notifications',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const result=await pool.query('SELECT id,issue_id,kind,title,seen_at,created_at FROM intelligence_notifications WHERE product_id=$1 ORDER BY created_at DESC LIMIT 100',[id]);return res.json({notifications:result.rows});}catch(e){return fail(res,e);}
});
router.patch('/notifications/:id',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),nid=String(req.params.id);if(!uuid.test(id)||!uuid.test(nid))return res.status(400).json({error:'Invalid IDs'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');await pool.query('UPDATE intelligence_notifications SET seen_at=now() WHERE id=$1 AND product_id=$2',[nid,id]);return res.json({ok:true});}catch(e){return fail(res,e);}
});
router.get('/preferences',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const result=await pool.query('SELECT email_enabled,recipient_email FROM intelligence_alert_preferences WHERE product_id=$1',[id]);return res.json({preferences:result.rows[0]||{email_enabled:false,recipient_email:null}});}catch(e){return fail(res,e);}
});
router.patch('/preferences',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),enabled=req.body?.email_enabled,email=req.body?.recipient_email;
 if(!uuid.test(id)||typeof enabled!=='boolean'||(email!==null&&email!==undefined&&(typeof email!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))))return res.status(400).json({error:'Invalid settings'});
 if(enabled&&!email)return res.status(400).json({error:'Recipient email required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');await pool.query(`INSERT INTO intelligence_alert_preferences(product_id,email_enabled,recipient_email) VALUES($1,$2,$3)
 ON CONFLICT(product_id) DO UPDATE SET email_enabled=excluded.email_enabled,recipient_email=excluded.recipient_email,updated_at=now()`,[id,enabled,email||null]);return res.json({ok:true});}catch(e){return fail(res,e);}
});
router.get('/customers',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const result=await pool.query(`SELECT customer_token,COUNT(*)::int feedback_count,MIN(created_at) first_seen,MAX(created_at) last_seen
 FROM intelligence_customer_identities WHERE product_id=$1 GROUP BY customer_token ORDER BY COUNT(*) DESC LIMIT 100`,[id]);return res.json({customers:result.rows,privacy:'Pseudonymous customer tokens; original emails are not exposed.'});}catch(e){return fail(res,e);}
});
router.delete('/customers',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),email=req.body?.email;if(!uuid.test(id)||typeof email!=='string'||email.length>254)return res.status(400).json({error:'Valid product and customer email required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');const token=customerToken(id,email);
 await pool.query('INSERT INTO intelligence_customer_optouts(product_id,customer_token) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,token]);const result=await pool.query('DELETE FROM intelligence_customer_identities WHERE product_id=$1 AND customer_token=$2',[id,token]);return res.json({unlinked:result.rowCount,note:'Removes intelligence identity associations only; source feedback retention is governed by existing policies.'});}catch(e){return fail(res,e);}
});
router.post('/alerts/refresh',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');const signals=await createSignals(pool,id);const email=await deliverAlertEmails(pool,id);return res.json({...signals,...email});}catch(e){return fail(res,e);}
});
router.get('/alerts',async(req:AuthenticatedRequest,res:Response)=>{
  const id=product(req);if(!uuid.test(id))return res.status(400).json({error:'Valid product_id required'});
  try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'analytics:read');const issues=await listIssues(pool,id,period(req.query.days));return res.json({alerts:issues.filter(i=>i.status!=='resolved'&&i.status!=='dismissed'&&(i.trend==='emerging'||i.high_priority_count>0||!!(i.due_at&&new Date(i.due_at).getTime()<Date.now()))).map(i=>({issue_id:i.id,title:i.title,severity:i.severity,trend:i.trend,evidence_ids:i.evidence_ids.slice(0,10),reason:i.due_at&&new Date(i.due_at).getTime()<Date.now()?'overdue action':i.trend==='emerging'?'emerging feedback spike':'high priority feedback'})).slice(0,50),delivery:'in_app_only'});}
  catch(e){return fail(res,e);}
});

router.post('/issues/:id/merge',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),source=String(req.params.id),target=req.body?.target_issue_id;
 if(!uuid.test(id)||!uuid.test(source)||!uuid.test(target)||source===target)return res.status(400).json({error:'Valid distinct issue IDs required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`issues:${id}`]);
 const owned=await client.query('SELECT id FROM intelligence_issues WHERE product_id=$1 AND id=ANY($2::uuid[]) AND merged_into IS NULL FOR UPDATE',[id,[source,target]]);
 if(owned.rowCount!==2){await client.query('ROLLBACK');return res.status(404).json({error:'Issue not found'});}
 await client.query(`DELETE FROM intelligence_issue_evidence WHERE issue_id=$1 AND feedback_id IN(SELECT feedback_id FROM intelligence_issue_evidence WHERE issue_id=$2)`,[source,target]);
 await client.query('UPDATE intelligence_issue_evidence SET issue_id=$2 WHERE issue_id=$1',[source,target]);
 await client.query('UPDATE intelligence_issues SET merged_into=$2,updated_at=now() WHERE id=$1',[source,target]);
 await client.query(`INSERT INTO intelligence_issue_events(issue_id,actor_id,event_type,details) VALUES($1,$2,'merged',$3::jsonb)`,[target,req.user!.id,JSON.stringify({source})]);
 await client.query('COMMIT');return res.json({ok:true});
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){return fail(res,e);}
});
router.post('/issues/:id/split',async(req:AuthenticatedRequest,res:Response)=>{
 const id=product(req),source=String(req.params.id),feedbackId=req.body?.feedback_id;
 if(!uuid.test(id)||!uuid.test(source)||!uuid.test(feedbackId))return res.status(400).json({error:'Valid IDs required'});
 try{const pool=getPool();await requireProductAccess(pool,req.user!.id,id,'settings:update');const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`issues:${id}`]);
 const selected=await client.query(`SELECT f.feedback,f.category_name,f.created_at FROM intelligence_issue_evidence ev JOIN intelligence_issues i ON i.id=ev.issue_id JOIN feedbacks f ON f.id=ev.feedback_id WHERE ev.issue_id=$1 AND i.product_id=$2 AND ev.feedback_id=$3 AND i.merged_into IS NULL`,[source,id,feedbackId]);
 if(!selected.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Feedback not linked to this issue'});}
 const row=selected.rows[0];const created=await client.query(`INSERT INTO intelligence_issues(product_id,title,category,fingerprint,first_seen,last_seen) VALUES($1,$2,$3,$4,$5,$5) RETURNING id`,[id,String(row.feedback).slice(0,160),String(row.category_name||'uncategorized').toLowerCase(),`split:${feedbackId}`,row.created_at]);
 const target=created.rows[0].id;await client.query('UPDATE intelligence_issue_evidence SET issue_id=$1 WHERE issue_id=$2 AND feedback_id=$3',[target,source,feedbackId]);
 await client.query(`INSERT INTO intelligence_issue_events(issue_id,actor_id,event_type,details) VALUES($1,$2,'split',$3::jsonb)`,[target,req.user!.id,JSON.stringify({source,feedback_id:feedbackId})]);
 await client.query('COMMIT');return res.json({issue_id:target});
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){return fail(res,e);}
});

export default router;
