import { getChatResponseStream } from './services/geminiService.ts';

async function main() {
  try {
    const stream = await getChatResponseStream('test-user', [{ sender: 'user', text: 'hello' }], false);
    for await (const chunk of stream) {
      console.log(chunk.text);
    }
  } catch (e) {
    console.error('THREW:', e);
  }
}
main();
