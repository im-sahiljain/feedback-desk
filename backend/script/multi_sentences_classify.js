import fs from 'fs';
import * as XLSX from 'xlsx';
import { classifySingle } from '../src/classify_single.js';
import path from "path";

// Read feedback data
const feedbackData = JSON.parse(fs.readFileSync('../input_data/feedback_data.json', 'utf8'));

async function processFeedback() {
    console.log(`Processing ${feedbackData.length} feedback items...`);
    const results = [];

    for (let i = 0; i < feedbackData.length; i++) {
        const text = feedbackData[i];
        try {
            // console.log(`Classifying [${i + 1}/${feedbackData.length}]: "${text.substring(0, 50)}..."`);

            const categoryLabels = ["Bug Report", "Performance", "Feature Request", "UI/UX", "Documentation", "Security"];
            const classification = await classifySingle(text, categoryLabels);

            results.push({
                Text: text,
                Category: classification.category.label,
                'Category Score': classification.category.score,
                Sentiment: classification.sentiment.label,
                'Sentiment Score': classification.sentiment.score,
                Priority: classification.priority.label,
                'Priority Score': classification.priority.score
            });
        } catch (error) {
            console.error(`Error classifying "${text}":`, error);
            results.push({
                Text: text,
                Category: 'ERROR',
                'Category Score': 0,
                Sentiment: 'ERROR',
                'Sentiment Score': 0,
                Priority: 'ERROR',
                'Priority Score': 0
            });
        }
    }

    // Ensure generated_data folder exists
    const outputDir = path.join(process.cwd(), "../generated_data");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Classifications");

    // Generate filename with timestamp
    // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // const filename = `multi_sentence_classify_${timestamp}.xlsx`;
    const filename = `multi_sentence_classify.xlsx`;

    // Full file path
    const filePath = path.join(outputDir, filename);

    // Write to file
    XLSX.writeFile(workbook, filePath);

    console.log(`\n✅ Success! Results saved to ${filePath}`);
}

processFeedback();
