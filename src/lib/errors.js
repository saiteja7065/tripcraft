// What to tell the user for each failure. Kept in one place so every screen
// (full error state, inline day errors, toasts) words things the same way.

const COPY = {
  OFFLINE: {
    title: "You're offline",
    hint: "Check your connection. We'll enable the button again as soon as you're back.",
    retry: true,
  },
  NETWORK: {
    title: "Couldn't reach the server",
    hint: 'Your connection might be patchy, or the server is restarting. Try again in a moment.',
    retry: true,
  },
  TIMEOUT: {
    title: 'That took too long',
    hint: 'The AI or the network is slow right now. Trying again usually works.',
    retry: true,
  },
  RATE_LIMITED: {
    title: 'Too many requests',
    hint: 'The free AI tier has a rate limit. Wait a few seconds and try again.',
    retry: true,
  },
  SERVER: {
    title: 'Something went wrong on our side',
    hint: 'The server had a hiccup. Trying again should work.',
    retry: true,
  },
  UPSTREAM: {
    title: 'The AI provider had a problem',
    hint: "It's not you. Give it a moment and retry.",
    retry: true,
  },
  CONFIG: {
    title: "The server isn't set up correctly",
    hint: 'The API key was rejected. If you run this app, check the .env file.',
    retry: false,
  },
  MALFORMED_JSON: {
    title: 'The AI sent back a broken reply',
    hint: 'We asked it to fix its answer and that failed too. A fresh try usually works.',
    retry: true,
  },
  WRONG_SHAPE: {
    title: "The AI's reply didn't look like a trip plan",
    hint: 'It answered, but not in the format we asked for, even after we asked it to fix it.',
    retry: true,
  },
  EMPTY_RESPONSE: {
    title: 'The AI sent back nothing',
    hint: 'An empty reply, twice. Try again, or rephrase the trip a little.',
    retry: true,
  },
  NOT_A_TRIP: {
    title: "That doesn't look like a trip",
    hint: 'Try something like "3 days in Jaipur, love history and street food".',
    retry: false,
  },
  BLOCKED: {
    title: "The AI wouldn't plan this one",
    hint: 'Try rewording the request.',
    retry: false,
  },
  BAD_INPUT: {
    title: 'Something is off with that request',
    hint: 'Add a few more details about the trip and try again.',
    retry: false,
  },
}

const FALLBACK = { title: 'Something went wrong', hint: 'Please try again.', retry: true }

export function describeError(error) {
  const copy = COPY[error?.code] ?? FALLBACK
  let hint = copy.hint
  // the model's own explanation is more useful than our generic line
  if (error?.code === 'NOT_A_TRIP' && error.message) hint = `${error.message} ${copy.hint}`
  if (error?.code === 'BAD_INPUT' && error.message) hint = error.message
  if (error?.code === 'RATE_LIMITED' && error.retryAfter) {
    hint = `Rate limit hit. Try again in about ${error.retryAfter}s.`
  }
  return { ...copy, hint, code: error?.code ?? 'UNKNOWN' }
}
