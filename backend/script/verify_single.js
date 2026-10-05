import { classifySingle } from '../src/classify_single.js';

async function test() {
    // console.log("Testing classifySingle...");
    try {
        const text = "The app crashes on startup.";
        const labels = ["Bug", "Feature"];

        const result = await classifySingle(text, labels);
        console.log("Result:", JSON.stringify(result, null, 2));

        // New structure: result.category.label
        if (result.category && result.category.label === 'Bug') {
            const confidence = parseFloat(result.category.score);
            console.log(`SUCCESS: Correctly classified as Bug (Confidence: ${(confidence * 100).toFixed(2)}%)`);
        } else {
            console.error("FAILURE: Unexpected classification or structure.");
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
}

test();
