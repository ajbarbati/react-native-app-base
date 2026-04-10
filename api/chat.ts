/**
 * Calls the Nest BFF `POST /chat`, which forwards to an OpenAI-compatible
 * `POST /v1/chat/completions` backend (e.g. local Ollama). Set
 * `EXPO_PUBLIC_API_BASE_URL` in `.env` (see root `.env.example` and README).
 */
const getBaseUrl = (): string =>
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export async function sendChatMessage(message: string): Promise<string> {
  const base = getBaseUrl();
  if (!base) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Copy `.env.example` to `.env` and set the API URL.',
    );
  }

  const res = await fetch(`${base}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as {
        message?: string | string[];
      };
      if (j.message != null) {
        msg = Array.isArray(j.message) ? j.message.join(', ') : j.message;
      }
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }

  let data: { reply?: string };
  try {
    data = JSON.parse(text) as { reply?: string };
  } catch {
    throw new Error('Invalid JSON from server');
  }
  if (typeof data.reply !== 'string') {
    throw new Error('Invalid response from server');
  }
  return data.reply;
}
