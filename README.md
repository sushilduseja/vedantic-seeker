# Vedantic Seeker

Spiritual wisdom from Śrīmad-Bhāgavatam - ask questions, receive timeless teachings.

## Features

- 600+ curated teachings across 12 cantos
- Advanced semantic search algorithm
- Synonym expansion for comprehensive results
- Confidence scoring on matches
- Verse references with context
- Modern, responsive UI
- Zero external API dependencies

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── app/
│   ├── App.tsx                 # Main application
│   └── components/
│       ├── QuestionMapper.ts   # Search logic
│       ├── SearchResults.tsx   # Results display
│       └── ContentViewer.tsx   # Content modal
├── main.tsx                    # Entry point
└── index.css                   # Tailwind styles

public/data/
└── srimad-bhagavatam.json     # Knowledge base

Configuration:
├── vite.config.ts             # Build config
├── tsconfig.json              # TypeScript config
├── tailwind.config.js         # Tailwind config
└── package.json               # Dependencies
```

## Technologies

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

## Development

All code is production-ready and self-contained. No external API calls required.

Search algorithm:
- Text normalization
- Keyword matching (20% weight)
- Question similarity (40% weight)
- Theme matching (15% weight)
- Synonym expansion

Results return top 5 matches with confidence scores.

## License

Educational and spiritual development purposes.
