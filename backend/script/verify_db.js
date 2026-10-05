import { pool } from "../src/db.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
    try {
        const res = await pool.query("SELECT NOW()");
        console.log("✅ DB connected:", res.rows[0].now);
    } catch (err) {
        console.error("❌ DB error:", err.message);
    } finally {
        await pool.end();
    }
})();
