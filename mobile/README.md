# Stoke Mobile (Expo)

Offline-first native port of the STOKE web app (Next.js 16.3.4).

## Run

```sh
cd mobile
npm install
npx expo start
```

Then press `a` (Android), `i` (iOS), or scan the QR with Expo Go.

## What is ported (v1)

- `lib/study-logic.ts` — pure port of `lib/study-store.tsx` SM-2 (`previewIntervals`, `applyGrade`) + `uid/dayKey/fmt*`
- `lib/store.tsx` — AsyncStorage-backed offline store (subjects, chapters, cards, reviews, sessions, pomo)
- Tabs mirror web `MOBILE_NAV`: Home, Study, Review, Focus, More
  - Home: due count, today focus, subject quick-add
  - Study: subject → chapter → flashcard authoring
  - Review: due queue with Again/Hard/Good/Easy + interval previews
  - Focus: Pomodoro timer with completion logging + local notification
  - More: pomo lengths, library stats, local reset

## Notes / next steps

- Web auth is cookie-session (`/api/auth/*`); mobile v1 is single-device local-first by design. To sync, add token auth + `API_BASE_URL` client for `/api/bootstrap`, `/api/cards`, `/api/sessions`, `/api/subjects`, `/api/chapters`.
- Next: plan/calendar/tasks views, exam presets (`lib/exams.ts`), AI generation (`/api/ai`), streak/stats charts.
- Next.js agent rule (`node_modules/next/dist/docs/`): not installed in this checkout, so no versioned Next.js guide was available; mobile code does not modify the web app.
