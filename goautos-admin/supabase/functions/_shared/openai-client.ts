
import OpenAI from 'https://deno.land/x/openai@v4.69.0/mod.ts';

export const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});
