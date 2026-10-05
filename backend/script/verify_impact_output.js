import { classifyImpactSingle } from '../src/classify_impact.js';

async function test() {
    const text = "The app crashes when I click upload.";
    const labels = ["Bug", "Feature"];

    try {
        console.log("Running classification...");
        const result = await classifyImpactSingle(text, labels);
        // console.log("Result keys:", Object.keys(result));
        console.log("Full Result:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

test();
