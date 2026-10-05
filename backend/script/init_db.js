import { pool } from '../src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
    try {
        console.log("Connecting to database...");

        // Read init.sql
        const sqlPath = path.join(__dirname, '../init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running init.sql...");
        await pool.query(sql);

        console.log("Database initialized successfully!");
    } catch (err) {
        console.error("Error initializing database:", err);
    } finally {
        await pool.end();
    }
}

initDB();
