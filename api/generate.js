export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured on server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, system } = body;
  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Missing messages field.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Format messages untuk OpenAI (tambah system message di depan)
  const openaiMessages = [
    { role: 'system', content: system || '' },
    ...messages
  ];

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      stream: true,
      messages: openaiMessages,
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.json();
    return new Response(JSON.stringify({ error: err.error?.message || 'OpenAI API error' }), {
      status: openaiRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream response langsung ke client
  return new Response(openaiRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
