// Force deploy comment: v1.3.0 using native Supabase.ai.Session
let session: any = null;

export async function generateEmbedding(
  text: string,
  isQuery: boolean = false
): Promise<number[]> {
  if (!session) {
    // @ts-ignore
    session = new Supabase.ai.Session('gte-small');
  }

  const output = await session.run(text.substring(0, 8000), {
    mean_pool: true,
    normalize: true
  });

  return Array.from(output);
}

