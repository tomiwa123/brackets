import { useEffect, useState, type CSSProperties } from 'react'
import { BellRing, Check, Clipboard, Crown, Headphones, MonitorUp, Pencil, RotateCcw, Settings2, ShieldCheck, Shuffle, Sparkles, Star, Trophy, UserPlus, Users, Volume2, X, Zap } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  addGuest,
  activateSaveTheBee,
  advanceTurn,
  buzzFaceOff,
  chooseCategory,
  chooseFaceOffRallyCategory,
  createSpellingRoom,
  declineSaveTheBee,
  getRememberedSession,
  getSpellingPlayerId,
  joinCodeFromPath,
  judgeFaceOff,
  joinSpellingRoom,
  judgeTurn,
  listenToSpellingRoom,
  movePlayerToTeam,
  presentationCodeFromPath,
  reassignJudge,
  resetFaceOffBuzz,
  renameTeam,
  replayRoom,
  requestHint,
  setGameMode,
  setTeamColor,
  shuffleTeamAssignments,
  skipWord,
  startSpellingGame,
  undoRuling,
  unlockFaceOff,
} from './firestore'
import {
  eligibleTemporaryJudges,
  gameMode,
  judgeIdForTurn,
  rankedPlayers,
  rankedTeams,
  remainingSaveTokens,
  ROUND_LABELS,
  roundForTurn,
  teamForPlayer,
  canRenameTeam,
} from './gameEngine'
import type { Category, Hint, SpellingRoom } from './types'
import { CATEGORIES } from './types'
import { getWord } from './words'
import { MAX_PLAYERS } from './config'
import './spelling.css'

function messageFor(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const messages: Record<string, string> = {
    ROOM_NOT_FOUND: 'That room does not exist. Check the four-letter code.',
    ROOM_FULL: `This room already has ${MAX_PLAYERS} players.`,
    GAME_STARTED: 'This game has already started.',
    NAME_TAKEN: 'That name is already in the room. Add an initial so everyone stays distinct.',
    NEED_PLAYERS: 'Add at least one more player before starting.',
    NEED_JUDGE: 'At least one other player must join on their phone so they can judge your turns.',
    NEED_TEAMS: 'Team Showdown needs at least four players and someone on each team.',
    HOST_ONLY: 'Only the host can do that.',
    JUDGE_ONLY: 'Only this turn’s judge can do that.',
    NOT_YOUR_TURN: 'The current speller chooses this category.',
    TEAM_ONLY: 'Only the active team can call Save the Bee.',
    NO_SAVE_TOKENS: 'That team has used every Save the Bee token for this round.',
    BUZZER_ONLY: 'Only the two face-off representatives can use the buzzer.',
    TEAM_NAME_FORBIDDEN: 'Only members of this team or the host can rename it.',
    TEAM_NAME_REQUIRED: 'Team names cannot be blank.',
    TEAM_NAME_TOO_LONG: 'Keep team names to 24 characters or fewer.',
    TEAM_NAME_TAKEN: 'The two teams need different names.',
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
        <p className="hero-copy">Three rounds. Five themes plus Dealer’s Choice. No eliminations. Just smart words, good friends, and a little bit of menace.</p>
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
        <div><b>01</b><span>Familiar with a wrinkle</span><small>1 point</small></div>
        <div><b>02</b><span>Multiple plausible spellings</span><small>2 points</small></div>
        <div><b>03</b><span>Pronunciation betrays you</span><small>3 points</small></div>
      </div>
    </main>
  )
}

function Scoreboard({ room, compact = false }: { room: SpellingRoom; compact?: boolean }) {
  if (gameMode(room) === 'team') {
    return (
      <div className={compact ? 'scoreboard compact team-scoreboard' : 'scoreboard team-scoreboard'}>
        {rankedTeams(room.teams).map((team, index) => (
          <div className="score-row team-score-row" key={team.id} style={{ '--team-color': team.color } as CSSProperties}>
            <span className="rank">{index + 1}</span><span className="team-dot" /><span className="score-name">{team.name}</span><strong>{team.score}</strong>
          </div>
        ))}
      </div>
    )
  }
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

function TeamNameEditor({ room, teamId }: { room: SpellingRoom; teamId: 'honey' | 'blue' }) {
  const me = getSpellingPlayerId()
  const team = room.teams.find((item) => item.id === teamId)!
  const mayEdit = canRenameTeam(room, me, teamId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(team.name)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const cancel = () => {
    setDraft(team.name)
    setError('')
    setEditing(false)
  }

  const save = async () => {
    setError('')
    setSaved(false)
    try {
      await renameTeam(room.roomCode, me, teamId, draft)
      setEditing(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch (caught) {
      setError(messageFor(caught))
    }
  }

  return (
    <div className="team-name-control">
      <span className="team-name-label">Name your team</span>
      {editing ? (
        <div className="team-name-edit">
          <input
            className="team-name-input"
            value={draft}
            maxLength={24}
            aria-label={`${team.name} team name`}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save()
              if (event.key === 'Escape') cancel()
            }}
          />
          <div className="team-name-actions">
            <button className="team-name-save" onClick={() => void save()}><Check size={15} /> Save</button>
            <button onClick={cancel}><X size={15} /> Cancel</button>
          </div>
        </div>
      ) : (
        <div className="team-name-display">
          <h3>{team.name}</h3>
          {mayEdit && <button aria-label={`Edit ${team.name} team name`} onClick={() => { setDraft(team.name); setError(''); setEditing(true) }}><Pencil size={15} /> Edit</button>}
        </div>
      )}
      {error && <small className="team-name-error">{error}</small>}
      {saved && <small className="team-name-success"><Check size={13} /> Team name updated</small>}
      {!mayEdit && <small className="team-name-owner">Members of this team choose its name.</small>}
    </div>
  )
}

function TeamSetup({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const isHost = room.hostId === me
  return (
    <section className="team-setup">
      <div className="team-setup-heading">
        <div><p className="eyebrow"><Users size={15} /> Team Showdown</p><h2>Choose your sides.</h2></div>
        {isHost && <button className="shuffle-button" onClick={() => act(() => shuffleTeamAssignments(room.roomCode, me))}><Shuffle size={16} /> Shuffle teams</button>}
      </div>
      <div className="team-columns">
        {room.teams.map((team) => (
          <div className="team-column" key={team.id} style={{ '--team-color': team.color } as CSSProperties}>
            <div className="team-identity"><TeamNameEditor room={room} teamId={team.id} />{isHost && <input className="team-color-input" type="color" value={team.color} aria-label={`${team.name} team color`} onChange={(event) => act(() => setTeamColor(room.roomCode, me, team.id, event.target.value))} />}</div>
            <div className="team-roster">
              {room.players.filter((player) => player.teamId === team.id).map((player) => (
                <button key={player.id} disabled={!isHost} onClick={() => act(() => movePlayerToTeam(room.roomCode, me, player.id, team.id === 'honey' ? 'blue' : 'honey'))}>
                  <span>{player.name}</span>{player.id === room.hostId && <Crown size={13} />}{isHost && <small>Move →</small>}
                </button>
              ))}
              {!room.players.some((player) => player.teamId === team.id) && <p>No players yet</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="team-help">Every player gets one rally turn per round. Save the Bee supplies grow from 1 to 2 to 3 tokens.</p>
    </section>
  )
}

function Lobby({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const isHost = room.hostId === me
  const [guest, setGuest] = useState('')
  const [copied, setCopied] = useState(false)
  const hasTemporaryJudge = eligibleTemporaryJudges(room).length > 0
  const isTeam = gameMode(room) === 'team'
  const teamsReady = !isTeam || (room.players.length >= 4 && room.teams.every((team) => room.players.some((player) => player.teamId === team.id)))
  const link = `${window.location.origin}/spelling/join/${room.roomCode}`
  const displayLink = `${window.location.origin}/spelling/present/${room.roomCode}`

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
          {isTeam && <button className="copy-button display-link" onClick={() => window.open(displayLink, '_blank')}><MonitorUp size={18} /> Open presentation screen</button>}
          <div className="qr-wrap"><QRCodeSVG value={link} size={138} bgColor="transparent" fgColor="#12100d" /></div>
          <small>Friends can scan or visit the invite link.</small>
        </div>
        <div className="lobby-main">
          <div className="mode-picker">
            <div><p className="eyebrow">Game format</p><h2>{isTeam ? 'Team Showdown' : 'Classic'}</h2></div>
            {isHost ? <div className="mode-buttons"><button className={!isTeam ? 'selected' : ''} onClick={() => act(() => setGameMode(room.roomCode, me, 'classic'))}>Classic</button><button className={isTeam ? 'selected' : ''} onClick={() => act(() => setGameMode(room.roomCode, me, 'team'))}><Users size={16} /> Team Showdown</button></div> : <span>{isTeam ? 'Two teams · shared score' : 'Individual scores'}</span>}
          </div>
          <div className="section-heading"><div><p className="eyebrow">The lineup</p><h1>{room.players.length} of {MAX_PLAYERS} players</h1></div><span>{isHost ? 'You’re hosting' : 'You’re in'}</span></div>
          <div className="player-grid">
            {room.players.map((player, index) => <div className="player-chip" key={player.id}><b>{index + 1}</b><span>{player.name}</span>{player.id === room.hostId && <Crown size={16} />}{player.isGuest && <small>guest</small>}</div>)}
          </div>
          {isHost && room.players.length < MAX_PLAYERS && <div className="add-guest"><UserPlus size={20} /><input value={guest} maxLength={28} onChange={(event) => setGuest(event.target.value)} placeholder="Add someone without a phone" /><button onClick={() => { if (guest.trim()) act(async () => { await addGuest(room.roomCode, me, guest); setGuest('') }) }}>Add</button></div>}
          {isTeam && <TeamSetup room={room} act={act} />}
          <div className="rules-mini"><div><strong>3</strong><span>rounds each</span></div><div><strong>{isTeam ? '2' : '6'}</strong><span>{isTeam ? 'teams' : 'categories'}</span></div><div><strong>0</strong><span>eliminations</span></div></div>
          {isHost ? <><button className="primary-button start-button" onClick={() => act(() => startSpellingGame(room.roomCode, me))} disabled={room.players.length < 2 || !hasTemporaryJudge || !teamsReady}>Start {isTeam ? 'Team Showdown' : 'the game'} <span>→</span></button>{room.players.length >= 2 && !hasTemporaryJudge && <p className="judge-requirement">One player needs to join on their phone so they can judge your turns.</p>}{isTeam && !teamsReady && <p className="judge-requirement">Team Showdown needs at least four players and someone on each team.</p>}</> : <div className="waiting"><i /><span>Waiting for the host to start…</span></div>}
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
  'Science & Nature': 'The living and physical world',
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
  const team = teamForPlayer(room, player.id)
  return (
    <main className="spell-shell game-page">
      <GameHeader room={room} />
      <section className="category-stage">
        <p className="eyebrow">Round {round} · {ROUND_LABELS[round - 1]}</p>
        <h1>{player.name}, pick your poison.</h1>
        {team && <p className="active-team"><span style={{ background: team.color }} /> Representing {team.name}</p>}
        <p>{mayChoose ? 'Choose the kind of trouble you want.' : `${player.name} is choosing a category…`}</p>
        {usesTemporaryJudge && judge && <div className="temporary-judge-banner"><div><small>Temporary judge</small><b>{judge.name} is judging this turn.</b></div>{canReassign && <button onClick={() => act(() => reassignJudge(room.roomCode, me))}>Change judge</button>}</div>}
        <div className="category-grid">
          {CATEGORIES.map((category, index) => <button key={category} disabled={!mayChoose} onClick={() => act(() => chooseCategory(room.roomCode, me, category))}><span>0{index + 1}</span><b>{category}</b><small>{categoryNotes[category]}</small></button>)}
        </div>
      </section>
    </main>
  )
}

function FaceOffView({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const faceOff = room.faceOff!
  const me = getSpellingPlayerId()
  const word = getWord(faceOff.wordId)!
  const representatives = faceOff.representativeIds
    .map((id) => room.players.find((player) => player.id === id))
    .filter((player) => Boolean(player))
  const attempting = room.players.find((player) => player.id === faceOff.attemptPlayerId)
  const judge = room.players.find((player) => player.id === faceOff.judgeId)
  const isJudge = faceOff.judgeId === me
  const isHost = room.hostId === me
  const isRepresentative = faceOff.representativeIds.includes(me)
  const winnerTeam = room.teams.find((team) => team.id === faceOff.winnerTeamId)
  const mayChooseCategory = isHost || Boolean(winnerTeam && room.players.find((player) => player.id === me)?.teamId === winnerTeam.id)
  const stageCopy = faceOff.kind === 'tiebreak' ? 'Sudden death' : `Round ${faceOff.round} face-off`

  return (
    <main className="spell-shell game-page faceoff-page">
      <GameHeader room={room} />
      <section className="faceoff-stage">
        <p className="eyebrow"><Zap size={15} /> {stageCopy} · {faceOff.category}</p>
        <h1>{faceOff.status === 'category' ? (winnerTeam ? `${winnerTeam.name} take control.` : 'No bonus this time.') : 'Step up to the buzzers.'}</h1>
        <div className="faceoff-podiums">
          {representatives.map((player) => {
            if (!player) return null
            const team = room.teams.find((item) => item.id === player.teamId)!
            const isActive = attempting?.id === player.id
            return <div className={isActive ? 'faceoff-podium active' : 'faceoff-podium'} key={player.id} style={{ '--team-color': team.color } as CSSProperties}><small>{team.name}</small><b>{player.name}</b>{faceOff.buzzedPlayerId === player.id && <span><BellRing size={17} /> Buzzed first</span>}</div>
          })}
        </div>

        {faceOff.status === 'ready' && <div className="faceoff-control"><div className="readiness"><span>3</span><span>2</span><span>1</span></div><p>The judge plays the word, then opens both buzzers.</p>{isJudge ? <><div className="secret-answer"><small>Judge only</small><b>{word.word}</b><span>{word.pronunciation}</span></div><div className="faceoff-actions"><button onClick={() => speak(word.word)}><Volume2 size={18} /> Play word</button><button className="primary-button" onClick={() => act(() => unlockFaceOff(room.roomCode, me))}>Unlock buzzers <Zap size={18} /></button></div></> : <p className="waiting-copy">{judge?.name} is preparing the word…</p>}</div>}

        {faceOff.status === 'open' && <div className="buzzer-stage"><p>The word has finished. Buzz when you are ready to spell.</p>{isRepresentative ? <button className="giant-buzzer" onClick={() => act(() => buzzFaceOff(room.roomCode, me))}><BellRing /> BUZZ</button> : <div className="buzzer-open"><Zap size={34} /><b>Buzzers are live</b><span>Waiting for a representative…</span></div>}{isHost && <div className="manual-buzzers"><small>Host manual override</small>{representatives.map((player) => player && <button key={player.id} onClick={() => act(() => buzzFaceOff(room.roomCode, me, player.id))}>{player.name}</button>)}</div>}</div>}

        {(faceOff.status === 'attempt' || faceOff.status === 'steal') && <div className="faceoff-control"><p className="attempt-copy">{faceOff.status === 'steal' ? 'Steal attempt:' : 'First attempt:'} <b>{attempting?.name}</b> spells aloud.</p>{isJudge ? <><div className="secret-answer"><small>Judge only</small><b>{word.word}</b><span>{word.pronunciation}</span></div><div className="faceoff-actions"><button className="correct" onClick={() => act(() => judgeFaceOff(room.roomCode, me, true))}><Check /> Correct</button><button className="incorrect" onClick={() => act(() => judgeFaceOff(room.roomCode, me, false))}><X /> Not quite</button></div></> : <p className="waiting-copy">{judge?.name} has the answer and will rule.</p>}{isHost && <button className="reset-buzz" onClick={() => act(() => resetFaceOffBuzz(room.roomCode, me))}><RotateCcw size={16} /> Reset false start</button>}</div>}

        {faceOff.status === 'category' && <div className="faceoff-category"><p className="answer-reveal">The word was <b>{word.word}</b>.</p><h2>{winnerTeam ? `${winnerTeam.name}, choose the opening category.` : 'Host, choose the opening category.'}</h2><p>The first two rally spellers will receive this category.</p><div className="faceoff-category-grid">{faceOff.categoryOptions.map((category) => <button key={category} disabled={!mayChooseCategory} onClick={() => act(() => chooseFaceOffRallyCategory(room.roomCode, me, category))}><b>{category}</b><small>{categoryNotes[category]}</small></button>)}</div></div>}
      </section>
    </main>
  )
}

function GameHeader({ room }: { room: SpellingRoom }) {
  const round = room.faceOff?.round ?? roundForTurn(room.turnIndex, room.playerOrder.length)
  return <header className="game-header"><span className="bee-mark">B</span><span>Round {round} / 3</span><b>{ROUND_LABELS[round - 1]}</b>{gameMode(room) === 'team' && <div className="header-scores">{room.teams.map((team) => <span key={team.id} style={{ borderColor: team.color }}>{team.name} <strong>{team.score}</strong></span>)}</div>}<span>Room {room.roomCode}</span></header>
}

function HintPanel({ title, body, open }: { title: string; body: string; open: boolean }) {
  return <div className={open ? 'hint-panel open' : 'hint-panel'}><b>{title}</b><p>{open ? body : 'Not requested yet'}</p></div>
}

function HuddleClock({ endsAt }: { endsAt: number }) {
  const [seconds, setSeconds] = useState(12)
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 250)
    return () => window.clearInterval(timer)
  }, [endsAt])
  return <strong>{seconds}</strong>
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
  const isTeam = gameMode(room) === 'team'
  const activeTeam = isTeam ? teamForPlayer(room, turn.playerId) : undefined
  const myTeam = room.players.find((item) => item.id === me)?.teamId
  const savesLeft = activeTeam ? remainingSaveTokens(activeTeam, round) : 0
  const saveAvailable = Boolean(isTeam && result === 'incorrect' && !turn.saveActive && !turn.saveDeclined && savesLeft > 0)
  const canCallSave = Boolean(activeTeam && (isHost || myTeam === activeTeam.id))
  const answerRevealed = Boolean(result && !saveAvailable)
  const maySeeSecret = isJudge || answerRevealed
  const request = (hint: Hint) => act(() => requestHint(room.roomCode, me, hint))

  return (
    <main className="spell-shell game-page">
      <GameHeader room={room} />
      <section className={isSpeller ? 'turn-grid speller-safe' : 'turn-grid'}>
        <div className="turn-main">
          <p className="eyebrow">Turn {room.turnIndex + 1} · {turn.category}</p>
          <h1>{isSpeller ? 'Your word is ready.' : <>{player.name} is spelling…</>}</h1>
          {maySeeSecret ? (
            <div className="word-card"><small>{word.pronunciation}</small><div className="big-word">{word.word}</div><button onClick={() => speak(word.word)}><Volume2 size={18} /> Play pronunciation</button></div>
          ) : (
            <div className="secret-card companion-card"><Headphones size={34} /><h2>{isSpeller ? 'No peeking. You’ve got this.' : 'Follow along.'}</h2><p>The spelling stays hidden, but every public clue appears here and on the presentation screen.</p>{(isSpeller || isHost) && <button className="hear-button" onClick={() => speak(word.word)}><Volume2 size={20} /> Hear the word</button>}</div>
          )}
          {turn.saveActive && !result && <div className="huddle-banner"><ShieldCheck size={30} /><div><small>Save the Bee · {activeTeam?.name}</small><b>Huddle, then let {player.name} deliver the final spelling.</b></div><HuddleClock endsAt={turn.saveEndsAt ?? 0} /></div>}
          <div className="hint-grid">
            <HintPanel title="Definition" body={word.definition} open={turn.requestedHints.includes('definition')} />
            <HintPanel title="Origin story" body={word.origin} open={turn.requestedHints.includes('origin')} />
            <HintPanel title="In a sentence" body={word.sentence} open={turn.requestedHints.includes('sentence')} />
          </div>
          {(isSpeller || isHost || isJudge) && !result && <div className="hint-actions"><button onClick={() => request('definition')}>Definition</button><button onClick={() => request('origin')}>Origin</button><button onClick={() => { request('sentence'); speak(word.sentence.replace('___', word.word)) }}>Use it in a sentence</button></div>}
        </div>
        <aside className="game-sidebar">
          <div className="points-card"><span>Worth</span><strong>{round}</strong><small>{round === 1 ? 'point' : 'points'}</small></div>
          <Scoreboard room={room} compact />
          {activeTeam && <div className="save-meter" style={{ '--team-color': activeTeam.color } as CSSProperties}><span><ShieldCheck size={17} /> Save the Bee</span><b>{savesLeft} of {round} left</b><small>Round {round} · full {round}-point recovery</small></div>}
          {judge && <div className="judge-status"><small>{usesTemporaryJudge ? 'Temporary judge' : 'Judge'}</small><b>{judge.name}</b></div>}
          {isJudge && !result && <div className="judge-card"><p>{turn.saveActive ? 'Judge the team save' : usesTemporaryJudge ? 'Your ruling' : 'Host ruling'}</p><button className="correct" onClick={() => act(() => judgeTurn(room.roomCode, me, true))}><Check /> {turn.saveActive ? 'Save successful' : 'Correct'}</button><button className="incorrect" onClick={() => act(() => judgeTurn(room.roomCode, me, false))}><X /> Not quite</button>{!turn.saveActive && <button className="skip" onClick={() => act(() => skipWord(room.roomCode, me))}>Skip this word</button>}</div>}
        </aside>
      </section>
      {result && <div className={`result-overlay ${result}`}><div>{saveAvailable ? <ShieldCheck className="save-overlay-icon" /> : <span>{result === 'correct' || result === 'saved' ? '✓' : '×'}</span>}{saveAvailable ? <><p className="save-title">Save the Bee?</p><h2>{activeTeam?.name} has {savesLeft} {savesLeft === 1 ? 'token' : 'tokens'} left. The answer is still hidden.</h2><div className="result-actions">{canCallSave && <button className="save-button" onClick={() => act(() => activateSaveTheBee(room.roomCode, me))}><ShieldCheck size={18} /> Start 12-second huddle</button>}{isHost && <button className="undo-button" onClick={() => act(() => declineSaveTheBee(room.roomCode, me))}>Reveal answer</button>}</div>{!canCallSave && !isHost && <small>Waiting for the active team or host…</small>}</> : <><p>{word.word}</p><h2>{result === 'saved' ? `Saved! Full value: ${round} on the board.` : result === 'correct' ? `That’s ${round} on the board!` : 'Not quite — next word, same energy.'}</h2>{(isJudge || isHost) ? <div className="result-actions">{isJudge && <button className="undo-button" onClick={() => act(() => undoRuling(room.roomCode, me))}><RotateCcw size={17} /> Undo</button>}{isHost && <button className="primary-button" onClick={() => act(() => advanceTurn(room.roomCode, me))}>Next turn →</button>}</div> : <small>Waiting for the host…</small>}</>}</div></div>}
    </main>
  )
}

function GameAwards({ room }: { room: SpellingRoom }) {
  if (gameMode(room) !== 'team') return null
  const correctCounts = new Map<string, number>()
  room.history.filter((record) => record.correct).forEach((record) => correctCounts.set(record.playerId, (correctCounts.get(record.playerId) ?? 0) + 1))
  const rallyStarId = [...correctCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const clutchId = [...room.history].reverse().find((record) => record.saved)?.playerId
  const faceOffCounts = new Map<string, number>()
  room.faceOffHistory.forEach((record) => {
    if (record.winnerPlayerId) faceOffCounts.set(record.winnerPlayerId, (faceOffCounts.get(record.winnerPlayerId) ?? 0) + 1)
  })
  const faceOffStarId = [...faceOffCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const awards = [
    rallyStarId ? { title: 'Rally star', player: room.players.find((player) => player.id === rallyStarId)?.name, copy: `${correctCounts.get(rallyStarId)} correct in rally play` } : null,
    clutchId ? { title: 'Clutch save', player: room.players.find((player) => player.id === clutchId)?.name, copy: 'Turned a miss into full points' } : null,
    faceOffStarId ? { title: 'Buzzer hero', player: room.players.find((player) => player.id === faceOffStarId)?.name, copy: `${faceOffCounts.get(faceOffStarId)} face-off ${faceOffCounts.get(faceOffStarId) === 1 ? 'win' : 'wins'}` } : null,
  ].filter((award): award is { title: string; player: string; copy: string } => Boolean(award?.player))
  if (!awards.length) return null
  return <section className="awards"><p className="eyebrow"><Star size={15} /> Tonight’s honors</p><div className="award-grid">{awards.map((award) => <div key={award.title}><small>{award.title}</small><b>{award.player}</b><span>{award.copy}</span></div>)}</div></section>
}

function PresentationView({ room }: { room: SpellingRoom }) {
  if (room.status === 'lobby') {
    const joinLink = `${window.location.origin}/spelling/join/${room.roomCode}`
    return <main className="spell-shell presentation-page"><span className="bee-mark">B</span><p className="eyebrow">Presentation screen</p><h1>Join Team Showdown</h1><div className="presentation-join"><QRCodeSVG value={joinLink} size={190} /><div><small>Room code</small><b>{room.roomCode}</b><span>Scan to join from your phone</span></div></div><Scoreboard room={room} /></main>
  }
  if (room.status === 'finished') {
    const leaders = rankedTeams(room.teams)
    const winners = leaders.filter((team) => team.score === leaders[0]?.score)
    return <main className="spell-shell presentation-page"><span className="bee-mark">B</span><p className="eyebrow"><Sparkles size={15} /> That’s the bee</p><h1>{winners.length > 1 ? 'A shared team crown.' : `${winners[0]?.name} own the room.`}</h1><p className="winner-copy">Final score: {room.teams.map((team) => `${team.name} ${team.score}`).join(' · ')}</p><div className="final-card"><Scoreboard room={room} /></div><GameAwards room={room} /></main>
  }
  if (room.faceOff) {
    const faceOff = room.faceOff
    const word = getWord(faceOff.wordId)!
    const representatives = faceOff.representativeIds.map((id) => room.players.find((player) => player.id === id)).filter(Boolean)
    const attempting = room.players.find((player) => player.id === faceOff.attemptPlayerId)
    const winnerTeam = room.teams.find((team) => team.id === faceOff.winnerTeamId)
    return <main className="spell-shell presentation-page presentation-live"><GameHeader room={room} /><p className="eyebrow"><Zap size={15} /> {faceOff.kind === 'tiebreak' ? 'Sudden death' : `Round ${faceOff.round} face-off`} · {faceOff.category}</p><h1>{faceOff.status === 'ready' ? 'Representatives, step up.' : faceOff.status === 'open' ? 'Buzzers are live.' : faceOff.status === 'category' ? (winnerTeam ? `${winnerTeam.name} take control.` : 'No bonus this time.') : `${attempting?.name} is spelling.`}</h1><div className="faceoff-podiums">{representatives.map((player) => player && <div key={player.id} className={attempting?.id === player.id ? 'faceoff-podium active' : 'faceoff-podium'} style={{ '--team-color': room.teams.find((team) => team.id === player.teamId)?.color } as CSSProperties}><small>{room.teams.find((team) => team.id === player.teamId)?.name}</small><b>{player.name}</b>{faceOff.buzzedPlayerId === player.id && <span><BellRing size={17} /> Buzzed first</span>}</div>)}</div>{faceOff.status === 'ready' && <button className="presentation-audio" onClick={() => speak(word.word)}><Volume2 /> Play face-off word</button>}{faceOff.status === 'open' && <div className="presentation-buzzer"><BellRing /><b>BUZZ</b></div>}{faceOff.status === 'category' && <><p className="answer-reveal">The word was <b>{word.word}</b>.</p><div className="presentation-options">{faceOff.categoryOptions.map((category) => <span key={category}>{category}</span>)}</div></>}<Scoreboard room={room} /></main>
  }
  const turn = room.currentTurn
  if (!turn?.wordId) {
    const player = room.players.find((item) => item.id === turn?.playerId)
    return <main className="spell-shell presentation-page presentation-live"><GameHeader room={room} /><p className="eyebrow">Rally</p><h1>{player?.name} is choosing a category…</h1><Scoreboard room={room} /></main>
  }
  const word = getWord(turn.wordId)!
  const player = room.players.find((item) => item.id === turn.playerId)
  const round = roundForTurn(room.turnIndex, room.playerOrder.length)
  const activeTeam = teamForPlayer(room, turn.playerId)
  const saveAvailable = Boolean(turn.ruling === 'incorrect' && !turn.saveActive && !turn.saveDeclined && activeTeam && remainingSaveTokens(activeTeam, round) > 0)
  const revealAnswer = Boolean(turn.ruling && !saveAvailable)
  return <main className="spell-shell presentation-page presentation-live"><GameHeader room={room} /><p className="eyebrow">Rally · {turn.category}</p><h1>{turn.saveActive ? `${activeTeam?.name}, huddle now.` : `${player?.name} is spelling…`}</h1>{turn.saveActive && <div className="presentation-clock"><ShieldCheck /><b>Save the Bee</b><HuddleClock endsAt={turn.saveEndsAt ?? 0} /></div>}{revealAnswer ? <p className="presentation-word">{word.word}</p> : <div className="presentation-secret"><Headphones /><b>The spelling stays hidden.</b></div>}<div className="hint-grid"><HintPanel title="Definition" body={word.definition} open={turn.requestedHints.includes('definition')} /><HintPanel title="Origin story" body={word.origin} open={turn.requestedHints.includes('origin')} /><HintPanel title="In a sentence" body={word.sentence} open={turn.requestedHints.includes('sentence')} /></div><Scoreboard room={room} /></main>
}

function PresentationRoom({ code }: { code: string }) {
  const [room, setRoom] = useState<SpellingRoom | null>(null)
  const [error, setError] = useState('')
  useEffect(() => listenToSpellingRoom(code, setRoom, setError), [code])
  if (!room) return <main className="spell-shell loading-page"><span className="bee-mark">B</span><p>{error || 'Connecting presentation screen…'}</p></main>
  return <PresentationView room={room} />
}

function FinalScreen({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const isTeam = gameMode(room) === 'team'
  const leaders = rankedPlayers(room.players)
  const topScore = leaders[0]?.score ?? 0
  const winners = leaders.filter((player) => player.score === topScore)
  const teamLeaders = rankedTeams(room.teams)
  const teamTopScore = teamLeaders[0]?.score ?? 0
  const teamWinners = teamLeaders.filter((team) => team.score === teamTopScore)
  const headline = isTeam
    ? teamWinners.length > 1 ? 'A shared team crown.' : `${teamWinners[0]?.name} own the room.`
    : winners.length > 1 ? 'A shared crown.' : `${winners[0]?.name} understood the assignment.`
  const winnerCopy = isTeam
    ? `${teamWinners.map((team) => team.name).join(' & ')} ${teamWinners.length > 1 ? 'finish tied at the top' : 'take the night'} with ${teamTopScore} points.`
    : `${winners.map((player) => player.name).join(' & ')} ${winners.length > 1 ? 'finish tied at the top' : 'takes the night'} with ${topScore} points.`
  return <main className="spell-shell final-page"><span className="bee-mark">B</span><p className="eyebrow"><Sparkles size={15} /> That’s the bee</p><h1>{headline}</h1><p className="winner-copy">{winnerCopy}</p><div className="final-card"><Scoreboard room={room} /></div><GameAwards room={room} />{room.hostId === me && <div className="continuation-menu"><p className="eyebrow">What’s next?</p><div className="continuation-grid"><button className="continuation-primary" onClick={() => act(() => replayRoom(room.roomCode, me, 'same'))}><Trophy /><b>Run it back</b><span>Same format{isTeam ? ' and teams' : ''}</span></button>{isTeam && <button onClick={() => act(() => replayRoom(room.roomCode, me, 'shuffle'))}><Shuffle /><b>Shuffle teams</b><span>Same format, fresh sides</span></button>}<button onClick={() => act(() => replayRoom(room.roomCode, me, 'setup'))}><Settings2 /><b>Change setup</b><span>Choose the format and teams</span></button></div></div>}</main>
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

  return <>{error && <div className="toast-error">{error}<button onClick={() => setError('')}>×</button></div>}{room.status === 'lobby' ? <Lobby room={room} act={act} /> : room.status === 'finished' ? <FinalScreen room={room} act={act} /> : room.faceOff ? <FaceOffView room={room} act={act} /> : !room.currentTurn?.wordId ? <CategoryPicker room={room} act={act} /> : <TurnView room={room} act={act} />}</>
}

export function SpellingApp() {
  useEffect(() => {
    document.title = 'Spelling bee game night'
  }, [])
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    const remembered = getRememberedSession()
    return joinCodeFromPath && remembered?.roomCode === joinCodeFromPath ? joinCodeFromPath : null
  })
  if (presentationCodeFromPath) return <PresentationRoom code={presentationCodeFromPath} />
  return roomCode ? <Room code={roomCode} onLeave={() => { window.history.replaceState({}, '', '/spelling'); setRoomCode(null) }} /> : <Landing onEnter={setRoomCode} />
}
