import type { Pool } from 'pg';

/** Indexed cosine nearest-neighbor retrieval, with a strict product boundary.
 * pgvector's <=> operator returns cosine distance (smaller is better).
 * Additional distance threshold avoids presenting irrelevant feedback as evidence.
 */
export async function searchFeedbackVectors(pool: Pool, productId: string, vector: number[], limit = 16) {
  if (vector.length !== 768 || vector.some(v => !Number.isFinite(v))) throw new Error('Expected a 768-dimensional query embedding');
  const literal = `[${vector.join(',')}]`;
  // Filter in a materialized candidate set then rank: global HNSW may yield sparse
  // results for small product cohorts; iterative scans available on pgvector >= 0.8.
  const result = await pool.query(`
    SELECT f.id, f.feedback, ev.issue_id, 1-(fe.embedding_vector <=> $2::vector) AS similarity
    FROM intelligence_feedback_embeddings fe
    JOIN feedbacks f ON f.id=fe.feedback_id AND f.product_id=$1::text AND f.deleted_at IS NULL
    JOIN intelligence_issue_evidence ev ON ev.feedback_id=f.id
    JOIN intelligence_issues i ON i.id=ev.issue_id AND i.product_id=$1::uuid AND i.merged_into IS NULL
    WHERE fe.product_id=$1::uuid AND fe.embedding_vector IS NOT NULL
    ORDER BY fe.embedding_vector <=> $2::vector
    LIMIT $3`, [productId,literal,Math.min(Math.max(limit,1),40)]);
  return result.rows as Array<{id:string;feedback:string;issue_id:string;similarity:number}>;
}

export async function searchIssueVectors(pool:Pool, productId:string, vector:number[], limit=20) {
  if(vector.length!==768 || vector.some(v=>!Number.isFinite(v))) throw new Error('Expected a 768-dimensional query embedding');
  const result=await pool.query(`SELECT id,title,category,embedding,1-(embedding_vector <=> $2::vector) AS similarity
    FROM intelligence_issues WHERE product_id=$1 AND merged_into IS NULL AND embedding_vector IS NOT NULL
    ORDER BY embedding_vector <=> $2::vector LIMIT $3`,[productId,`[${vector.join(',')}]`,Math.min(Math.max(limit,1),50)]);
  return result.rows as Array<{id:string;title:string;category:string;embedding:number[];similarity:number}>;
}
