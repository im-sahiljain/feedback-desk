import { pipeline } from '@xenova/transformers';

function logMemory(stage) {
    const used = process.memoryUsage();
    console.log(`[${stage}] Memory Usage:`);
    console.log(`  RSS: ${(used.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  External: ${(used.external / 1024 / 1024).toFixed(2)} MB`);
    console.log('-----------------------------------');
}

async function run() {
    logMemory('Start');

    console.log("Loading MobileBERT pipeline...");
    // Using MobileBERT for low memory usage
    const classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli', {
        quantized: true,
        session_options: {
            intra_op_num_threads: 1,
            inter_op_num_threads: 1,
            execution_mode: 'sequential',
            graph_optimization_level: 'all'
        }
    });

    logMemory('Model Loaded');

    const text = "The app crashes when I try to upload a file.";
    const labels = ["Bug", "Feature", "Inquiry"];

    console.log("Running inference...");
    const start = performance.now();
    await classifier(text, labels);
    const end = performance.now();

    console.log(`Inference took: ${(end - start).toFixed(2)}ms`); // Added timing
    logMemory('After Inference');
}

run();
