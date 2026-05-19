# Tournament Brackets Application Recommendations (Prioritized for Live Demo)

Based on your upcoming live demo with friends and limited API credits, here is a reorganized list of recommendations ranked by priority. The focus is on **stability**, **cost-saving**, and **quick implementation** ("Easy Wins").

## 🟢 High Priority (Easy Wins & Essential for Demo)

### 1. State Hydration / Checkpointing (Demo Saver)
**Why:** If you accidentally refresh the browser or the app crashes mid-game, you lose the bracket and have to spend more API credits to regenerate it.
**The Easy Win:** `Zustand` has a built-in `persist` middleware. You can easily wrap your `gameStore` to automatically save the current game state to `localStorage`. When the app loads, it will instantly resume where you left off.

### 2. Variable Bracket Sizes (Credit Saver)
**Why:** Generating 16 candidates and their matchups consumes a lot of API tokens. 
**The Easy Win:** Allow users to select an 8-candidate bracket instead of 16. This instantly cuts your API credit consumption in half per game and makes the demo faster and punchier.

### 3. Pre-Tournament Customization / Manual Editing (Credit Saver)
**Why:** If the AI generates a candidate you don't like, you don't want to regenerate the entire 16-candidate list and burn credits.
**The Easy Win:** Add a quick "Edit Phase" before the bracket starts. Let the host click on a candidate's name and manually type a replacement. No extra API calls needed.

### 4. Basic Error Catching & Fallbacks (Demo Saver)
**Why:** With limited credits and free-tier APIs, you might hit rate limits or timeouts during the live demo. 
**The Easy Win:** Wrap your API calls in `try/catch` blocks. If it fails, show a friendly toast notification ("API taking a break, let's try again in a sec!") instead of breaking the app. For images, if the search fails, ensure it smoothly falls back to a cool neon placeholder without crashing.

---

## 🟡 Medium Priority (Nice-to-Haves for the Demo)

### Shareable Results
**Why:** At the end of the tournament, friends might want a picture of the final bracket to remember the bizarre outcome.
**The Easy Win:** Ensure the `WinnerView` and the final `BracketView` fit nicely on a single screen so you can easily take an OS-level screenshot. Alternatively, add a simple "Copy Bracket to Clipboard" button that formats the final results as text.

### Enhanced Keyboard Accessibility
**Why:** During a live demo (especially if casting to a TV), clicking buttons can be tedious.
**The Easy Win:** Bind the Left/Right arrow keys to vote for candidate A or B during the `MatchupView`. This makes progressing through the matchups much faster and feels more like an arcade game.

---

## 🔴 Low Priority (Future Enhancements)

*These features are great for a full product launch but should be skipped for a quick demo with friends.*

- **Real-Time Multiplayer (WebSockets):** Building a Jackbox-style room system takes too much time. For the demo, simply screen-share or cast to a TV and have friends yell out their votes!
- **Persistent History & Leaderboards:** Saving all past tournaments to a database is overkill for a one-off demo.
- **Progressive Web App (PWA):** Making it installable on phones isn't necessary right now.
- **Content Moderation:** Since you're playing with friends, you can skip a complex moderation layer and just rely on the LLM's built-in safety filters.
