import { classifyImpactSingle } from '../src/classify_impact.js';

const input = {
    text: "The app crashes when I try to upload a file.",
    labels: ["Bug", "Feature", "Inquiry"]
};

(async () => {
    const result = await classifyImpactSingle(input.text, input.labels);
    console.log(JSON.stringify(result, null, 2));
})();
