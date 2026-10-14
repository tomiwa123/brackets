# Spelling Night — Product and Build Plan

_Prepared October 10, 2026 for the existing Brackets site._

## 1. The product in one sentence

A phone-friendly, in-person spelling party for roughly 5–10 friends: everyone gets the same number of turns, the active player chooses a category but never sees their word, and everyone else follows the word, hints, ruling, and score in real time.

The tone should be clever, warm, lightly competitive, and a little theatrical—not a school test and not a formal spelling bee. A complete game should take 20–35 minutes and coexist comfortably with other games happening around it.

## 2. Recommended game format

### Fairness and pacing

- Each registered person is placed in a round-robin turn order.
- The default game is **three rounds**, so everyone receives exactly three turns.
- Round 1 is **Warm-up** (1 point), Round 2 is **Tricky** (2 points), and Round 3 is **Menace** (3 points).
- Nobody is eliminated. Missing a word affects the score, not the right to keep playing.
- The host may reorder the queue before starting, but the game engine guarantees that nobody gets a fourth turn before everybody has had three.
- If first place is tied, only the tied players enter sudden death. They receive words of the same difficulty until the tie breaks.

This is preferable to lives or elimination: it preserves the user's strongest requirement—every person gets a real turn—and keeps late arrivals or weaker spellers socially comfortable.

### One turn

1. The next player sees **“Rithu, you’re up”** and six category cards.
2. They choose a category on their phone, or tell the host their choice if the host registered them as a phone-free guest.
3. The game draws an unused word at the current round's difficulty.
4. The speller's screen shows only the category, difficulty, and controls: **Hear it**, **Definition**, **Origin**, **Use it in a sentence**, and **Repeat**. It never renders the word or its letters.
5. Every other connected phone shows an **audience card** with the word prominently displayed, plus its pronunciation, definition, origin, example sentence, category, and difficulty. Hint details begin folded so the room can reveal only what the speller requests.
6. The speller says the letters aloud. The host taps **Correct** or **Not quite**; the app does not attempt speech recognition in v1.
7. The room sees a quick result animation, the scoreboard updates, and the next player is announced.

### Host powers

The host is the referee and recovery mechanism. They can add/edit names, mark attendance, reorder the queue before play, replay audio, rule correct/incorrect, undo the last ruling, skip a broken word without penalty, pause, hand off host control, and end the game. These controls prevent the app from becoming fragile during a real party.

## 3. Joining and identity

- The game lives at `https://brackets-jet.vercel.app/spelling`.
- A host creates a room and receives a four-letter code, join link, and QR code.
- Friends enter a display name on their own phones. No account is required.
- The host can also add a person manually. That person is a full participant even without a phone; the host performs their category selection and hint requests.
- Duplicate names are flagged, but a host may distinguish them with a last initial.
- Reconnecting from the same browser restores the same player identity.
- A disconnected player remains in the queue; the host can mark them away or skip that turn without consuming it.
- Joining closes when the game starts by default. The host may admit a late arrival between rounds, with a clear warning that the new player will receive make-up turns before the next round advances.

## 4. The six launch categories

The categories should feel native to a young, social, globally minded Bay Area friend group without reducing anyone to a demographic label.

1. **Bay & Beyond** — places, nature, transit, neighborhoods, and West Coast vocabulary; recognizable locally without becoming Oakland trivia.
2. **Internet Brain** — tech, online culture, design, gaming, and words people encounter on screens but rarely spell aloud.
3. **Passport Stamps** — words borrowed across languages, global food/place/cultural vocabulary, and satisfyingly surprising etymologies.
4. **Sound & Screen** — music, film, performance, media, and production vocabulary; broad rather than celebrity trivia.
5. **Science & Nature** — the living world, Earth, and the wider universe, calibrated from familiar concepts to deceptive technical spellings.
6. **Dealer’s Choice** — a balanced wildcard across the entire bank for players who want fate to decide.

Category affects flavor, not raw difficulty. Each category must contain a balanced supply across the three rounds. Round 1 is **Familiar with a wrinkle** (recognizable, with one small uncertainty); Round 2 is **Multiple plausible spellings** (silent letters, unusual clusters, misleading vowels, or borrowed patterns); Round 3 is **The pronunciation betrays you** (the spoken form conceals or misdirects major parts of the spelling). Avoid proper names, dialect policing, culturally loaded “gotcha” words, and words whose accepted spelling varies without the card explicitly allowing variants.

## 5. Word cards and content quality

Each curated word record contains:

- canonical spelling and accepted variants;
- category and difficulty;
- phonetic pronunciation plus optional audio asset;
- concise definition;
- language/root of origin and a one-line origin note;
- natural example sentence that does not reveal the spelling;
- content notes, alternate pronunciation, and source references;
- a stable ID so a word is not repeated within a room.

The current curated bank contains **180 reviewed words**: 12 words × 3 difficulty levels × 5 themed categories. Dealer’s Choice draws across those themes. Store the bank in version control rather than generating words live. Curated content makes difficulty, pronunciation, definitions, and origins dependable and lets the game work if an AI provider is unavailable.

Difficulty should be editorial, based on pronunciation/spelling mismatch, uncommon letter patterns, length, familiarity, and number of plausible wrong spellings. Length alone is not difficulty. A small internal validation script should reject missing fields, duplicate spellings, duplicate IDs, invalid category/difficulty values, and example sentences that accidentally contain the answer.

## 6. Audio and hints

- **MVP:** use the browser Web Speech API for “Hear it” and “Repeat,” with a visible fallback telling the host to pronounce the word if a device has no compatible voice.
- Choose and lock one English voice per device where possible so repeated taps do not change accents unexpectedly.
- Do not autoplay audio; mobile browsers frequently block it and the room should control timing.
- The definition, origin, and sentence are requestable hints, not penalties. That is authentic spelling-bee behavior and creates the nerdy shared card the user described.
- Audience screens show which hint was requested. The active speller hears/reads the hint content but never receives the answer text.
- A later polish pass can add recorded or dictionary-provider audio for consistent pronunciation, but gameplay must not depend on an external request succeeding.

## 7. Screen design

### Lobby

Large room code and QR, participant chips, **Add someone**, three-round summary, and one unmistakable **Start game** button. The host sees connection state; guests see “You’re in.”

### Speller view

Oversized player name, round/difficulty, six tactile category cards, then a minimal no-word card with the four hint/audio controls. It should be safe to hold this screen facing the speller.

### Audience view

“Rithu is spelling” header, huge answer word, pronunciation, collapsible definition/origin/sentence, turn number, and compact standings. When a hint is requested, its panel opens on every audience device.

### Host view

Audience card plus persistent **Correct**, **Not quite**, **Skip word**, and overflow controls. Require a short hold or confirmation for destructive actions such as ending the game; allow one-tap undo after a ruling.

### Result and scoreboard

A 1–2 second green/gold success burst or gentle red “not quite” reveal, then standings and next-up preview. Avoid humiliating sound effects. The final screen celebrates the winner, shows playful awards such as “Origin Story Enthusiast” or “Clutch Speller,” and offers **Play again with same group**.

## 8. Technical design in this repository

### Route and isolation

- Add a `/spelling` branch in `src/main.tsx`, before the default bracket app.
- Keep the feature under `src/spelling/` with its own components, Zustand store, types, word bank, tests, and Firestore adapter.
- Preserve the existing `/`, `/join/:code`, and `/transform` behavior.
- Use spelling-specific join links such as `/spelling/join/ABCD` so they cannot collide with bracket rooms.

### Firestore shape

Use a separate top-level collection, `spellingRooms`, rather than extending the bracket game's `rooms` documents.

```text
spellingRooms/{roomCode}
  status, hostId, settings, playerOrder, round, turnIndex,
  activePlayerId, activeWordId, requestedHints, scores,
  usedWordIds, revision, createdAt, updatedAt

spellingRooms/{roomCode}/players/{playerId}
  name, joinedAt, connectedAt, role, present

spellingRooms/{roomCode}/events/{eventId}
  kind, actorId, turnId, payload, createdAt
```

Use Firestore transactions for joining, drawing/starting a turn, and applying a ruling. Include a monotonically increasing `revision` or unique `turnId` so double taps and stale clients cannot score a word twice. Persist an event log to support undo and post-game awards.

### Word secrecy

This is a casual, trusted-room game. UI-level role separation is sufficient for launch: the speller component never renders the answer, while audience/host components do. However, if the full room document contains `activeWordId`, a determined player could inspect network traffic or Firestore directly. The product should state this honestly in technical documentation.

If tamper-resistant secrecy becomes important later, move word selection and role-scoped delivery behind a server endpoint with authenticated participant tokens; do not pretend client-side hiding is security.

### Rules and resilience

- Add narrowly scoped Firestore rules for `spellingRooms`; do not reuse the current permissive `rooms` rule by accident.
- Enforce room capacity, valid statuses, field allowlists, string/array size bounds, and host-only state transitions as far as the chosen anonymous identity model permits.
- Keep the word bank in the deployed client for offline resilience, but make the host the authority that chooses the word and advances state.
- If Firestore disconnects, show **Reconnecting** and freeze rulings rather than allowing divergent local scores.
- Keep the game state small; do not write presence heartbeats every second.

## 9. MVP scope and later polish

### MVP — ship this first

- `/spelling` create/join flow with code, link, and QR.
- Up to ten named players, including host-added guests.
- Guaranteed three-round turn queue and late/disconnected-player controls.
- Six category choices and three difficulty tiers.
- Curated word cards with audio, definition, origin, and sentence.
- Role-aware speller, audience, and host screens.
- Host rulings, skip, undo, scoring, tie-break, final standings, replay.
- Dedicated Firestore collection/rules plus emulator tests.
- Mobile QA on iPhone and Android; two-tab and reconnect tests.

### Phase 2 — only after a real game night

- Emoji reactions and a restrained room soundboard.
- Team mode (pairs or two sides).
- Recorded/dictionary audio and host-selectable voice/accent.
- More category packs and a simple private word-pack editor.
- Spectator mode and a TV/shared-screen presentation view.
- Post-game recap with hardest word, biggest comeback, and playful awards.

Do not put chat, AI-generated live word cards, speech-recognition judging, profiles, season-long stats, or elaborate cosmetics into v1. They add fragility without improving the central room experience.

## 10. Delivery sequence and acceptance checks

### Milestone 1 — vertical slice (1–2 focused days)

Route, local seed bank, create/join lobby, participant registration, one complete role-aware turn, host ruling, and basic score update. Test with three browser tabs.

### Milestone 2 — complete game (2–3 focused days)

Round-robin engine, all categories/difficulties, three rounds, hint synchronization, skip/undo, disconnect recovery, final standings, replay, and tie-break behavior.

### Milestone 3 — content and party polish (2–4 focused days)

Finish/review the 270-word bank, tune audio fallbacks, add QR and transitions, test ten-player payloads, deploy rules, run a real-device rehearsal, and fix the friction observed.

A credible polished MVP is therefore roughly **one focused week**, with the first playable vertical slice available much sooner. Content review—not routing—is likely to be the longest quality-critical task.

The release is ready when:

- ten distinct names can join or be host-added;
- each player receives exactly three turns before any tie-break;
- the current speller never sees the answer in normal UI;
- every other device follows the player, word, requested hint, ruling, and score within a few seconds;
- no word repeats within a room;
- double taps cannot double-score;
- a reload/reconnect restores role and current turn;
- audio failure never blocks play;
- skip and undo recover from a bad card or referee mistake;
- existing bracket and transformation routes still pass smoke tests.

## 11. Decisions locked by this plan

- Individual points, not elimination.
- Three guaranteed turns per person.
- Difficulty rises by round and controls point value.
- Category is chosen each turn from six launch options.
- Host judges spoken spelling; no speech recognition in v1.
- Word cards are curated and versioned; AI is not in the live gameplay loop.
- Phones are optional for participation but useful for private role views.
- The speller sees hints and controls, never the answer; everyone else follows on an audience card.
- The game ships inside the existing Vercel app and Firebase project, isolated at `/spelling` and `spellingRooms`.
