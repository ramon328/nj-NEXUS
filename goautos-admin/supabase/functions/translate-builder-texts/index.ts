import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { openai } from '../_shared/openai-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Translates builder text props from Spanish to English using GPT.
 *
 * Input:  { texts: Record<string, string> }
 *   e.g.  { "hero-title": "Encuentra tu próximo vehículo", "cta-text": "Contacto" }
 *
 * Output: { translations: Record<string, string> }
 *   e.g.  { "hero-title": "Find your next vehicle", "cta-text": "Contact" }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { texts } = await req.json();

    if (!texts || typeof texts !== 'object' || Object.keys(texts).length === 0) {
      return new Response(JSON.stringify({ translations: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const entries = Object.entries(texts);

    // Build a structured prompt for GPT
    const textList = entries
      .map(([key, value], i) => `${i + 1}. [${key}]: "${value}"`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for an automotive dealership website. Translate the following Spanish texts to English. Keep the same tone and style. Keep brand names, proper nouns, and technical terms unchanged. Return ONLY a JSON object where each key matches the original key and the value is the English translation. Do not add any explanation or markdown.`,
        },
        {
          role: 'user',
          content: `Translate these texts from Spanish to English:\n\n${textList}\n\nReturn a JSON object with the same keys and translated values.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || '{}';

    // Parse the JSON response, handling potential markdown wrapping
    let translations: Record<string, string> = {};
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      translations = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse GPT response:', content);
      return new Response(JSON.stringify({ translations: {}, error: 'parse_error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
