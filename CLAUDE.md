# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts the Vite development server
- **Build**: `npm run build` - Creates production build in `dist/` directory
- **Preview**: `npm run preview` - Preview the production build locally

## Architecture Overview

This is a single-page React application for calculating probabilities in Trading Card Games (specifically Yu-Gi-Oh!), built with Vite, React 18, and Tailwind CSS.

### Core Components Structure

- **App.jsx**: Main application component (~1,600 lines); orchestrates hooks, services, and feature components
- **main.jsx**: React app entry point with Vercel Analytics integration
- **index.css**: Tailwind CSS imports and base styles

### Key Services (`src/services/`)

- **URLService**: Handles encoding/decoding calculation data to/from URL hash for shareable links
- **CardDatabaseService**: Manages card metadata from Vercel Blob (primary) with YGOPro API fallback and 7-day localStorage cache
- **ProbabilityService**: Monte Carlo simulation engine (100,000 simulations per calculation) with result caching
- **TitleGeneratorService**: Generates fun, contextual titles for calculation results
- **HandTrapService**: Identifies hand-trap cards via pattern matching against card descriptions and a hardcoded known-cards list
- **YdkParser**: Parses `.ydk` files into card name/count maps; uses `/public/cardDatabase.json` for offline ID→name resolution
- **OpeningHandService**: Generates opening hands for visual testing — Fisher-Yates shuffle over a constructed deck, with a YDK-specific variant
- **ComboRecognitionService**: Detects known engines in an uploaded deck and builds pre-populated combo state objects; reads from `src/data/engineDatabase.js`

### Data Flow

1. User defines combos with card names, deck quantities, and hand requirements
2. Card metadata loads from Vercel Blob Storage (26 MB full database) with YGOPro API fallback and 7-day cache
3. Card images load from Vercel Blob Storage (WebP format) with YGOPro API fallback
4. Probability calculations use Monte Carlo simulation (not exact math) for real-world accuracy
5. Results are cached to avoid recalculation of identical scenarios
6. Shareable URLs encode the entire calculation state in the hash

### Styling Approach

- Tailwind CSS for layout and utilities
- Custom inline styles with a centralized `typography` object for consistent font sizing
- Dark theme with specific color palette (#000000 background, #333 inputs, etc.)
- Geist font family throughout
- Custom pill-shaped buttons and inputs with specific dimensions (40px height, 999px border-radius)

### State Management

All state is managed locally in the main App component using React hooks:
- `combos`: Array of combo definitions with cards and requirements
- `results`: Probability calculation results (individual and combined)
- `cardDatabase`: Cached card data from API
- `errors`: Form validation state

### External Dependencies

- **Vercel Blob Storage**: Primary source for card metadata (26 MB) and images (WebP format, 2.5-3 GB)
- **Yu-Gi-Oh! API**: https://db.ygoprodeck.com/api/v7/cardinfo.php (fallback for metadata, used for card search)
- **Vercel Analytics**: Integrated for usage tracking
- **Local Storage**: Used for 7-day card database caching
- **Static Card Database**: `/public/cardDatabase.json` (2.1 MB) for offline YDK parsing

### Performance Considerations

- Card search is debounced (300ms) and limited to 50 results
- Monte Carlo simulations use 100,000 iterations for accuracy vs speed balance
- Results are cached to avoid redundant calculations
- Card metadata is cached locally for 7 days (reduces Blob/API calls to zero after initial load)
- Full card database (~26 MB) loads from Vercel CDN in ~500ms with global edge caching
- Card images use WebP format with lazy loading for optimal performance

### Engine Recognition

When a YDK file is uploaded, `ComboRecognitionService` scans the deck against `ENGINE_DATABASE` and auto-populates the combo builder for any recognised engines (Fiendsmith, Unchained, Branded/Despia, Snake-Eye, Cyber Dragon, Gem-Knight). See [ENGINE_RECOGNITION.md](ENGINE_RECOGNITION.md) for the full schema and instructions for adding a new engine.

### Data Architecture

See [CARD_DATABASE_ARCHITECTURE.md](CARD_DATABASE_ARCHITECTURE.md) for detailed information about:
- Card metadata storage (Vercel Blob vs YGOPro API vs local static)
- Image storage (Vercel Blob with YGOPro fallback)
- Caching strategy (7-day localStorage)
- Update procedures (`npm run upload:card-database`)
- Fallback mechanisms and reliability

### Combo Sequence Schema

See [COMBO_SEQUENCE_SCHEMA.md](COMBO_SEQUENCE_SCHEMA.md) for the full data contract covering:
- Ordered step model (description, functional tags, StepCard zones)
- Endboard definition (field / GY / hand after resolution)
- Choke points (step index + interrupt categories)
- Weakness profiles (breaking categories + named counter cards)
- `valid_from` banlist date and relationship to `ARCHETYPE_DATABASE`

Data lives in `src/data/comboSequenceDatabase.js`.