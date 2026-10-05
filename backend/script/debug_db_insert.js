
import 'dotenv/config';
import { getPool } from "../src/db.js";

async function testInsert() {
    try {
        const pool = getPool();
        const text = "Test feedback";
        const labels = JSON.stringify(["Bug"]);
        const category = JSON.stringify({ label: "Bug", score: 0.99 });
        const sentiment = JSON.stringify({ label: "Negative", score: 0.99 });
        const priority = JSON.stringify({ label: "High", score: 0.99 });
        const impact = JSON.stringify({ label: "Serious", score: 0.99 });
        const scope = JSON.stringify({ label: "Many", score: 0.99 });

        const insertQuery = `
            INSERT INTO feedbacks 
            (feedback, labels, category, sentiment, priority, impact, scope)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `;

        const values = [text, labels, category, sentiment, priority, impact, scope];
        console.log("Attempting insert...");
        const res = await pool.query(insertQuery, values);
        console.log("Insert success, ID:", res.rows[0].id);
    } catch (err) {
        console.error("Insert failed:", err);
    }
}

testInsert();
