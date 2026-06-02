import { semanticSearchEntries } from '../services/dbService';

async function test() {
  console.log("Testing Fix A: Empty & Short Query Validation...");
  const res1 = await semanticSearchEntries("test-user", "");
  console.log("Empty string result (expected []):", JSON.stringify(res1));
  const res2 = await semanticSearchEntries("test-user", "a");
  console.log("Short string result (expected []):", JSON.stringify(res2));
}
test();
