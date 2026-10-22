# Math Practice

A friendly flash-card app that helps children practice addition, subtraction,
multiplication and division. Students pick an answer, flip the card to see the
correct one, and say whether they got it right. The app remembers the facts
they miss and later asks **similar** questions until each one is mastered.

**Live site:** (https://mymathapp123.netlify.app/)

Everything runs in the browser. There are no accounts, no server and no
tracking; progress is saved only on the device being used.

## Features

- **Four operations, four levels.** Pick one or more operations (or all of
  them) and a level from Beginner to Advanced. Division always has
  whole-number answers, and subtraction never goes below zero.
- **Flip cards with four choices.** Every question has four different answer
  choices, with believable wrong answers based on common mistakes.
- **Self-reported results.** After flipping, the student taps
  _I Got It Right_ or _I Got It Wrong_. Each answer is counted exactly once.
- **Sessions your way.** 5, 10 or 20 questions, or continuous practice with
  an _End Session_ button. A summary shows the score and what to do next.
- **Mistake review.** Wrong answers are saved as mistake patterns. Review
  mode asks related questions — nearby numbers, swapped operands for + and
  ×, and fact families (8 × 7 → 56 ÷ 7) — at the same level. Mistakes that
  are missed often, missed recently, or not yet reviewed come first. After
  a set number of correct similar answers (3 by default, changeable in
  Settings) a mistake counts as mastered.
- **Statistics.** Totals and accuracy overall, by operation and by level;
  recent sessions; mistakes to practice with mastery progress; the most
  missed operation and facts. Statistics can be reset after confirming.
- **Settings.** Sound effects, card animation, explanations, default
  operations / level / session length, the mastery threshold, and a
  _Clear All Application Data_ button.
- **Safe sessions.** Refreshing the page restores the session in progress.
  Leaving an unfinished session asks for confirmation first.
- **Accessible.** Works with the keyboard alone (number keys 1–4 pick an
  answer), announces questions and answers to screen readers, respects
  _reduced motion_, never relies on color alone, and meets WCAG AA contrast.
- **Responsive.** Designed for tablets first; works on phones (from 320 px
  wide) and desktops without sideways scrolling.

## Tech stack

- [React](https://react.dev/) 19 and [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for development and builds
- [React Router](https://reactrouter.com/) (data router, with lazily loaded
  Statistics and Settings pages)
- State in React context with `useSyncExternalStore`; data in `localStorage`
- [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/)
  and [axe-core](https://github.com/dequelabs/axe-core) for tests
- ESLint and Prettier

## Getting started

You need [Node.js](https://nodejs.org/) **22.12 or newer** (it was developed
with Node 24) and npm.

```bash
git clone https://github.com/Londarh/math-practice-app.git
cd math-practice-app
npm install
```

### Run locally

```bash
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

### Run the tests

```bash
npm test             # run all tests once
npm run test:watch   # re-run tests as files change
```

The suite covers question generation, statistics, mistake tracking,
similar questions, mastery, storage and recovery, every page, full user
flows (including one done with the keyboard only), color contrast, and an
automated accessibility check with axe-core.

### Lint, format and type-check

```bash
npm run lint
npm run format:check   # or: npm run format
npm run typecheck
```

### Build for production

```bash
npm run build     # type-checks, then builds into dist/
npm run preview   # serves the built app locally to try it out
```

## Deploying to Netlify

The app is a static site. On Netlify use:

- **Build command:** `npm run build`
- **Publish directory:** `dist`

`public/_redirects` sends every path to `index.html`, so links such as
`/statistics` work when opened directly or refreshed.

## Privacy

- No personal information is asked for or collected.
- Practice data stays in the browser's `localStorage` on this device; nothing
  is sent to any server, and there are no analytics, ads or external links.
- **Clearing the browser's history or site data erases all progress.** The
  _Clear All Application Data_ button in Settings does the same on purpose.

## Project structure

```text
src/
├── app/         App, routes, data store and provider
├── components/  layout, practice, statistics and shared components
├── hooks/       practice session, statistics, saved app data, reduced motion
├── pages/       one component per route
├── services/    question and similar-question generation, statistics,
│                mistakes, storage and session recovery
├── types/       shared TypeScript types
├── utils/       math, validation, labels, feedback and other helpers
└── test/        test helpers, integration and accessibility tests
```

Requirements are in [`specification.md`](specification.md) and the
implementation plan is in [`TODO.md`](TODO.md).
