
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { classifyImpactSingle } from '../src/classify_impact.js';

// Resolve paths
const __dirname = path.resolve();
const DATA_PATH = path.join(__dirname, 'input_data/feedback_data.json');
const OUTPUT_DIR = path.join(__dirname, 'generated_data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'multi_sentences_classify_impact.xlsx');

async function run() {
    try {
        console.log(`Reading feedback data from ${DATA_PATH}...`);
        const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
        const feedbackList = JSON.parse(rawData);

        console.log(`Loaded ${feedbackList.length} feedback items.`);

        const results = [];

        // Process each feedback item
        for (let i = 0; i < feedbackList.length; i++) {
            const text = feedbackList[i];
            console.log(`[${i + 1}/${feedbackList.length}] Classifying: "${text.substring(0, 50)}..."`);

            try {
                const categoryLabels = ["Bug Report", "Performance", "Feature Request", "User Experience", "Documentation", "Security"];
                const classification = await classifyImpactSingle(text, categoryLabels);

                // Flatten the object for Excel row
                // Columns: Text, Category, Sentiment, Impact, Scope, Priority
                const row = {
                    Text: text,
                    Category: classification.category.label,
                    'Category Score': classification.category.score,
                    Sentiment: classification.sentiment.label,
                    'Sentiment Score': classification.sentiment.score,
                    Impact: classification.impact.label,
                    'Impact Score': classification.impact.score,
                    Scope: classification.scope.label,
                    'Scope Score': classification.scope.score,
                    Priority: classification.priority.label,
                    'Priority Reason - Impact': classification.priority.reasoning.impact,
                    'Priority Reason - Scope': classification.priority.reasoning.scope
                };
                results.push(row);
            } catch (err) {
                console.error(`Error classifying item ${i}:`, err);
                results.push({
                    Text: text,
                    Error: err.message
                });
            }
        }

        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Write to Excel
        const worksheet = xlsx.utils.json_to_sheet(results);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Impact Analysis');

        console.log(`Writing results to ${OUTPUT_FILE}...`);
        xlsx.writeFile(workbook, OUTPUT_FILE);
        console.log('Done!');

    } catch (error) {
        console.error("Fatal error:", error);
    }
}

run();
