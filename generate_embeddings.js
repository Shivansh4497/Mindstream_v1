import { pipeline } from '@xenova/transformers';
import fs from 'fs';

async function generate() {
    console.log("Reading entries from index.ts...");
    const indexContent = fs.readFileSync('supabase/functions/seed-demo-data/index.ts', 'utf-8');
    
    // Extract the ENTRY_TEMPLATES array
    const match = indexContent.match(/const ENTRY_TEMPLATES = \[([\s\S]*?)\];/);
    if (!match) throw new Error("Could not find ENTRY_TEMPLATES");
    
    const entriesStr = match[1];
    
    // Extract just the text property from each entry object using regex
    const texts = [];
    const textRegex = /text:\s*"([^"]+)"/g;
    let m;
    while ((m = textRegex.exec(entriesStr)) !== null) {
        texts.push(m[1]);
    }
    
    console.log(`Found ${texts.length} entries.`);

    console.log("Loading model...");
    const embedder = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
    
    console.log("Generating embeddings...");
    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
        const result = await embedder(texts[i], { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(result.data));
    }
    
    const jsonStr = JSON.stringify(embeddings);
    fs.writeFileSync('supabase/functions/seed-demo-data/embeddings.json', jsonStr);
    fs.writeFileSync('supabase/functions/seed-demo-data/embeddings.ts', `export const embeddings = ${jsonStr};`);
    console.log("Done! Wrote " + embeddings.length + " embeddings.");
}

generate();
