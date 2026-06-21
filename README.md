# 🏆 Tournament Brackets

A vibrant, interactive parlour game to compare members of a group in a tournament-style voting bracket. Enter any topic, and watch as AI generates 16 unique candidates that battle it out in head-to-head matchups until a champion emerges!

## ✨ Features

- **AI-Powered Generation**: Automatically generates 16 relevant candidates for any topic using Google Gemini or OpenAI.
- **BYOK Support (Bring Your Own Key)**: Full support for OpenAI (`sk-`) and Gemini (`AIza`) keys stored securely in your browser's `localStorage`.
- **Multi-Tiered Orchestration**: Seamlessly switches between direct client-side generation and a secure backend fallback.
- **Safety/Moderation Layer**: Integrated topic appropriateness checks to ensure high-quality, safe competition.
- **Robust Fallback System**: Built-in "Classic Mock" contingency ensures the game remains playable even without an active LLM connection.
- **Tournament-Style Voting**: Classic single-elimination bracket with 16 candidates (Round of 16 → Quarterfinals → Semifinals → Finals)
- **Rich Candidate Profiles**: Each matchup features AI-generated scorecards with:
  - Battle cries and catchphrases
  - Detailed bios
  - Fun attributes and characteristics
- **Stunning Retro Aesthetic**: "Sunset Arcade" theme with vibrant electric cyan and bright yellow accents
- **Smooth Animations**: Powered by Framer Motion for fluid transitions between game phases
- **Interactive Bracket Visualization**: See the entire tournament structure and track progress in real-time

## 🎮 How to Play

1. **Enter a Topic**: Type any category (e.g., "Greatest Midfielders", "90s Hip Hop Artists", "Sci-Fi Movies")
2. **View the Bracket**: See all 16 AI-generated candidates seeded in a tournament bracket
3. **Vote in Matchups**: Choose your favorite in each head-to-head battle
4. **Crown a Champion**: Progress through all rounds until one winner remains!

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **State Management**: Zustand
- **AI Integration**: 
  - Google Gemini AI (`@google/generative-ai`)
  - OpenAI API (optional alternative)
- **Icons**: Lucide React

## 📦 Installation

### Prerequisites

- Node.js (v20 or higher required, v22+ recommended)
- npm or yarn package manager

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd brackets
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AI Provider (Optional)**
   
   The app works with mock data by default, but for the full AI experience:
   
   - Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey) (Gemini) or [OpenAI](https://platform.openai.com/api-keys)
   - When you first run the app, click the settings icon (⚙️) in the top-right corner
   - Enter your API key and select your preferred provider (Gemini or OpenAI)
   - Your key is stored locally in your browser

4. **Configure Google Image Search (Optional)**
   
   To use real images for candidates instead of AI-generated content:
   
   1. **Get an API Key**: Create a project in the [Google Cloud Console](https://console.cloud.google.com/) and enable the **Custom Search API**. Create an API key under "Credentials".
   2. **Create a Search Engine**: Go to [Programmable Search Engine](https://programmablesearchengine.google.com/) and create a new search engine.
      - Under "What to search", select "Search the entire web".
      - Enable **"Image search"**.
      - Copy the **Search engine ID** (cx).
   3. **Add to App**: In the app settings (⚙️), enter both the **Google Custom Search API Key** and the **Search Engine ID (cx)**.

   > [!NOTE]
   > If Google Image Search is not configured or an error occurs, the app automatically falls back to AI-generated images using your selected provider.

## 🚀 Running the Application (Full-Stack Setup)

This application uses a modern **Vite Frontend + Vercel Serverless Backend** architecture to securely manage AI API keys and enforce true global rate limiting. Because of the secure `api/` folder, you cannot use standard `npm run dev` to start the app.

### 1. Initial Vercel CLI Setup (One-time)
Install the Vercel CLI globally:
```bash
npm i -g vercel
```

Link your local project to your Vercel project:
```bash
vercel link
```

Pull down the secure environment variables (your LLM API keys and Redis credentials):
```bash
vercel env pull .env.local
```

### 2. Starting the Local Environment
To start the application locally with both the React frontend and the secure serverless backend running simultaneously, use:
```bash
vercel dev
```

The app will be available at `http://localhost:3000`.

### Production Build
Build the optimized production bundle (handled automatically by Vercel on push):
```bash
npm run build
```

### Linting

Check code quality with ESLint:

```bash
npm run lint
```

## 📁 Project Structure

```
brackets/
├── src/
│   ├── components/          # React components
│   │   ├── BracketView.tsx  # Tournament bracket visualization
│   │   ├── Layout.tsx       # Main layout wrapper
│   │   ├── MatchupView.tsx  # Head-to-head voting interface
│   │   ├── SettingsModal.tsx # API key configuration
│   │   ├── TopicInput.tsx   # Topic entry screen
│   │   └── WinnerView.tsx   # Champion celebration screen
│   ├── services/            # Business logic
│   │   ├── generator.ts     # Candidate generation
│   │   ├── image.ts         # Image generation utilities
│   │   └── llm.ts          # AI provider integration
│   ├── store/              # State management
│   │   └── gameStore.ts    # Zustand game state
│   ├── types.ts            # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html             # HTML entry point
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── vite.config.ts         # Vite build configuration
```

## 🎨 Design Philosophy

The app features a bold **"Sunset Arcade"** aesthetic inspired by retro gaming:

- **Color Palette**: Electric cyan (`#00FFFF`), bright yellow (`#FFFF00`), and vibrant gradients
- **Typography**: Bold, italic, uppercase text with dramatic shadows and glows
- **Animations**: Smooth transitions, hover effects, and micro-interactions
- **Visual Effects**: Glassmorphism, neon glows, and gradient overlays

## 🔧 Configuration

### AI Provider Settings

Settings are stored in browser localStorage:
- `llm_provider`: `"gemini"` or `"openai"`
- `llm_api_key`: Your AI provider API key
- `google_search_key`: Your Google Custom Search API key
- `google_search_cx`: Your Google Search Engine ID

### Customization

- **Theme Colors**: Edit `tailwind.config.js` and component styles
- **Mock Data**: Modify `MOCK_MIDFIELDERS` in `src/services/generator.ts`
- **Animation Timing**: Adjust Framer Motion variants in components

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 License

This project is open source and available under the MIT License.

## 🎯 Roadmap & Planned Work

Based on previous audit recommendations, here is the status of planned work and upcoming features:

### 🟢 Completed Features & Easy Wins
- [x] **State Hydration / Checkpointing**: App state is preserved in `localStorage` using Zustand middleware, preventing progress loss on accidental refreshes.
- [x] **Variable Bracket Sizes (8 vs 16)**: Users can select an 8 or 16 candidate bracket to save API credits and speed up gameplay (32 and 64 candidate brackets are intentionally excluded to keep matches concise).
- [x] **Enhanced Keyboard Accessibility**: Arrow keys can be used to vote and select candidates.
- [x] **Basic Error Catching & LLM Fallbacks**: Try/catch handlers and fallback models are active, along with local static mock data if LLM keys are missing.
- [x] **Content Moderation**: Safety layers check topic appropriateness before generating candidates.

### 🟡 High Priority (Up Next)
- [ ] **Share Results on Social Media**: Enhance the winner screen to support direct sharing of results.
- [ ] **Mobile-Friendliness & Responsiveness**: Optimize the layout and interactive bracket views specifically for mobile browsers.

### 🔴 Future Enhancements & Nice-to-Haves
- [ ] **Pre-Tournament Customization (Manual Editing)**: Allow hosts to manually click and edit candidate names before starting the bracket to fix undesired AI generation without burning additional credits.
- [ ] **Export Bracket as Image**: Download the final bracket visualization.
- [ ] **Sound Effects & Background Music**: Add immersive retro arcade sounds.
- [ ] **Save Tournament History**: Database persistence to track past winners.
- [ ] **Multiplayer Voting Mode**: WebSockets room system for group plays.

---

**Built with ❤️ using React, TypeScript, and AI**
