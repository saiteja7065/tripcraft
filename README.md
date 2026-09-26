# Tripcraft

Describe a trip in one sentence and get a day-by-day plan you can actually shape: drag stops around, move them between days, remove them, or ask the AI to redo just one day. Built for the Flam frontend internship assignment (trip planner).

- **Live:** _link added after deploy_
- **Demo video:** _link added after recording_

It is not a chatbot. The model returns JSON, the browser validates it, and React renders it as interactive components. Raw model text never reaches the screen.

---

## Quick start

```bash
npm install
npm start          # builds the app and serves it on http://localhost:8787
```

That works **without any API key** - the server falls back to demo mode and returns sample trips, so you can click around straight away.

To use a real model, copy `.env.example` to `.env` and add at least one free key:

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | console.groq.com (used first) |
| `GEMINI_API_KEY` | aistudio.google.com (fallback) |
| `OPENROUTER_API_KEY` | openrouter.ai (second fallback) |

Other scripts:

```bash
npm run dev        # vite + api with hot reload (http://localhost:5173)
npm test           # 32 unit tests (validator, reducer, schedule, share links)
```

Requires Node 22.12+.

---

## Using it

1. Type something like _"3 days in Jaipur with my parents, love forts and street food"_ and press **Plan my trip** (or Ctrl+Enter).
2. The trip shows up as a boarding pass plus one tab per day.
3. On a day:
   - click a stop to **expand** it (note, times, Open in Maps)
   - **drag** the ⠿ handle to reorder - or focus it and use ↑/↓
   - drag a stop onto another **day tab** to move it there
   - the ⋯ menu has move earlier/later, move to day N, remove
   - change the day's start time; every clock time is recalculated
   - **Ask AI to tweak this day** ("make it more relaxed") - only that day changes
4. **Undo** (or Ctrl+Z) reverts any edit. **Share** copies a link that contains the whole trip.

Add `?lab` to the URL to open the **failure lab** - it makes the server fake a specific bad reply so every error path can be seen on demand (see below).

---

## How it works

```
PromptInput ──► lib/api.js ──► POST /api/generate (Express) ──► Groq → Gemini → OpenRouter
                    │                  holds the key, builds the prompt,
                    │                  returns the model's raw text
                    ▼
            lib/validateResult.js  ── parse + check + repair small issues
                    │
          ok ───────┴──────── not ok ──► one "fix your JSON" retry ──► ErrorState
          ▼
   useItinerary (reducer + undo) ──► Itinerary ► TripHero · DayTabs · DayView ► StopCard
```

```
src/
  components/   PromptInput, ResultView (picks loading/error/empty/trip),
                ErrorState, LoadingState, Itinerary, DayView, StopCard, ...
  hooks/        useLatestRequest (stale guard), useItinerary (reducer),
                useDragSort + useFlip (drag and drop), useOnlineStatus
  lib/          api.js (only file that calls fetch), validateResult.js,
                errors.js, schedule.js, share.js, storage.js
  types/        result.js - the JSON shape, shared by client and server
server/
  generate.js   the /api/generate route: input checks, rate limit, prompt, fallback
  prompts.js    separate prompts for trip / repair / refine-day
  providers/    one small adapter per provider, plus a mock for demo mode
  simulate.js   failure lab scenarios
```

The data shape was designed first (`src/types/result.js`): a trip has days, a day has a start time and stops, a stop has a name, category, duration, area and note. The model never sends ids or clock times - ids are added after validation and times are derived from the start time and durations, so reordering a stop re-times the whole day automatically.

---

## Handling bad AI output

Everything the model sends goes through `validateResult.js` before React sees it.

| What goes wrong | What the app does | Try it (`?lab`) |
|---|---|---|
| JSON wrapped in \`\`\`fences or chatty text | strips it and parses the JSON inside | JSON wrapped in fences |
| Malformed / cut-off JSON | asks the model once to fix its own reply (with the parse error); if that fails too, shows an error with Retry | Broken first, fine on repair · Cut-off JSON |
| Valid JSON, wrong shape | same repair round trip, listing exactly which fields were wrong, then an error | Valid JSON, wrong shape |
| Small problems ("2 hours" instead of 120, unknown category, bad start time, a stop without a name) | fixes or drops just that part, renders the rest, and tells the user what was tidied up | Some junk fields |
| Empty reply | treated as a failure, never as an empty trip | Empty reply |
| Not a trip ("write me a python function") | the prompt lets the model say so; shown as a friendly message | Model says "not a trip" |
| Slow reply | loading text changes at 8s and 20s, Cancel is always there, hard timeout at 45s | 14s delay · Never answers |
| Failed request / provider down | server tries the next provider; client shows an error with Retry | Provider outage |
| Rate limited (429) | clear message and a countdown before Retry is enabled | 429 from provider |
| Network drop / offline | one quiet automatic retry; offline banner; retries by itself when the connection comes back | Connection drops |
| **Stale response** | `useLatestRequest` gives each request an id and aborts the previous one - an older reply that arrives late is ignored. A refined day is applied by day id, so a late reply can't land on a newer trip | - |

Share links and saved sessions go through the same validator - a URL is user input too.

---

## Decisions and trade-offs

- **Validation happens in the browser, not the server.** The server just forwards raw text, so every failure is visible to the UI and testable in one place.
- **Repair small things, reject broken things.** Throwing away a good 20-stop plan because one duration says "2 hours" is worse UX than fixing it and saying so.
- **One repair attempt, not a loop.** It fixes most cut-off or wrongly shaped replies; more attempts mostly burn time and free-tier tokens.
- **No streaming.** The whole reply has to be complete before it can be validated, and a free model answers in ~3s. Streaming partial JSON is on the "next" list.
- **Groq first, Gemini as fallback.** I benchmarked real trip prompts: Groq `gpt-oss-120b` with low reasoning effort answered in ~3s with valid output; Gemini was reliable but ~16s and often overloaded. Switching provider is one env variable.
- **No AI SDK.** Each provider is one plain `fetch` - nothing hidden to explain.
- **Drag and drop without a library.** Pointer events work for mouse, touch and pen; the DOM is moved with transforms during the drag and React state changes only at the start and the drop. Keyboard reordering works too.
- **No database.** Trips are saved in localStorage and shared by compressing the whole trip into the URL hash.
- **API key stays on the server.** The browser only ever calls `/api/*`. The server also rate limits per IP so one person can't drain the free quota.

---

## Stretch goals done

- Refinement loop - "Ask AI to tweak this day" edits one day, the rest stays
- Save and reload - sessions persist in localStorage, plus share links
- Polish - animations, dark mode, keyboard navigation (tabs, menus, reordering), WCAG AA contrast (checked with axe)

## Known limitations

- Travel time between stops is a fixed 20 minutes, not real distances.
- You can't add your own stop or add/delete a whole day yet.
- No streaming - the plan appears all at once.
- Groq's free tier allows roughly 2-3 trips a minute; after that it falls back to Gemini, which is slower.
- The rate limiter is in memory, so it resets when the server restarts.
- Tests cover the logic (validator, reducer, schedule, share links) but not the React components.
- Place names come from the model and can be wrong - there's a note in the footer to check before going.

## What I'd do next

- Map view with real travel times between stops
- Add / edit your own stops, add or remove days
- Stream the reply and validate day by day as it arrives
- Component tests with React Testing Library

---

## How I used AI

I built this with **Claude Code as a pair programmer**. I'm being upfront about it because it did a lot of the typing - the decisions, direction and checking were mine.

**What I did**
- Read the brief and researched Flam (JD, product, their focus on interactive and "app-less" content), then **chose the trip planner** because it fit that and has the richest state to manage.
- **Set the constraints:** JavaScript rather than TypeScript (the JD lists JS), no database, a small backend only to hide the key, free-tier deployment.
- **Picked the provider from measured results:** created keys for Groq, Gemini and OpenRouter, benchmarked real trip prompts, and chose Groq `gpt-oss-120b` as primary with Gemini as fallback.
- **Directed the design:** rejected the first UI as too generic and pushed for a real visual identity, chose the paper boarding-pass style out of six options, asked for the wide desktop layout, and kept dark mode but had it reworked.
- **Asked for a full audit before deploying** and required every issue it found to be fixed first (a tab switch cancelling a running tweak, emptied trips lost on reload, undo after opening a share link, text contrast, auto-retry on reconnect).
- Tested the app myself in the browser at each step, and kept the history as small commits.

**What AI did**
- Wrote most of the code from my direction: components, hooks, the validator, the Express proxy, CSS, tests.
- Suggested implementation approaches (stale-response guard, auto-repair, derived times, drag without a library), which I reviewed and accepted.
- Ran automated checks: browser tests with Playwright, an accessibility scan, the model benchmarks.

I've gone through every file and can explain the data flow, the failure handling and the trade-offs.

## Time spent

About **2 hours on the core app** (data shape, backend proxy, validation, failure handling, interactive UI) and about **1 hour on UI polish** - roughly 3-3.5 hours in total.
