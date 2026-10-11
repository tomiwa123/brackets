import { useEffect, useState } from 'react'
import { Check, Clipboard, Crown, Headphones, RotateCcw, Sparkles, UserPlus, Volume2, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  addGuest,
  advanceTurn,
  chooseCategory,
  createSpellingRoom,
  getRememberedSession,
  getSpellingPlayerId,
  joinCodeFromPath,
  joinSpellingRoom,
  judgeTurn,
  listenToSpellingRoom,
  reassignJudge,
  replayRoom,
  requestHint,
  skipWord,
  startSpellingGame,
  undoRuling,
} from './firestore'
import { eligibleTemporaryJudges, judgeIdForTurn, ROUND_LABELS, rankedPlayers, roundForTurn } from './gameEngine'
import type { Category, Hint, SpellingRoom } from './types'
import { CATEGORIES } from './types'
import { getWord } from './words'
import './spelling.css'

function messageFor(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const messages: Record<string, string> = {
    ROOM_NOT_FOUND: 'That room does not exist. Check the four-letter code.',
    ROOM_FULL: 'This room already has ten players.',
    GAME_STARTED: 'This game has already started.',
    NAME_TAKEN: 'That name is already in the room. Add an initial so everyone stays distinct.',
    NEED_PLAYERS: 'Add at least one more player before starting.',
    NEED_JUDGE: 'At least one other player must join on their phone so they can judge your turns.',
    HOST_ONLY: 'Only the host can do that.',
    JUDGE_ONLY: 'Only this turn’s judge can do that.',
    NOT_YOUR_TURN: 'The current speller chooses this category.',
  }
  return messages[message] ?? (message || 'Something went wrong. Please try again.')
}

function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.82
  utterance.pitch = 1
  const voices = window.speechSynthesis.getVoices()
  utterance.voice = voices.find((voice) => voice.lang.startsWith('en') && voice.name.includes('Samantha'))
    ?? voices.find((voice) => voice.lang.startsWith('en'))
    ?? null
  window.speechSynthesis.speak(utterance)
}

function Landing({ onEnter }: { onEnter: (code: string) => void }) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>(joinCodeFromPath ? 'join' : 'home')
  const [name, setName] = useState(getRememberedSession()?.name ?? '')
  const [code, setCode] = useState(joinCodeFromPath ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) return setError('Tell us what your friends call you.')
    if (mode === 'join' && code.trim().length !== 4) return setError('Room codes have four letters.')
    setBusy(true)
    setError('')
    try {
      const roomCode = mode === 'create'
        ? await createSpellingRoom(name)
        : (await joinSpellingRoom(code, name), code.trim().toUpperCase())
      window.history.replaceState({}, '', `/spelling/join/${roomCode}`)
      onEnter(roomCode)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="spell-shell spell-landing">
      <nav className="spell-nav"><span className="bee-mark">B</span><span>Spelling bee game night</span></nav>
      <section className="hero-card">
        <p className="eyebrow"><Sparkles size={15} /> Oakland · game night edition</p>
        <h1>Say it.<br /><em>Spell it.</em><br />Own the room.</h1>
        <p className="hero-copy">Three rounds. Six categories. No eliminations. Just smart words, good friends, and a little bit of menace.</p>
        {mode === 'home' ? (
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setMode('create')}>Host a game <span>→</span></button>
            <button className="secondary-button" onClick={() => setMode('join')}>Join with a code</button>
          </div>
        ) : (
          <div className="entry-card">
            <button className="back-link" onClick={() => setMode('home')}>← Back</button>
            <h2>{mode === 'create' ? 'Set the room in motion' : 'Join the room'}</h2>
            <label>Your name<input value={name} maxLength={28} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" autoFocus /></label>
            {mode === 'join' && <label>Room code<input className="code-input" value={code} maxLength={4} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="BZZZ" /></label>}
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" onClick={submit} disabled={busy}>{busy ? 'One sec…' : mode === 'create' ? 'Create room' : 'Join game'}</button>
          </div>
        )}
      </section>
      <div className="round-strip">
        <div><b>01</b><span>Warm-up</span><small>1 point</small></div>
        <div><b>02</b><span>Tricky</span><small>2 points</small></div>
        <div><b>03</b><span>Menace</span><small>3 points</small></div>
      </div>
    </main>
  )
}

function Scoreboard({ room, compact = false }: { room: SpellingRoom; compact?: boolean }) {
  return (
    <div className={compact ? 'scoreboard compact' : 'scoreboard'}>
      {rankedPlayers(room.players).map((player, index) => (
        <div className="score-row" key={player.id}>
          <span className="rank">{index + 1}</span><span className="score-name">{player.name}{player.id === room.hostId && <Crown size={13} />}</span><strong>{player.score}</strong>
        </div>
      ))}
    </div>
  )
}

function Lobby({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const isHost = room.hostId === me
  const [guest, setGuest] = useState('')
  const [copied, setCopied] = useState(false)
  const hasTemporaryJudge = eligibleTemporaryJudges(room).length > 0
  const link = `${window.location.origin}/spelling/join/${room.roomCode}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <main className="spell-shell lobby-page">
      <header className="room-header"><span className="bee-mark">B</span><div><small>Spelling bee game night</small><b>Lobby</b></div><span className="live-pill"><i /> Live</span></header>
      <section className="lobby-grid">
        <div className="room-code-card">
          <p className="eyebrow">Your room code</p>
          <div className="room-code">{room.roomCode}</div>
          <button className="copy-button" onClick={copyLink}>{copied ? <Check size={18} /> : <Clipboard size={18} />}{copied ? 'Copied' : 'Copy invite link'}</button>
          <div className="qr-wrap"><QRCodeSVG value={link} size={138} bgColor="transparent" fgColor="#12100d" /></div>
          <small>Friends can scan or visit the invite link.</small>
        </div>
        <div className="lobby-main">
          <div className="section-heading"><div><p className="eyebrow">The lineup</p><h1>{room.players.length} of 10 players</h1></div><span>{isHost ? 'You’re hosting' : 'You’re in'}</span></div>
          <div className="player-grid">
            {room.players.map((player, index) => <div className="player-chip" key={player.id}><b>{index + 1}</b><span>{player.name}</span>{player.id === room.hostId && <Crown size={16} />}{player.isGuest && <small>guest</small>}</div>)}
          </div>
          {isHost && room.players.length < 10 && <div className="add-guest"><UserPlus size={20} /><input value={guest} maxLength={28} onChange={(event) => setGuest(event.target.value)} placeholder="Add someone without a phone" /><button onClick={() => { if (guest.trim()) act(async () => { await addGuest(room.roomCode, me, guest); setGuest('') }) }}>Add</button></div>}
          <div className="rules-mini"><div><strong>3</strong><span>rounds each</span></div><div><strong>6</strong><span>categories</span></div><div><strong>0</strong><span>eliminations</span></div></div>
          {isHost ? <><button className="primary-button start-button" onClick={() => act(() => startSpellingGame(room.roomCode, me))} disabled={room.players.length < 2 || !hasTemporaryJudge}>Start the game <span>→</span></button>{room.players.length >= 2 && !hasTemporaryJudge && <p className="judge-requirement">One player needs to join on their phone so they can judge your turns.</p>}</> : <div className="waiting"><i /><span>Waiting for the host to start…</span></div>}
        </div>
      </section>
    </main>
  )
}

const categoryNotes: Record<Category, string> = {
  'Bay & Beyond': 'Place, coast & city life',
  'Internet Brain': 'Tech & online culture',
  'Passport Stamps': 'Well-traveled words',
  'Sound & Screen': 'Music, film & performance',
  'Words That Sound Fake': 'Real words. Allegedly.',
  "Dealer's Choice": 'Let fate decide',
}

function CategoryPicker({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const turn = room.currentTurn!
  const player = room.players.find((item) => item.id === turn.playerId)!
  const mayChoose = me === turn.playerId || me === room.hostId
  const round = roundForTurn(room.turnIndex, room.playerOrder.length)
  const judgeId = judgeIdForTurn(room)
  const judge = room.players.find((item) => item.id === judgeId)
  const usesTemporaryJudge = turn.playerId === room.hostId
  const canReassign = usesTemporaryJudge && me === room.hostId && eligibleTemporaryJudges(room).length > 1
  return (
    <main className="spell-shell game-page">
      <GameHeader room={room} />
      <section className="category-stage">
        <p className="eyebrow">Round {round} · {ROUND_LABELS[round - 1]}</p>
        <h1>{player.name}, pick your poison.</h1>
        <p>{mayChoose ? 'Choose the kind of trouble you want.' : `${player.name} is choosing a category…`}</p>
        {usesTemporaryJudge && judge && <div className="temporary-judge-banner"><div><small>Temporary judge</small><b>{judge.name} is judging this turn.</b></div>{canReassign && <button onClick={() => act(() => reassignJudge(room.roomCode, me))}>Change judge</button>}</div>}
        <div className="category-grid">
          {CATEGORIES.map((category, index) => <button key={category} disabled={!mayChoose} onClick={() => act(() => chooseCategory(room.roomCode, me, category))}><span>0{index + 1}</span><b>{category}</b><small>{categoryNotes[category]}</small></button>)}
        </div>
      </section>
    </main>
  )
}

function GameHeader({ room }: { room: SpellingRoom }) {
  const round = roundForTurn(room.turnIndex, room.playerOrder.length)
  return <header className="game-header"><span className="bee-mark">B</span><span>Round {round} / 3</span><b>{ROUND_LABELS[round - 1]}</b><span>Room {room.roomCode}</span></header>
}

function HintPanel({ title, body, open }: { title: string; body: string; open: boolean }) {
  return <div className={open ? 'hint-panel open' : 'hint-panel'}><b>{title}</b><p>{open ? body : 'Not requested yet'}</p></div>
}

function TurnView({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const turn = room.currentTurn!
  const word = getWord(turn.wordId)!
  const player = room.players.find((item) => item.id === turn.playerId)!
  const isHost = room.hostId === me
  const isSpeller = turn.playerId === me
  const judgeId = judgeIdForTurn(room)
  const judge = room.players.find((item) => item.id === judgeId)
  const isJudge = judgeId === me
  const usesTemporaryJudge = judgeId !== room.hostId
  const round = roundForTurn(room.turnIndex, room.playerOrder.length)
  const result = turn.ruling
  const request = (hint: Hint) => act(() => requestHint(room.roomCode, me, hint))

  return (
    <main className="spell-shell game-page">
      <GameHeader room={room} />
      <section className={isSpeller ? 'turn-grid speller-safe' : 'turn-grid'}>
        <div className="turn-main">
          <p className="eyebrow">Turn {room.turnIndex + 1} · {turn.category}</p>
          <h1>{isSpeller ? 'Your word is ready.' : <>{player.name} is spelling…</>}</h1>
          {isSpeller ? (
            <div className="secret-card"><Headphones size={34} /><h2>No peeking. You’ve got this.</h2><p>The word stays hidden on this screen.</p><button className="hear-button" onClick={() => speak(word.word)}><Volume2 size={20} /> Hear the word</button></div>
          ) : (
            <div className="word-card"><small>{word.pronunciation}</small><div className="big-word">{word.word}</div><button onClick={() => speak(word.word)}><Volume2 size={18} /> Play pronunciation</button></div>
          )}
          <div className="hint-grid">
            <HintPanel title="Definition" body={word.definition} open={turn.requestedHints.includes('definition')} />
            <HintPanel title="Origin story" body={word.origin} open={turn.requestedHints.includes('origin')} />
            <HintPanel title="In a sentence" body={word.sentence} open={turn.requestedHints.includes('sentence')} />
          </div>
          {(isSpeller || isHost) && !result && <div className="hint-actions"><button onClick={() => request('definition')}>Definition</button><button onClick={() => request('origin')}>Origin</button><button onClick={() => { request('sentence'); speak(word.sentence.replace('___', word.word)) }}>Use it in a sentence</button></div>}
        </div>
        <aside className="game-sidebar">
          <div className="points-card"><span>Worth</span><strong>{round}</strong><small>{round === 1 ? 'point' : 'points'}</small></div>
          <Scoreboard room={room} compact />
          {judge && <div className="judge-status"><small>{usesTemporaryJudge ? 'Temporary judge' : 'Judge'}</small><b>{judge.name}</b></div>}
          {isJudge && !result && <div className="judge-card"><p>{usesTemporaryJudge ? 'Your ruling' : 'Host ruling'}</p><button className="correct" onClick={() => act(() => judgeTurn(room.roomCode, me, true))}><Check /> Correct</button><button className="incorrect" onClick={() => act(() => judgeTurn(room.roomCode, me, false))}><X /> Not quite</button><button className="skip" onClick={() => act(() => skipWord(room.roomCode, me))}>Skip this word</button></div>}
        </aside>
      </section>
      {result && <div className={`result-overlay ${result}`}><div><span>{result === 'correct' ? '✓' : '×'}</span><p>{word.word}</p><h2>{result === 'correct' ? `That’s ${round} on the board!` : 'Not quite — next word, same energy.'}</h2>{(isJudge || isHost) ? <div className="result-actions">{isJudge && <button className="undo-button" onClick={() => act(() => undoRuling(room.roomCode, me))}><RotateCcw size={17} /> Undo</button>}{isHost && <button className="primary-button" onClick={() => act(() => advanceTurn(room.roomCode, me))}>Next turn →</button>}</div> : <small>Waiting for the host…</small>}</div></div>}
    </main>
  )
}

function FinalScreen({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const leaders = rankedPlayers(room.players)
  const topScore = leaders[0]?.score ?? 0
  const winners = leaders.filter((player) => player.score === topScore)
  return <main className="spell-shell final-page"><span className="bee-mark">B</span><p className="eyebrow"><Sparkles size={15} /> That’s the bee</p><h1>{winners.length > 1 ? 'A shared crown.' : `${winners[0]?.name} understood the assignment.`}</h1><p className="winner-copy">{winners.map((player) => player.name).join(' & ')} {winners.length > 1 ? 'finish tied at the top' : 'takes the night'} with {topScore} points.</p><div className="final-card"><Scoreboard room={room} /></div>{room.hostId === me && <button className="primary-button" onClick={() => act(() => replayRoom(room.roomCode, me))}>Play again with this crew</button>}</main>
}

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const [room, setRoom] = useState<SpellingRoom | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => listenToSpellingRoom(code, setRoom, setError), [code])

  const act = async (work: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError('')
    try { await work() } catch (caught) { setError(messageFor(caught)) } finally { setBusy(false) }
  }

  if (!room) return <main className="spell-shell loading-page"><span className="bee-mark">B</span><p>{error || 'Finding your room…'}</p>{error && <button onClick={onLeave}>Back to start</button>}</main>
  if (room.status === 'closed') return <main className="spell-shell loading-page"><p>This room has closed.</p><button onClick={onLeave}>Start over</button></main>

  return <>{error && <div className="toast-error">{error}<button onClick={() => setError('')}>×</button></div>}{room.status === 'lobby' ? <Lobby room={room} act={act} /> : room.status === 'finished' ? <FinalScreen room={room} act={act} /> : !room.currentTurn?.wordId ? <CategoryPicker room={room} act={act} /> : <TurnView room={room} act={act} />}</>
}

export function SpellingApp() {
  useEffect(() => {
    document.title = 'Spelling bee game night'
  }, [])
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    const remembered = getRememberedSession()
    return joinCodeFromPath && remembered?.roomCode === joinCodeFromPath ? joinCodeFromPath : null
  })
  return roomCode ? <Room code={roomCode} onLeave={() => { window.history.replaceState({}, '', '/spelling'); setRoomCode(null) }} /> : <Landing onEnter={setRoomCode} />
}
