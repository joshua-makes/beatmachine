# 🥁 BeatMachine

A production-quality, browser-based beatbox / music maker built with **Next.js 15**, **Web Audio API**, and **Tailwind CSS v4**.

---

## Features

- **16-step sequencer** with 8 instrument tracks
- **Synthesized WAV samples** generated deterministically at build time (kick, snare, hi-hat, clap, tom, perc, bass, synth)
- **Real-time audio scheduling** via a lookahead Web Audio scheduler
- **Per-track controls**: sample selector, volume slider, mute & solo toggles
- **Transport**: play/pause, BPM (60–200), master volume
- **Audio visualizer**: waveform or frequency-bars mode (canvas)
- **Session management**: save/load up to 20 named sessions in `localStorage`
- **Share link**: encode the full pattern as a compressed URL parameter (LZ-string)
- **Import / Export JSON** session files
- **Recording**: capture audio output as WebM (10 / 20 / 30 s) and auto-download
- **Keyboard shortcut**: `Space` to play/pause
- **Dark / light theme** toggle (persisted in `localStorage`)
- Fully **accessible** (ARIA labels, keyboard navigation, `role="switch"`)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Audio | Web Audio API |
| Compression | lz-string |
| Testing | Vitest + jsdom + Testing Library |
| Linting | ESLint (next/core-web-vitals) |
| Formatting | Prettier |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/bestacles/beatmachine.git
cd beatmachine

# 2. Install dependencies
npm install

# 3. Generate sample WAV files (auto-runs before dev/build)
npm run generate:samples

# 4. Start dev server
npm run dev
# Open http://localhost:3000
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format all files with Prettier |
| `npm run test` | Run Vitest (watch mode) |
| `npm run test -- --run` | Run Vitest once (CI mode) |
| `npm run typecheck` | TypeScript type-check (no emit) |
| `npm run generate:samples` | Regenerate WAV sample files |

---

## Project Structure

```
beatmachine/
├── public/
│   └── samples/          # Generated WAV files (kick, snare, …)
├── scripts/
│   └── generate-samples.mjs  # Deterministic WAV generator
├── src/
│   ├── app/
│   │   ├── globals.css   # Tailwind + base styles
│   │   ├── layout.tsx    # Root layout (header + footer)
│   │   └── page.tsx      # Main sequencer page
│   ├── components/
│   │   ├── beat/         # Sequencer-specific components
│   │   │   ├── RecordPanel.tsx
│   │   │   ├── SampleSelect.tsx
│   │   │   ├── SessionMenu.tsx
│   │   │   ├── StepGrid.tsx
│   │   │   ├── TrackRow.tsx
│   │   │   ├── Transport.tsx
│   │   │   └── Visualizer.tsx
│   │   ├── layout/       # Header, Footer, Container, ThemeToggle
│   │   └── ui/           # Button, Card, Select, Slider, Toggle
│   ├── lib/
│   │   ├── audio/
│   │   │   ├── engine.ts    # AudioEngine singleton
│   │   │   ├── recorder.ts  # MediaRecorder wrapper
│   │   │   ├── samples.ts   # Sample definitions
│   │   │   └── scheduler.ts # Lookahead step scheduler
│   │   ├── pattern.ts    # Pattern state, serialization, share URLs
│   │   ├── session.ts    # localStorage session management
│   │   └── utils.ts      # cn(), clamp()
│   └── test/
│       ├── setup.ts
│       ├── pattern.test.ts
│       └── scheduler.test.ts
├── .github/workflows/ci.yml
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and ensure all checks pass:
   ```bash
   npm run lint && npm run test -- --run && npm run build
   ```
4. Commit and open a pull request

---

## License

MIT © [bestacles](https://github.com/bestacles)
