# Tournament Brackets Application Summary

## What This Application Does

**Tournament Brackets** is a vibrant, interactive React web application that allows users to generate and play tournament-style voting games based on any topic. 

When a user enters a topic (e.g., "Greatest Midfielders" or "90s Hip Hop Artists"), the application uses AI (Google Gemini or OpenAI) to automatically generate 16 relevant candidates. These candidates are seeded into a classic single-elimination tournament bracket (Round of 16 → Quarterfinals → Semifinals → Finals). Users then vote in head-to-head matchups, exploring detailed AI-generated "scorecards" (bios, battle cries, and fun attributes) for each candidate, until a final champion is crowned.

The app features a striking "Sunset Arcade" retro aesthetic with neon colors (cyan and yellow) and smooth animations.

## How It Works

1. **Input Phase**: The user is presented with a text input to enter a topic. 
2. **Generation**: The app calls the configured AI provider to generate 16 candidates related to the topic. If configured, it also searches for real images using Google Custom Search, falling back to AI generation.
3. **Bracket Phase**: The 16 candidates are displayed in a bracket visualization, showing the tournament structure.
4. **Voting Phase**: The app iterates through the matches. In each match, the user is presented with two candidates. The app generates a "scorecard" comparing the two candidates in real-time. The user votes for their favorite, advancing them to the next round.
5. **Winner Phase**: After all rounds are completed, the final champion is celebrated with a dedicated winner view.

The application heavily relies on **Zustand** for global state management to handle the progression of the game phases and keep track of candidates, matches, and the current round.

## Key Files & Directories

### Root Directory
- **`package.json`**: Lists project dependencies including React, Framer Motion, Zustand, Tailwind CSS, and AI SDKs (`@google/generative-ai`, `openai`).
- **`README.md`**: Provides comprehensive documentation on setup, configuration, features, and the technology stack.
- **`vite.config.ts`**: Configuration file for the Vite build tool.

### `src/` Directory
The `src/` directory contains all the application source code:

- **`App.tsx`**: The main entry point for the UI. It uses the `AnimatePresence` from Framer Motion to smoothly transition between the four main game phases (`input`, `bracket`, `voting`, and `winner`).
- **`types.ts`**: Contains all the core TypeScript interfaces, including `Candidate`, `Match`, `Scorecard`, and the `GameState` shape. This serves as the data model for the application.

#### `src/store/`
- **`gameStore.ts`**: The central brain of the application. It defines the Zustand store that manages the game's state. It includes the logic for generating the bracket, enriching matchups with AI data, recording votes, and advancing rounds.

#### `src/services/`
This directory contains the business logic for external API integrations:
- **`generator.ts`**: Contains logic for generating candidates based on the topic.
- **`llm.ts`**: Handles the communication with the selected AI provider (Gemini or OpenAI).
- **`image.ts`**: Utilities for generating or fetching images for the candidates.

#### `src/components/`
Contains the React components that make up the user interface:
- **`Layout.tsx`**: The main wrapper providing the overall layout and settings modal access.
- **`TopicInput.tsx`**: The initial view for entering the tournament topic.
- **`BracketView.tsx`**: Renders the tournament tree visualization.
- **`MatchupView.tsx`**: The head-to-head voting interface where users compare candidates and cast their vote.
- **`WinnerView.tsx`**: The celebration screen for the tournament champion.
- **`SettingsModal.tsx`**: A modal allowing users to configure their AI API keys (stored locally in the browser).

## Technology Stack Summary
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **State Management**: Zustand
- **AI Integrations**: Google Gemini AI, OpenAI
- **Icons**: Lucide React
