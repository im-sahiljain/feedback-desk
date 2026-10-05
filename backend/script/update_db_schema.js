import 'dotenv/config';
import { pool } from '../src/db.js';

async function updateSchema() {
    try {
        console.log("Starting schema update...");

        // Add impact column
        await pool.query(`
            ALTER TABLE feedbacks 
            ADD COLUMN IF NOT EXISTS impact JSONB
        `);
        console.log("Added 'impact' column (if not exists).");

        // Add scope column
        await pool.query(`
            ALTER TABLE feedbacks 
            ADD COLUMN IF NOT EXISTS scope JSONB
        `);
        console.log("Added 'scope' column (if not exists).");

        // Also verify if the columns are nullable/non-nullable as per init.sql they should be NOT NULL
        // However, existing rows will fail if we add NOT NULL without default.
        // For now, let's just add them as nullable or default null?
        // init.sql says NOT NULL. 
        // If the table is empty, we can add NOT NULL.
        // If not empty, we might have issues. 
        // Let's first check if we can add them.

        // Let's try to set them to NOT NULL if possible, but maybe later.
        // The API sends them, so future inserts will have them.

        console.log("Schema update completed successfully.");
    } catch (error) {
        console.error("Schema update failed:", error);
    } finally {
        await pool.end();
    }
}

updateSchema();
