# TCG Probabilities Calculator

Calculate optimal deck ratios for trading card game combos using Monte Carlo simulation.

## 🚀 Features

- **Multiple Combo Calculations**: Calculate probabilities for multiple combos simultaneously
- **Card Database Integration**: Search and select from the complete Yu-Gi-Oh! card database via Vercel Blob Storage
- **Monte Carlo Simulation**: 100,000 iterations for accurate probability estimates
- **Shareable Links**: Generate URLs to share your calculations
- **Exact Mathematical Formulas**: View the hypergeometric distributions behind calculations
- **Hand Trap Mode**: Identify and calculate interaction probabilities
- **YDK Import**: Import deck lists and test opening hands
- **Engine Recognition**: Auto-detect popular engines (Fiendsmith, Branded, Snake-Eye, and more) from an uploaded YDK and pre-populate the combo builder
- **Interactive Combo Assignment**: Assign cards from opening hands to combos

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   └── Tooltip.jsx
│   ├── layout/         # Layout components
│   │   ├── Header.jsx
│   │   └── Footer.jsx
│   ├── CardImage.jsx
│   ├── CardSearchModal.jsx
│   ├── CardSearchDrawer.jsx
│   ├── DecklistImage.jsx
│   ├── FormulaDisplay.jsx
│   └── Icon.jsx
├── features/           # Feature-specific components
│   ├── calculator/     # Main calculator features
│   │   ├── ComboBuilder.jsx
│   │   ├── DeckConfigInputs.jsx
│   │   ├── DeckInputs.jsx
│   │   └── ResultsDisplay.jsx
│   ├── combo/          # Combo-specific components
│   │   ├── ComboCard.jsx
│   │   └── ComboForm.jsx
│   ├── deck-import/    # YDK import feature
│   │   └── YdkImporter.jsx
│   └── shared/         # Shared feature components
│       └── SearchableCardInput.jsx
├── hooks/              # Custom React hooks
│   ├── useCalculations.js    # Probability calculations
│   ├── useCardSearch.js      # Card database search
│   ├── useCombos.js          # Combo state management
│   ├── useDeckConfig.js      # Deck configuration
│   ├── useErrors.js          # Error state management
│   ├── useOpeningHand.js     # Opening hand generation
│   ├── useShareableUrl.js    # URL encoding/decoding
│   ├── useToast.js           # Toast notifications
│   └── useYdkImport.js       # YDK file import
├── services/           # Business logic services
│   ├── CardDatabaseService.js      # Card data management
│   ├── ComboRecognitionService.js  # Engine detection & combo pre-population
│   ├── HandTrapService.js          # Hand trap identification
│   ├── OpeningHandService.js       # Opening hand generation (Fisher-Yates)
│   ├── ProbabilityService.js       # Monte Carlo simulation
│   ├── TitleGeneratorService.js    # Result title generation
│   ├── URLService.js               # URL state encoding
│   └── YdkParser.js                # YDK file parsing
├── data/               # Static data
│   └── engineDatabase.js           # ENGINE_DATABASE for engine recognition
├── constants/          # Application constants
│   └── config.js       # Configuration values
├── utils/              # Utility functions
│   └── validation.js   # Input validation helpers
├── App.jsx             # Main application component
├── main.jsx            # Entry point with Vercel Analytics
└── index.css           # Global styles & Tailwind imports
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 📚 Architecture

### Services

- **CardDatabaseService**: Manages card metadata from Vercel Blob with YGOPro API fallback and 7-day localStorage cache
- **ProbabilityService**: Monte Carlo simulation engine (100,000 iterations) with result caching
- **TitleGeneratorService**: Generates contextual titles for calculation results
- **URLService**: Encodes/decodes calculation state to/from URL hash for sharing
- **HandTrapService**: Identifies hand-trap cards via regex pattern matching on card descriptions and a hardcoded known-cards list
- **YdkParser**: Parses YDK deck files; uses `/public/cardDatabase.json` for offline ID→name resolution
- **OpeningHandService**: Generates opening hands using Fisher-Yates shuffle; supports both combo-mode and full YDK-mode hand generation
- **ComboRecognitionService**: Detects known engines in an uploaded deck and builds pre-populated combo objects (see [ENGINE_RECOGNITION.md](ENGINE_RECOGNITION.md))

### Custom Hooks

- **useCombos**: Manages combo state and operations (add, update, delete)
- **useDeckConfig**: Handles deck size and hand size with validation
- **useCalculations**: Manages probability calculations with loading state
- **useCardSearch**: Manages card database state and search functionality
- **useShareableUrl**: Manages shareable URL generation and state persistence
- **useYdkImport**: Manages YDK file import and deck zone state
- **useToast**: Toast notification state management
- **useOpeningHand**: Opening hand state and refresh logic
- **useErrors**: Form validation error state

### Components

#### UI Components
- **Button**: Reusable button with variants (primary, secondary, danger)
- **Input**: Styled input component with error states
- **Tooltip**: Accessible tooltip component

#### Layout Components
- **Header**: Application header with branding
- **Footer**: Application footer with links

#### Feature Components
- **ComboBuilder**: Container for multiple combo forms
- **ComboForm**: Individual combo configuration with card management
- **ComboCard**: Individual card within a combo
- **DeckConfigInputs**: Deck size, hand size, and YDK import controls
- **DeckInputs**: Deck configuration panel
- **ResultsDisplay**: Calculation results, opening hand, and sharing UI
- **YdkImporter**: YDK file upload and deck list management
- **SearchableCardInput**: Card search with autocomplete

#### Shared Components
- **CardImage**: Card image display with WebP optimization and fallbacks
- **CardSearchModal**: Modal for card search
- **CardSearchDrawer**: Drawer-style card search interface
- **DecklistImage**: Deck list visualization
- **FormulaDisplay**: Mathematical formula visualization
- **Icon**: SVG icon component with accessibility

## 🎨 Styling

The app uses:
- **Tailwind CSS** for layout and utilities
- **Custom CSS variables** for theming (\`--bg-main\`, \`--text-main\`, etc.)
- **Geist font family** throughout
- **Dark theme** with specific color palette
- **Pill-shaped inputs** (40px height, 999px border-radius)

## 🗄️ Data Architecture

### Card Metadata
- **Primary**: Vercel Blob Storage (~26 MB, CDN cached)
- **Fallback**: YGOPro API
- **Cache**: 7-day localStorage

### Card Images
- **Primary**: Vercel Blob Storage (WebP format)
- **Fallback**: YGOPro API
- **Optimization**: Lazy loading, responsive sizing

### Static Database
- **Location**: \`/public/cardDatabase.json\` (2.1 MB)
- **Purpose**: Offline YDK parsing

## 📊 Performance

- Card search debounced (300ms) and limited to 50 results
- Monte Carlo: 100,000 iterations per calculation
- Results caching prevents redundant calculations
- Card database cached for 7 days
- Full database loads in ~500ms from Vercel CDN
- WebP card images with lazy loading

## 🔗 External Dependencies

- **Vercel Blob Storage**: Card metadata and images
- **YGOPro API**: Fallback for card data
- **Vercel Analytics**: Usage tracking
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS

## 📊 Refactoring Metrics

**Before Refactoring:**
- App.jsx: 3,677 lines
- Services: Embedded in App.jsx
- Components: 2 files
- Hooks: 0 custom hooks
- Maintainability: Low

**After Complete Refactoring (Phases 1-5):**
- App.jsx: **1,192 lines** (68% reduction!)
- Services: 7 separate files (with tests)
- Components: 25+ organized files
- Hooks: 9 custom hooks
- Utils: 2 utility modules
- Maintainability: High
- Code organization: Modular architecture

### Files Created:
- **7 Services**: CardDatabaseService, ProbabilityService, TitleGeneratorService, URLService, HandTrapService, YdkParser, OpeningHandService
- **25+ Components**: Organized across ui/, layout/, features/, and shared
- **9 Custom Hooks**: Complete state management extraction
- **2 Utils**: Validation helpers and combo factory

## 📝 License

MIT

## 🤝 Contributing

This project has been refactored from a monolithic 3,677-line component into a modular, maintainable architecture with custom hooks, separated services, and organized components. Contributions are welcome!

See [CLAUDE.md](CLAUDE.md) for detailed development guidance.
