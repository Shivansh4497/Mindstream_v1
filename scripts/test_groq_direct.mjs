import fs from 'fs';

const envFile = fs.readFileSync('/Users/director/Desktop/Mindstream_v1/.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

async function testGroq() {
    const groqKey = env.VITE_GROQ_API_KEY;
    console.log("Key starts with:", groqKey.substring(0, 8));
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [{ role: 'user', content: 'test' }],
            temperature: 0.7,
            max_tokens: 100
        })
    });
    
    console.log("Status:", response.status);
    console.log("Body:", await response.text());
}
testGroq();
