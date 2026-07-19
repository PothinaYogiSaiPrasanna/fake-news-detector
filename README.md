# TruthScope — Fake News Detector

A privacy-first, browser-based misinformation detection tool. All analysis runs **entirely in your browser** — nothing is sent to any server.

## Features

- **Text Analysis** — Paste news articles, social media posts, or claims
- **URL Analysis** — Enter a URL to fetch and analyze page content (with fallback to URL-only)
- **Image Analysis** — Upload screenshots or photos (text extracted via OCR)
- **AI-Powered Detection** — Two ML models run in-browser via Transformers.js:
  - RoBERTa OpenAI Detector (AI-generated text detection)
  - MobileBERT Zero-Shot Classifier (factual vs misleading classification)
- **Heuristic Pattern Detection** — Clickbait phrases, emotional language, logical fallacies, vague sourcing, and more
- **Confidence Meter** — Animated circular gauge showing 0-100% credibility score
- **Suspicious Word Highlighting** — Color-coded highlights with hover explanations
- **Signal Breakdown** — Per-category analysis with weighted scoring
- **PDF Export** — Download a styled PDF report
- **Fully Responsive** — Works on mobile, tablet, and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| ML Inference | @huggingface/transformers (ONNX Runtime Web) |
| OCR | Tesseract.js v7 (WebAssembly) |
| PDF | html2canvas + jsPDF |
| Hosting | GitHub Pages (free) |

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

Output in `dist/` — ready for static hosting.

## Deployment

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `main`.

To enable:
1. Go to repo **Settings > Pages**
2. Under "Build and deployment", select **Source: GitHub Actions**
3. Push to `main` — the workflow will deploy automatically

## How It Works

1. **Input**: You provide text, a URL, or an image
2. **Analysis Engine**: Runs in parallel:
   - Heuristic pattern detection (50+ patterns across 6 categories)
   - ML model inference (AI text detection + zero-shot classification)
   - URL credibility analysis (domain, TLD, structure)
   - OCR text extraction (for images)
3. **Results**: Weighted aggregation produces a 0-100% credibility score, verdict, highlighted text, and per-signal breakdown

## Cost

**Zero.** Everything runs in your browser. No API keys, no server, no hosting fees. GitHub Pages is free.

## Limitations

- English text only
- First load downloads ~200MB of ML models (cached in browser for subsequent use)
- URL content fetching depends on free CORS proxy availability
- Not a definitive truth oracle — use as a screening tool
