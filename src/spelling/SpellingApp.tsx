import { useEffect, useState, type CSSProperties } from 'react'
import { BellRing, Check, Clipboard, Clock3, Crown, Headphones, HelpCircle, MonitorUp, Pencil, RotateCcw, Settings2, ShieldCheck, Shuffle, Sparkles, Star, Trophy, UserCog, UserPlus, Users, Volume2, X, Zap } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  addGuest,
  activateSaveTheBee,
  advanceTurn,
  assignTemporaryHost,
  buzzFaceOff,
  chooseCategory,
  chooseFaceOffReplacementCategory,
  clearPlaythroughSessions,
  closeSpellingRoom,
  confirmPremiumTurn,
  continueFaceOffResult,
  createSpellingRoom,
  declineSaveTheBee,
  getRememberedSession,
  getSpellingPlayerId,
  getStoredPlaythroughPlayerId,
  isPlaythroughMode,
  joinCodeFromPath,
  judgeFaceOff,
  judgeBonusGame,
  joinSpellingRoom,
  judgeTurn,
  listenToSpellingRoom,
  movePlayerToTeam,
  presentationCodeFromPath,
  reassignJudge,
  reassignFaceOffJudge,
  replaceBonusWord,
  replaceFaceOffWord,
  replaceWord,
  resetFaceOffBuzz,
  renameTeam,
  replayRoom,
  requestHint,
  selectPlaythroughPersona,
  selectPremiumPlayer,
  setGameMode,
  setTeamColor,
  shuffleTeamAssignments,
  resolveNoBuzz,
  startSpellingGame,
  startBonusGame,
  undoRuling,
  undoFaceOffRuling,
  unlockFaceOff,
  substituteFaceOffRepresentative,
} from './firestore'
import type { PlaythroughPlayerPersona } from './firestore'
import {
  activeHostId,
  eligibleTemporaryJudges,
  faceOffPoints,
  gameMode,
  hasHostControl,
  judgeIdForTurn,
  pointsForRound,
  playersInOrder,
  premiumChunkPoints,
  rankedPlayers,
  rankedTeams,
  remainingSaveTokens,
  ROUND_LABELS,
  roundForTurn,
  startingPremiumBank,
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
    OWNER_ONLY: 'Only the original host can hand off or reclaim host control.',
    INVALID_TEMP_HOST: 'Choose a player who joined on their own device.',
    JUDGE_ONLY: 'Only this turn’s judge can do that.',
    NOT_YOUR_TURN: 'The current speller chooses this category.',
    TEAM_ONLY: 'Only the active team can call Save the Bee.',
    NO_SAVE_TOKENS: 'That team has used every Save the Bee token for this round.',
    BUZZER_ONLY: 'Only the two face-off representatives can use the buzzer.',
    TEAM_NAME_FORBIDDEN: 'Only members of this team or the host can rename it.',
    TEAM_NAME_REQUIRED: 'Team names cannot be blank.',
    TEAM_NAME_TOO_LONG: 'Keep team names to 24 characters or fewer.',
    TEAM_NAME_TAKEN: 'The two teams need different names.',
    WORD_CATEGORY_EXHAUSTED: 'No unused words remain in this category at the current difficulty. Choose another category.',
    INVALID_FACE_OFF_JUDGE: 'Choose a connected player who is not competing in this face-off.',
    INVALID_REPRESENTATIVE: 'Choose another player from the same team.',
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

function Landing({ onEnter, defaultCode = '' }: { onEnter: (code: string) => void; defaultCode?: string }) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>(joinCodeFromPath ? 'join' : 'home')
  const [name, setName] = useState(getRememberedSession()?.name ?? '')
  const [code, setCode] = useState(joinCodeFromPath ?? defaultCode)
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
      if (!isPlaythroughMode()) window.history.replaceState({}, '', `/spelling/join/${roomCode}`)
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
          <span className="rank">{index + 1}</span><span className="score-name">{player.name}{player.id === room.hostId && <Crown size={13} />}{player.id === room.temporaryHostId && <UserCog size={13} />}</span><strong>{player.score}</strong>
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
  const isHost = hasHostControl(room, me)
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
                  <span>{player.name}</span>{player.id === room.hostId && <Crown size={13} />}{player.id === room.temporaryHostId && <UserCog size={13} />}{isHost && <small>Move →</small>}
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

function TemporaryHostControl({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const temporaryHost = room.players.find((player) => player.id === room.temporaryHostId)
  const delegates = room.players.filter((player) => player.id !== room.hostId && !player.isGuest)

  if (temporaryHost) {
    return (
      <div className="temporary-host-banner">
        <UserCog size={20} />
        <div><small>Temporary host</small><b>{temporaryHost.name} has the game controls.</b></div>
        {me === room.hostId && <button onClick={() => act(() => assignTemporaryHost(room.roomCode, me, null))}>Reclaim host controls</button>}
      </div>
    )
  }
  if (me !== room.hostId || delegates.length === 0) return null
  return (
    <details className="host-handoff">
      <summary><UserCog size={17} /> Assign a temporary host</summary>
      <p>They can run the game while you step away. You can reclaim control at any time.</p>
      <div>{delegates.map((player) => <button key={player.id} onClick={() => act(() => assignTemporaryHost(room.roomCode, me, player.id))}>Make {player.name} temporary host</button>)}</div>
    </details>
  )
}

function Lobby({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const isHost = hasHostControl(room, me)
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
      <TemporaryHostControl room={room} act={act} />
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
            {room.players.map((player, index) => <div className="player-chip" key={player.id}><b>{index + 1}</b><span>{player.name}</span>{player.id === room.hostId && <Crown size={16} />}{player.id === room.temporaryHostId && <UserCog size={16} />}{player.isGuest && <small>guest</small>}</div>)}
          </div>
          {isHost && room.players.length < MAX_PLAYERS && <div className="add-guest"><UserPlus size={20} /><input value={guest} maxLength={28} onChange={(event) => setGuest(event.target.value)} placeholder="Add someone without a phone" /><button onClick={() => { if (guest.trim()) act(async () => { await addGuest(room.roomCode, me, guest); setGuest('') }) }}>Add</button></div>}
          {isTeam && <TeamSetup room={room} act={act} />}
          {isTeam && (
            <div className="instructions-section">
              <p className="eyebrow"><HelpCircle size={15} /> How Team Showdown works</p>
              <div className="instructions-grid">
                <div className="instruction-card">
                  <span className="inst-num">01</span>
                  <b>Face-Off</b>
                  <p>Win the first buzz or steal for one point above round value (2 / 3 / 4 pts) and first control of the bank.</p>
                </div>
                <div className="instruction-card">
                  <span className="inst-num">02</span>
                  <b>Premium Bank</b>
                  <p>The round opens with 3 / 6 / 9 extra points (2 / 4 / 6 in 4–6 player rooms) in a shared bonus bank.</p>
                </div>
                <div className="instruction-card">
                  <span className="inst-num">03</span>
                  <b>Harder Words, Double Value</b>
                  <p>Correct answers score base + bonus; correct keeps control and a miss passes it to the opponent.</p>
                </div>
                <div className="instruction-card">
                  <span className="inst-num">04</span>
                  <b>Miss Refund</b>
                  <p>Each player gets one premium try. A correct answer uses their normal turn; a miss returns them to the rally.</p>
                </div>
              </div>
            </div>
          )}
          <div className="rules-mini"><div><strong>3</strong><span>rounds each</span></div><div><strong>{isTeam ? '2' : '6'}</strong><span>{isTeam ? 'teams' : 'categories'}</span></div><div><strong>0</strong><span>eliminations</span></div></div>
          {isHost && isPlaythroughMode() && <section className="playthrough-shortcuts"><p className="eyebrow"><Zap size={15} /> Walkthrough shortcuts</p><h3>Jump straight to a follow-up game</h3><p>These controls exist only on <code>/spelling/playthrough</code>. They automatically create balanced teams and skip the full Team Showdown.</p><div><button disabled={room.players.length < 4} onClick={() => act(() => startBonusGame(room.roomCode, me, 'feud'))}><Crown size={17} /><b>Test Party Rules</b><span>Three-word board · strikes · steal</span></button><button disabled={room.players.length < 4} onClick={() => act(() => startBonusGame(room.roomCode, me, 'relay'))}><Zap size={17} /><b>Test Spelling Relay</b><span>One word per team · one letter each</span></button></div>{room.players.length < 4 && <small>Join at least four walkthrough personas to unlock both formats.</small>}</section>}
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
  const mayChoose = me === turn.playerId || hasHostControl(room, me)
  const round = roundForTurn(room.turnIndex, room.playerOrder.length)
  const judgeId = judgeIdForTurn(room)
  const judge = room.players.find((item) => item.id === judgeId)
  const usesTemporaryJudge = turn.playerId === activeHostId(room)
  const canReassign = usesTemporaryJudge && hasHostControl(room, me) && eligibleTemporaryJudges(room).length > 1
  const team = teamForPlayer(room, player.id)
  return (
    <main className="spell-shell game-page">
      <GameHeader room={room} act={act} />
      <section className="category-stage">
        <p className="eyebrow">Round {round} · {ROUND_LABELS[round - 1]}</p>
        <h1>{me === player.id ? 'Your turn — pick your poison.' : `${player.name}, pick your poison.`}</h1>
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
  const word = faceOff.wordId ? getWord(faceOff.wordId) : null
  const representatives = faceOff.representativeIds
    .map((id) => room.players.find((player) => player.id === id))
    .filter((player) => Boolean(player))
  const attempting = room.players.find((player) => player.id === faceOff.attemptPlayerId)
  const judge = room.players.find((player) => player.id === faceOff.judgeId)
  const isJudge = faceOff.judgeId === me
  const isHost = hasHostControl(room, me)
  const isRepresentative = faceOff.representativeIds.includes(me)
  const isTiebreak = faceOff.kind === 'tiebreak'
  const stageCopy = isTiebreak ? 'Sudden death' : `Round ${faceOff.round} face-off`
  const pts = faceOffPoints(faceOff.round, faceOff.kind)
  const bankPts = startingPremiumBank(faceOff.round, room.players.length)
  const mayRecover = isJudge || isHost
  const judgeOptions = room.players.filter((player) => !player.isGuest && !faceOff.representativeIds.includes(player.id))
  const replaceCurrentWord = () => {
    if ((faceOff.status === 'attempt' || faceOff.status === 'steal') && !window.confirm('Void the current attempt and give both representatives a fresh word?')) return
    act(() => replaceFaceOffWord(room.roomCode, me))
  }

  return (
    <main className="spell-shell game-page faceoff-page">
      <GameHeader room={room} act={act} />
      <section className="faceoff-stage">
        <p className="eyebrow"><Zap size={15} /> {stageCopy} · {faceOff.category}</p>
        <h1>{faceOff.status === 'result' ? `${room.players.find((player) => player.id === faceOff.winnerPlayerId)?.name} wins the face-off.` : faceOff.status === 'exhausted' ? 'This category is out of words.' : faceOff.status === 'open' ? 'Buzzers are live.' : attempting ? (attempting.id === me ? 'Your turn — spell it out.' : `${attempting.name} is spelling.`) : 'Step up to the buzzers.'}</h1>
        {!isTiebreak && (
          <div className="faceoff-value-tag">
            FACE-OFF: {pts} POINTS · THEN {bankPts} PREMIUM POINTS UP FOR GRABS
          </div>
        )}
        <p className="faceoff-subtitle">
          {isTiebreak
            ? 'First correct spelling wins sudden death.'
            : `First buzz or steal scores ${pts} points and locks ${faceOff.category} for the ${bankPts}-point shared Premium Bank.`}
        </p>

        {faceOff.notice && <div className="recovery-notice"><RotateCcw size={18} /><span>{faceOff.notice}</span></div>}

        <div className="faceoff-podiums">
          {representatives.map((player) => {
            if (!player) return null
            const team = room.teams.find((item) => item.id === player.teamId)!
            const isActive = attempting?.id === player.id
            return <div className={isActive ? 'faceoff-podium active' : 'faceoff-podium'} key={player.id} style={{ '--team-color': team.color } as CSSProperties}><small>{team.name}</small><b>{player.name}</b>{faceOff.buzzedPlayerId === player.id && <span><BellRing size={17} /> Buzzed first</span>}</div>
          })}
        </div>

        {faceOff.status === 'ready' && word && <div className="faceoff-control"><div className="readiness"><span>3</span><span>2</span><span>1</span></div><p>The judge plays the word, then opens both buzzers.</p>{isJudge ? <><div className="secret-answer"><small>Judge only</small><b>{word.word}</b><span>{word.pronunciation}</span></div><div className="faceoff-actions faceoff-setup-actions"><button onClick={() => speak(word.word)}><small>Step 1</small><Volume2 size={18} /> Play face-off word</button><button className="unlock-buzzers" onClick={() => act(() => unlockFaceOff(room.roomCode, me))}><small>Step 2</small><Zap size={18} /> Open both buzzers</button></div><p className="control-help">Open the buzzers only after the word has finished playing.</p></> : <p className="waiting-copy">{judge?.name} is preparing the word…</p>}</div>}

        {faceOff.status === 'open' && <div className="buzzer-stage"><p>The word has finished. Buzz when you are ready to spell.</p>{isRepresentative ? <button className="giant-buzzer" onClick={() => act(() => buzzFaceOff(room.roomCode, me))}><BellRing /> BUZZ</button> : <div className="buzzer-open"><Zap size={34} /><b>Buzzers are live</b><span>Waiting for a representative…</span></div>}{mayRecover && <div className="manual-buzzers"><small>Judge manual override · choose who buzzed first</small>{representatives.map((player) => player && <button key={player.id} onClick={() => act(() => buzzFaceOff(room.roomCode, me, player.id))}>{player.name}</button>)}<button className="no-buzz" onClick={() => act(() => resolveNoBuzz(room.roomCode, me))}>No buzz — draw new word</button></div>}</div>}

        {(faceOff.status === 'attempt' || faceOff.status === 'steal') && word && <div className="faceoff-control"><p className="attempt-copy">{faceOff.status === 'steal' ? 'Steal attempt:' : 'First attempt:'} <b>{attempting?.name}</b> spells aloud.</p>{isJudge ? <><div className="secret-answer"><small>Judge only</small><b>{word.word}</b><span>{word.pronunciation}</span></div><div className="faceoff-actions"><button className="correct" onClick={() => act(() => judgeFaceOff(room.roomCode, me, true))}><Check /> Correct</button><button className="incorrect" onClick={() => act(() => judgeFaceOff(room.roomCode, me, false))}><X /> Not quite</button></div></> : <p className="waiting-copy">{judge?.name} has the answer and will rule.</p>}{mayRecover && <button className="reset-buzz" onClick={() => act(() => resetFaceOffBuzz(room.roomCode, me))}><RotateCcw size={16} /> Correct/reset buzz</button>}</div>}

        {faceOff.status === 'exhausted' && <div className="faceoff-control exhausted-control"><p>No unused words remain in {faceOff.category} at this round’s difficulty.</p>{mayRecover ? <div className="faceoff-actions">{faceOff.categoryOptions.map((category) => <button key={category} onClick={() => act(() => chooseFaceOffReplacementCategory(room.roomCode, me, category))}>{category}</button>)}</div> : <p className="waiting-copy">The judge will choose another category.</p>}</div>}

        {faceOff.status === 'result' && <div className="faceoff-control faceoff-result"><div className="secret-answer"><small>Face-off result</small><b>{word?.word}</b><span>{faceOff.notice}</span></div>{mayRecover ? <div className="faceoff-actions"><button className="undo-button" onClick={() => act(() => undoFaceOffRuling(room.roomCode, me))}><RotateCcw size={17} /> Undo last ruling</button><button className="correct" onClick={() => act(() => continueFaceOffResult(room.roomCode, me))}>Continue →</button></div> : <p className="waiting-copy">Waiting for the judge to continue…</p>}</div>}

        {mayRecover && ['ready', 'open', 'attempt', 'steal'].includes(faceOff.status) && <div className="faceoff-recovery-actions"><button onClick={replaceCurrentWord}><RotateCcw size={16} /> Replace word</button>{faceOff.lastRuling && <button onClick={() => act(() => undoFaceOffRuling(room.roomCode, me))}>Undo last ruling</button>}</div>}

        {isHost && faceOff.status !== 'result' && <details className="faceoff-management"><summary>Change judge or representatives</summary>{['ready', 'exhausted'].includes(faceOff.status) && <div><small>Judge</small>{judgeOptions.map((player) => <button key={player.id} disabled={player.id === faceOff.judgeId} onClick={() => act(() => reassignFaceOffJudge(room.roomCode, me, player.id))}>{player.name}</button>)}</div>}{faceOff.status !== 'exhausted' && representatives.map((representative) => representative && <div key={representative.id}><small>Substitute for {representative.name}</small>{room.players.filter((player) => player.teamId === representative.teamId && player.id !== representative.id).map((player) => <button key={player.id} onClick={() => act(() => substituteFaceOffRepresentative(room.roomCode, me, player.id))}>{player.name}</button>)}</div>)}</details>}
      </section>
    </main>
  )
}

function PremiumBankView({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const bank = room.premiumBank!
  const me = getSpellingPlayerId()
  const controllingTeam = room.teams.find((t) => t.id === bank.controllingTeamId)!
  const myPlayer = room.players.find((p) => p.id === me)
  const isHost = hasHostControl(room, me)
  const isControllingTeam = myPlayer?.teamId === bank.controllingTeamId
  const maySelect = isHost || isControllingTeam
  const selectedPlayer = room.players.find((p) => p.id === bank.selectedPlayerId)
  const mayConfirm = Boolean(selectedPlayer && (isHost || me === selectedPlayer.id || isControllingTeam))
  const chunkPts = premiumChunkPoints(bank.round)
  const totalAward = bank.round * 2

  return (
    <main className="spell-shell game-page premium-bank-page">
      <GameHeader room={room} act={act} />
      <section className="premium-bank-stage">
        <p className="eyebrow"><Zap size={15} /> Round {bank.round} · Premium Bank · {bank.carriedCategory}</p>
        <div className="premium-bank-meter" style={{ '--team-color': controllingTeam.color } as CSSProperties}>
          <div className="bank-meter-header">
            <span className="bank-badge"><Zap size={18} /> Shared Premium Bank</span>
            <strong>{bank.remainingPoints} <small>of {bank.startPoints} pts left</small></strong>
          </div>
          <p className="bank-meter-copy">
            Each correct word claims {chunkPts} pt{chunkPts === 1 ? '' : 's'} from the bank and awards <b>{totalAward} total points</b> ({bank.round} base + {chunkPts} bonus). Misses award 0, transfer control, and refund the speller’s normal rally turn.
          </p>
        </div>

        <div className="premium-control-banner" style={{ borderColor: controllingTeam.color }}>
          <span className="control-dot" style={{ background: controllingTeam.color }} />
          <div>
            <small>Control of the bank</small>
            <h2>{controllingTeam.name} have the buzzers</h2>
          </div>
        </div>

        <div className="premium-roster-section">
          <h3>Choose who spells next for {controllingTeam.name}</h3>
          <p className="roster-help">
            {maySelect
              ? 'Select a teammate who has not attempted premium this round.'
              : `${controllingTeam.name} are choosing their speller…`}
          </p>

          <div className="premium-player-grid">
            {playersInOrder(room.players, room.playerOrder).filter((p) => p.teamId === controllingTeam.id).map((player) => {
              const hasAttempted = (bank.attemptedPlayerIds ?? []).includes(player.id)
              const normalTurnUsed = (room.roundUsedPlayerIds ?? []).includes(player.id)
              const isSelected = bank.selectedPlayerId === player.id
              return (
                <button
                  key={player.id}
                  disabled={!maySelect || hasAttempted}
                  className={`premium-player-card ${isSelected ? 'selected' : ''} ${hasAttempted ? 'used' : ''}`}
                  onClick={() => act(() => selectPremiumPlayer(room.roomCode, me, player.id))}
                >
                  <b>{player.name}</b>
                  <span>{hasAttempted ? (normalTurnUsed ? 'Correct · turn used' : 'Missed · rally turn refunded') : isSelected ? 'Selected' : 'Eligible'}</span>
                </button>
              )
            })}
          </div>

          {selectedPlayer && (
            <div className="premium-confirm-box">
              <p><b>{selectedPlayer.name}</b> will receive a harder Round {bank.round} word in <b>{bank.carriedCategory}</b>. A miss still leaves their normal rally turn available.</p>
              {mayConfirm ? (
                <button
                  className="primary-button premium-start-button"
                  onClick={() => act(() => confirmPremiumTurn(room.roomCode, me))}
                >
                  <Zap size={18} /> Start {selectedPlayer.name}’s turn →
                </button>
              ) : (
                <small>Waiting for {selectedPlayer.name} or host to start…</small>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function elapsedWords(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes === 0) return `${remainder} ${remainder === 1 ? 'second' : 'seconds'} so far`
  if (remainder === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} so far`
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, ${remainder} ${remainder === 1 ? 'second' : 'seconds'} so far`
}

function CountUpAfterCountdown({ startedAt, countdownSeconds }: { startedAt: number; countdownSeconds: number }) {
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  if (elapsed >= countdownSeconds) return <strong>{elapsedWords(elapsed)}</strong>
  const remaining = countdownSeconds - elapsed
  return <strong>{`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} left`}</strong>
}

function GameHeader({ room, act }: { room: SpellingRoom; act?: (work: () => Promise<void>) => void }) {
  const round = room.faceOff?.round ?? roundForTurn(room.turnIndex, room.playerOrder.length)
  const spellingStartedAt = room.faceOff?.attemptStartedAt ?? room.currentTurn?.spellingStartedAt
  const me = act ? getSpellingPlayerId() : null
  const isCurrentSpeller = Boolean(me && room.currentTurn?.playerId === me)
  const isFaceOffSpeller = Boolean(me && room.faceOff?.attemptPlayerId === me)
  const isSelectedPremiumSpeller = Boolean(me && !room.currentTurn && room.premiumBank?.selectedPlayerId === me)
  const turnMessage = isCurrentSpeller
    ? room.currentTurn?.wordId ? 'Spell your word aloud.' : 'Choose your category to begin.'
    : isFaceOffSpeller
      ? 'Spell the face-off word aloud.'
      : isSelectedPremiumSpeller
        ? 'Your team selected you for the Premium Bank.'
        : null
  return <><header className="game-header"><span className="bee-mark">B</span><span>Round {round} / 3</span><b>{ROUND_LABELS[round - 1]}</b>{spellingStartedAt && <div className="spelling-clock"><Clock3 size={16} /><CountUpAfterCountdown startedAt={spellingStartedAt} countdownSeconds={60} /></div>}{gameMode(room) === 'team' && <div className="header-scores">{room.teams.map((team) => <span key={team.id} style={{ borderColor: team.color }}>{team.name} <strong>{team.score}</strong></span>)}</div>}<span>Room {room.roomCode}</span></header>{act && gameMode(room) === 'team' && <div className="phone-team-scores" aria-label="Team scores">{room.teams.map((team) => <div key={team.id} style={{ '--team-color': team.color } as CSSProperties}><span className="team-dot" /><b>{team.name}</b><strong>{team.score}</strong></div>)}</div>}{turnMessage && <div className="personal-turn-banner"><strong>Your turn</strong><span>{turnMessage}</span></div>}{act && <TemporaryHostControl room={room} act={act} />}</>
}

function HintPanel({ title, body, open, privateOpen = false }: { title: string; body: string; open: boolean; privateOpen?: boolean }) {
  return <div className={open ? `hint-panel open${privateOpen ? ' private' : ''}` : 'hint-panel'}><b>{title}</b>{privateOpen && <small>Private to this screen</small>}<p>{open ? body : 'Not requested yet'}</p></div>
}

function HuddleClock({ endsAt }: { endsAt: number }) {
  return <CountUpAfterCountdown startedAt={endsAt - 30_000} countdownSeconds={30} />
}

function TurnView({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const turn = room.currentTurn!
  const [privateReview, setPrivateReview] = useState<{ turnId: string; hints: Hint[] }>({ turnId: turn.turnId, hints: [] })
  const privateHints = privateReview.turnId === turn.turnId ? privateReview.hints : []
  const word = getWord(turn.wordId)!
  const player = room.players.find((item) => item.id === turn.playerId)!
  const isHost = hasHostControl(room, me)
  const isSpeller = turn.playerId === me
  const judgeId = judgeIdForTurn(room)
  const judge = room.players.find((item) => item.id === judgeId)
  const isJudge = judgeId === me
  const usesTemporaryJudge = judgeId !== activeHostId(room)
  const round = roundForTurn(room.turnIndex, room.playerOrder.length)
  const result = turn.ruling
  const isTeam = gameMode(room) === 'team'
  const isPremium = Boolean(turn.isPremium)
  const basePoints = turn.basePoints ?? pointsForRound(round)
  const bonusPoints = turn.bonusPoints ?? premiumChunkPoints(round)
  const totalWorth = isPremium ? basePoints + bonusPoints : round
  const activeTeam = isTeam ? teamForPlayer(room, turn.playerId) : undefined
  const myTeam = room.players.find((item) => item.id === me)?.teamId
  const savesLeft = activeTeam ? remainingSaveTokens(activeTeam, round) : 0
  const saveAvailable = Boolean(isTeam && !isPremium && result === 'incorrect' && !turn.saveActive && !turn.saveDeclined && savesLeft > 0)
  const canCallSave = Boolean(activeTeam && myTeam === activeTeam.id)
  const isActiveTeamMember = Boolean(activeTeam && myTeam === activeTeam.id)
  const answerRevealed = Boolean(result && !saveAvailable)
  const maySeeSecret = isJudge || answerRevealed
  const request = (hint: Hint) => {
    if (isSpeller || isHost) {
      act(() => requestHint(room.roomCode, me, hint))
      return
    }
    setPrivateReview((review) => {
      const hints = review.turnId === turn.turnId ? review.hints : []
      return { turnId: turn.turnId, hints: hints.includes(hint) ? hints : [...hints, hint] }
    })
  }
  const requestSentence = () => {
    request('sentence')
    if (isSpeller || isHost) speak(word.sentence.replace('___', word.word))
  }
  const replaceCurrentTurnWord = () => {
    if (!window.confirm('Replace this word with no score, miss, strike, or control change?')) return
    act(() => replaceWord(room.roomCode, me))
  }

  return (
    <main className="spell-shell game-page">
      <GameHeader room={room} act={act} />
      <section className={isSpeller ? 'turn-grid speller-safe' : 'turn-grid'}>
        <div className="turn-main">
          {isPremium && (
            <div className="premium-turn-banner">
              <Zap size={20} />
              <div>
                <small>Premium Bank Challenge · {turn.category}</small>
                <b>Double points: {basePoints} base + {bonusPoints} bonus = {totalWorth} total points</b>
              </div>
              <div className="bank-pill">Bank: {room.premiumBank?.remainingPoints ?? 0} pts left</div>
            </div>
          )}
          <p className="eyebrow">{isPremium ? 'Premium Turn' : `Turn ${room.turnIndex + 1}`} · {turn.category}</p>
          <h1>{isSpeller ? 'Your turn — your word is ready.' : <>{player.name} is spelling…</>}</h1>
          {turn.notice && !result && <div className="recovery-notice"><RotateCcw size={18} /><span>{turn.notice}</span></div>}
          {maySeeSecret ? (
            <div className="word-card"><small>{word.pronunciation}</small><div className="big-word">{word.word}</div><button onClick={() => speak(word.word)}><Volume2 size={18} /> Play pronunciation</button></div>
          ) : (
            <div className="secret-card companion-card"><Headphones size={34} /><h2>{isSpeller ? 'No peeking. You’ve got this.' : 'Follow along.'}</h2><p>The spelling stays hidden, but every public clue appears here and on the presentation screen.</p>{(isSpeller || isHost) && <button className="hear-button" onClick={() => speak(word.word)}><Volume2 size={20} /> Hear the word</button>}</div>
          )}
          {turn.saveActive && !result && <div className="huddle-banner"><ShieldCheck size={30} /><div><small>Save the Bee · {isActiveTeamMember ? 'your team huddle' : 'huddle in progress'}</small><b>{isActiveTeamMember ? `Confer, then let ${player.name} deliver the final spelling.` : `${activeTeam?.name} are conferring privately.`}</b></div><HuddleClock endsAt={turn.saveEndsAt ?? 0} /></div>}
          <div className="hint-grid">
            <HintPanel title="Definition" body={word.definition} open={turn.requestedHints.includes('definition') || privateHints.includes('definition')} privateOpen={!turn.requestedHints.includes('definition') && privateHints.includes('definition')} />
            <HintPanel title="Origin story" body={word.origin} open={turn.requestedHints.includes('origin') || privateHints.includes('origin')} privateOpen={!turn.requestedHints.includes('origin') && privateHints.includes('origin')} />
            <HintPanel title="In a sentence" body={word.sentence} open={turn.requestedHints.includes('sentence') || privateHints.includes('sentence')} privateOpen={!turn.requestedHints.includes('sentence') && privateHints.includes('sentence')} />
          </div>
          {!result && <div className="hint-actions"><small>{isSpeller || isHost ? 'Reveal to every screen' : 'Review privately on this screen'}</small><button onClick={() => request('definition')}>Definition</button><button onClick={() => request('origin')}>Origin</button><button onClick={requestSentence}>Use it in a sentence</button></div>}
        </div>
        <aside className="game-sidebar">
          <div className="points-card"><span>Worth</span><strong>{totalWorth}</strong><small>{isPremium ? `${basePoints} base + ${bonusPoints} bonus` : round === 1 ? 'point' : 'points'}</small></div>
          {isPremium && (
            <div className="bank-meter">
              <span><Zap size={14} /> Premium Bank</span>
              <b>{room.premiumBank?.remainingPoints ?? 0} pts left</b>
            </div>
          )}
          <Scoreboard room={room} compact />
          {activeTeam && !isPremium && <div className="save-meter" style={{ '--team-color': activeTeam.color } as CSSProperties}><span><ShieldCheck size={17} /> Save the Bee</span><b>{savesLeft} of {round} left</b><small>Round {round} · full {round}-point recovery</small></div>}
          {judge && <div className="judge-status"><small>{usesTemporaryJudge ? 'Temporary judge' : 'Judge'}</small><b>{judge.name}</b></div>}
          {isJudge && !result && <div className="judge-card"><p>{turn.saveActive ? 'Judge the team save' : usesTemporaryJudge ? 'Your ruling' : 'Host ruling'}</p><button className="correct" onClick={() => act(() => judgeTurn(room.roomCode, me, true))}><Check /> {turn.saveActive ? 'Save successful' : 'Correct'}</button><button className="incorrect" onClick={() => act(() => judgeTurn(room.roomCode, me, false))}><X /> Not quite</button>{!turn.saveActive && <button className="skip" onClick={replaceCurrentTurnWord}>Replace word</button>}</div>}
          {isHost && !isJudge && !result && !turn.saveActive && <button className="skip host-replace-word" onClick={replaceCurrentTurnWord}>Replace word</button>}
        </aside>
      </section>
      {result && (!saveAvailable || canCallSave || isHost) && <div className={`result-overlay ${result}`}><div>{saveAvailable ? <ShieldCheck className="save-overlay-icon" /> : <span>{result === 'correct' || result === 'saved' ? '✓' : '×'}</span>}{saveAvailable ? <><p className="save-title">{canCallSave ? 'Save the Bee?' : 'Team decision in progress'}</p><h2>{canCallSave ? `${activeTeam?.name} has ${savesLeft} ${savesLeft === 1 ? 'token' : 'tokens'} left. The answer is still hidden.` : `${activeTeam?.name} can choose whether to use a save. The answer remains hidden.`}</h2><div className="result-actions">{canCallSave && <button className="save-button" onClick={() => act(() => activateSaveTheBee(room.roomCode, me))}><ShieldCheck size={18} /> Start private team huddle</button>}{isHost && <button className="undo-button" onClick={() => act(() => declineSaveTheBee(room.roomCode, me))}>Close save window & reveal</button>}</div></> : <><p>{word.word}</p><h2>{isPremium ? (result === 'correct' ? <>CORRECT · +{basePoints} BASE · +{bonusPoints} PREMIUM<br /><small style={{ fontSize: '18px', fontWeight: 600 }}>{activeTeam?.name} keep control · Bank: {room.premiumBank?.remainingPoints ?? 0} pts remaining</small>{room.premiumBank?.remainingPoints === 0 && <div className="bank-empty-alert"><Sparkles size={16} /> PREMIUM BANK CLAIMED · NORMAL RALLY RESUMES</div>}</> : <>NOT QUITE · 0 POINTS<br /><small style={{ fontSize: '18px', fontWeight: 600 }}>Control passes · Bank unchanged: {room.premiumBank?.remainingPoints ?? 0} pts<br />Normal rally turn refunded</small></>) : result === 'saved' ? `Saved! Full value: ${round} on the board.` : result === 'correct' ? `That’s ${round} on the board!` : 'Not quite — next word, same energy.'}</h2>{(isJudge || isHost) ? <div className="result-actions"><button className="undo-button" onClick={() => act(() => undoRuling(room.roomCode, me))}><RotateCcw size={17} /> Undo</button>{isHost && <button className="primary-button" onClick={() => act(() => advanceTurn(room.roomCode, me))}>Next turn →</button>}</div> : <small>Waiting for the host…</small>}</>}</div></div>}
      {saveAvailable && !canCallSave && !isHost && <div className="save-decision-status"><ShieldCheck size={18} /><span>{activeTeam?.name} are deciding whether to call Save the Bee.</span></div>}
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
  if (room.bonusGame) {
    const bonus = room.bonusGame
    const team = room.teams.find((item) => item.id === bonus.activeTeamId)
    const player = room.players.find((item) => item.id === bonus.activePlayerId)
    return <main className="spell-shell presentation-page presentation-live"><span className="bee-mark">B</span><p className="eyebrow">{bonus.kind === 'relay' ? 'Spelling Relay finale' : 'Full Feud · Party Rules'}</p><h1>{bonus.phase === 'steal' ? `${team?.name}, steal the board.` : `${player?.name}, you’re up.`}</h1>{bonus.notice && <div className="recovery-notice"><RotateCcw size={18} /><span>{bonus.notice}</span></div>}<Scoreboard room={room} />{bonus.kind === 'feud' ? <div className="presentation-bank-card" style={{ '--team-color': team?.color } as CSSProperties}><b>{Math.min(bonus.wordIndex, 3)} / 3 cleared</b><p>{bonus.strikes} of 2 strikes · {bonus.boardValue} points remain</p></div> : <div className="presentation-bank-card" style={{ '--team-color': team?.color } as CSSProperties}><b>One letter each</b><p>No backtracking. Keep the rhythm moving.</p></div>}</main>
  }
  if (room.faceOff) {
    const faceOff = room.faceOff
    const word = faceOff.wordId ? getWord(faceOff.wordId) : null
    const representatives = faceOff.representativeIds.map((id) => room.players.find((player) => player.id === id)).filter(Boolean)
    const attempting = room.players.find((player) => player.id === faceOff.attemptPlayerId)
    const isTiebreak = faceOff.kind === 'tiebreak'
    const pts = faceOffPoints(faceOff.round, faceOff.kind)
    const bankPts = startingPremiumBank(faceOff.round, room.players.length)
    return (
      <main className="spell-shell presentation-page presentation-live">
        <GameHeader room={room} />
        <p className="eyebrow"><Zap size={15} /> {isTiebreak ? 'Sudden death' : `Round ${faceOff.round} face-off`} · {faceOff.category}</p>
        <h1>{faceOff.status === 'result' ? `${room.players.find((player) => player.id === faceOff.winnerPlayerId)?.name} wins the face-off.` : faceOff.status === 'exhausted' ? 'A new category is needed.' : faceOff.status === 'ready' ? 'Representatives, step up.' : faceOff.status === 'open' ? 'Buzzers are live.' : `${attempting?.name} is spelling.`}</h1>
        {faceOff.notice && <div className="recovery-notice"><RotateCcw size={18} /><span>{faceOff.notice}</span></div>}
        {!isTiebreak && (
          <div className="faceoff-value-tag" style={{ margin: '0 auto 20px' }}>
            FACE-OFF: {pts} POINTS · THEN {bankPts} PREMIUM POINTS UP FOR GRABS
          </div>
        )}
        <div className="faceoff-podiums">
          {representatives.map((player) => player && (
            <div key={player.id} className={attempting?.id === player.id ? 'faceoff-podium active' : 'faceoff-podium'} style={{ '--team-color': room.teams.find((team) => team.id === player.teamId)?.color } as CSSProperties}>
              <small>{room.teams.find((team) => team.id === player.teamId)?.name}</small>
              <b>{player.name}</b>
              {faceOff.buzzedPlayerId === player.id && <span><BellRing size={17} /> Buzzed first</span>}
            </div>
          ))}
        </div>
        {faceOff.status === 'ready' && word && <button className="presentation-audio" onClick={() => speak(word.word)}><Volume2 /> Play face-off word</button>}
        {faceOff.status === 'open' && <div className="presentation-buzzer"><BellRing /><b>BUZZ</b></div>}
        <Scoreboard room={room} />
      </main>
    )
  }
  if (room.premiumBank && !room.currentTurn) {
    const bank = room.premiumBank
    const controllingTeam = room.teams.find((t) => t.id === bank.controllingTeamId)
    const selectedPlayer = room.players.find((p) => p.id === bank.selectedPlayerId)
    return (
      <main className="spell-shell presentation-page presentation-live">
        <GameHeader room={room} />
        <p className="eyebrow"><Zap size={15} /> Round {bank.round} · Premium Bank · {bank.carriedCategory}</p>
        <h1>{controllingTeam?.name} have control.</h1>
        <div className="presentation-bank-card" style={{ '--team-color': controllingTeam?.color } as CSSProperties}>
          <b>{bank.remainingPoints} <small>of {bank.startPoints} bonus points remaining</small></b>
          <p>{selectedPlayer ? `${selectedPlayer.name} is stepping up to spell…` : `Selecting next speller from ${controllingTeam?.name}…`}</p>
        </div>
        <Scoreboard room={room} />
      </main>
    )
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
  const isPremiumTurn = Boolean(turn.isPremium)
  const saveAvailable = Boolean(!isPremiumTurn && turn.ruling === 'incorrect' && !turn.saveActive && !turn.saveDeclined && activeTeam && remainingSaveTokens(activeTeam, round) > 0)
  const revealAnswer = Boolean(turn.ruling && !saveAvailable)
  if (revealAnswer) {
    const success = turn.ruling === 'correct' || turn.ruling === 'saved'
    const basePts = turn.basePoints ?? round
    const bonusPts = turn.bonusPoints ?? round
    const totalPts = basePts + bonusPts
    return (
      <main className={`spell-shell presentation-page presentation-result ${success ? 'correct' : 'incorrect'}`}>
        <GameHeader room={room} />
        <div className="presentation-celebration">
          <span>{success ? '✓' : '×'}</span>
          <p>{word.word}</p>
          <h1>
            {isPremiumTurn
              ? (success ? `CORRECT · +${basePts} BASE · +${bonusPts} PREMIUM` : 'NOT QUITE · 0 POINTS')
              : (turn.ruling === 'saved' ? `${activeTeam?.name} saved it!` : success ? `${player?.name} got it!` : 'Good fight. Keep moving.')}
          </h1>
          <h2>
            {isPremiumTurn
              ? (success
                ? `${totalPts} total points on the board · Bank: ${room.premiumBank?.remainingPoints ?? 0} pts left`
                : `Control passes · Normal rally turn refunded · Bank: ${room.premiumBank?.remainingPoints ?? 0} pts left`)
              : (success ? `${round} ${round === 1 ? 'point' : 'points'} on the board.` : 'The word is now revealed.')}
          </h2>
          {isPremiumTurn && room.premiumBank?.remainingPoints === 0 && (
            <div className="bank-empty-alert" style={{ maxWidth: '600px', margin: '20px auto' }}>
              <Sparkles size={16} /> PREMIUM BANK CLAIMED · NORMAL RALLY RESUMES
            </div>
          )}
        </div>
        <Scoreboard room={room} />
      </main>
    )
  }
  const totalWorth = (turn.basePoints ?? round) + (turn.bonusPoints ?? round)
  return (
    <main className="spell-shell presentation-page presentation-live">
      <GameHeader room={room} />
      <p className="eyebrow">{isPremiumTurn ? 'Premium Challenge' : 'Rally'} · {turn.category}</p>
      <h1>
        {turn.saveActive
          ? `${activeTeam?.name} are conferring.`
          : saveAvailable
            ? `${activeTeam?.name} are making a team decision.`
            : isPremiumTurn
              ? `${player?.name} is spelling for ${totalWorth} points!`
              : `${player?.name} is spelling…`}
      </h1>
      {turn.notice && <div className="recovery-notice"><RotateCcw size={18} /><span>{turn.notice}</span></div>}
      {isPremiumTurn && (
        <div className="faceoff-value-tag" style={{ margin: '0 auto 16px' }}>
          PREMIUM CHALLENGE · {turn.basePoints} BASE + {turn.bonusPoints} BONUS · BANK: {room.premiumBank?.remainingPoints ?? 0} PTS LEFT
        </div>
      )}
      {turn.saveActive && <div className="presentation-clock"><ShieldCheck /><b>Private team huddle in progress</b><HuddleClock endsAt={turn.saveEndsAt ?? 0} /></div>}
      <div className="presentation-secret"><Headphones /><b>The spelling stays hidden.</b></div>
      <div className="hint-grid">
        <HintPanel title="Definition" body={word.definition} open={turn.requestedHints.includes('definition')} />
        <HintPanel title="Origin story" body={word.origin} open={turn.requestedHints.includes('origin')} />
        <HintPanel title="In a sentence" body={word.sentence} open={turn.requestedHints.includes('sentence')} />
      </div>
      <Scoreboard room={room} />
    </main>
  )
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
  return <main className="spell-shell final-page"><span className="bee-mark">B</span><TemporaryHostControl room={room} act={act} /><p className="eyebrow"><Sparkles size={15} /> That’s the bee</p><h1>{headline}</h1><p className="winner-copy">{winnerCopy}</p><div className="final-card"><Scoreboard room={room} /></div><GameAwards room={room} />{hasHostControl(room, me) && <div className="continuation-menu"><p className="eyebrow">What’s next?</p><div className="continuation-grid">{isTeam && <button className="bonus-choice feud-choice" onClick={() => act(() => startBonusGame(room.roomCode, me, 'feud'))}><Crown /><b>Party Rules</b><span>Three-word board · two strikes · one steal</span></button>}{isTeam && <button className="bonus-choice relay-choice" onClick={() => act(() => startBonusGame(room.roomCode, me, 'relay'))}><Zap /><b>Spelling Relay</b><span>One letter per teammate · no backtracking</span></button>}<button className="continuation-primary" onClick={() => act(() => replayRoom(room.roomCode, me, 'same'))}><Trophy /><b>Run it back</b><span>Same format{isTeam ? ' and teams' : ''}</span></button>{isTeam && <button onClick={() => act(() => replayRoom(room.roomCode, me, 'shuffle'))}><Shuffle /><b>Shuffle teams</b><span>Same format, fresh sides</span></button>}<button onClick={() => act(() => replayRoom(room.roomCode, me, 'setup'))}><Settings2 /><b>Change setup</b><span>Choose the format and teams</span></button></div></div>}</main>
}

function BonusGameView({ room, act }: { room: SpellingRoom; act: (work: () => Promise<void>) => void }) {
  const me = getSpellingPlayerId()
  const bonus = room.bonusGame!
  const team = room.teams.find((item) => item.id === bonus.activeTeamId)!
  const player = room.players.find((item) => item.id === bonus.activePlayerId)
  const word = getWord(bonus.wordIds[bonus.wordIndex])!
  const isRelay = bonus.kind === 'relay'
  const replaceCurrentBonusWord = () => {
    if (!window.confirm('Void this word and restart with the same team, player, score, and board position?')) return
    act(() => replaceBonusWord(room.roomCode, me))
  }
  return <main className="spell-shell bonus-game-page" style={{ '--team-color': team.color } as CSSProperties}>
    <TemporaryHostControl room={room} act={act} />
    {player?.id === me && <div className="personal-turn-banner"><strong>Your turn</strong><span>{isRelay ? 'Start your team’s relay.' : 'Spell the current word aloud.'}</span></div>}
    <p className="eyebrow">{isRelay ? <Zap size={15} /> : <Crown size={15} />} {isRelay ? 'Spelling Relay finale' : 'Full Feud · Party Rules'}</p>
    <h1>{bonus.phase === 'steal' ? `${team.name}, steal the board.` : `${team.name}, take the floor.`}</h1>
    {bonus.notice && <div className="recovery-notice"><RotateCcw size={18} /><span>{bonus.notice}</span></div>}
    <Scoreboard room={room} />
    {!isRelay && <div className="bonus-board"><b>{Math.min(bonus.wordIndex, 3)} / 3 words cleared</b><span>{'✕'.repeat(bonus.strikes)}{'○'.repeat(Math.max(0, 2 - bonus.strikes))}</span><small>{bonus.boardValue} points on the board</small></div>}
    {isRelay && <div className="relay-rules"><b>One letter per teammate.</b><span>Rotate down the line. No backtracking. The host judges the complete word.</span></div>}
    <section className="bonus-stage"><small>{bonus.category} · {team.name}</small><h2>{player?.id === me ? 'Your turn' : player?.name}{isRelay ? ' — start the relay' : ' — spell now'}</h2><p>{isRelay ? 'Say one letter, then pass immediately to the next teammate.' : bonus.phase === 'steal' ? 'Huddle, then spell the final steal word for every point left.' : 'Teammates rotate after every word. Two misses open one steal.'}</p>
      {hasHostControl(room, me) ? <><div className="secret-answer"><small>Host only</small><b>{word.word}</b><span>{word.pronunciation}</span></div><button className="presentation-audio" onClick={() => speak(word.word)}><Volume2 /> Play word</button><div className="faceoff-actions"><button className="correct" onClick={() => act(() => judgeBonusGame(room.roomCode, me, true))}><Check /> Correct</button><button className="incorrect" onClick={() => act(() => judgeBonusGame(room.roomCode, me, false))}><X /> Not quite</button><button onClick={replaceCurrentBonusWord}>Replace word</button></div></> : <div className="waiting-copy">The host has the answer and will rule.</div>}
    </section>
  </main>
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

  return <>{error && <div className="toast-error">{error}<button onClick={() => setError('')}>×</button></div>}{room.status === 'lobby' ? <Lobby room={room} act={act} /> : room.status === 'finished' ? <FinalScreen room={room} act={act} /> : room.bonusGame ? <BonusGameView room={room} act={act} /> : room.faceOff ? <FaceOffView room={room} act={act} /> : (room.premiumBank && !room.currentTurn) ? <PremiumBankView room={room} act={act} /> : !room.currentTurn?.wordId ? <CategoryPicker room={room} act={act} /> : <TurnView room={room} act={act} />}</>
}

type PlaythroughPersona = PlaythroughPlayerPersona | 'presentation'

interface PlaythroughState {
  selected: PlaythroughPersona
  roomCode: string | null
}

const PLAYTHROUGH_STATE_KEY = 'spelling-night-playthrough-state'
const PLAYTHROUGH_PERSONAS: { id: PlaythroughPersona; label: string }[] = [
  { id: 'host', label: 'Host' },
  { id: 'player-2', label: 'Player 2' },
  { id: 'player-3', label: 'Player 3' },
  { id: 'player-4', label: 'Player 4' },
  { id: 'player-5', label: 'Player 5' },
  { id: 'player-6', label: 'Player 6' },
  { id: 'presentation', label: 'Presentation' },
]

function loadPlaythroughState(): PlaythroughState {
  try {
    const stored = JSON.parse(localStorage.getItem(PLAYTHROUGH_STATE_KEY) ?? 'null') as Partial<PlaythroughState> | null
    const selected = PLAYTHROUGH_PERSONAS.some((persona) => persona.id === stored?.selected)
      ? stored!.selected!
      : 'host'
    const roomCode = typeof stored?.roomCode === 'string' && /^[A-Z]{4}$/.test(stored.roomCode)
      ? stored.roomCode
      : null
    if (selected !== 'presentation') selectPlaythroughPersona(selected)
    return { selected, roomCode }
  } catch {
    selectPlaythroughPersona('host')
    return { selected: 'host', roomCode: null }
  }
}

function storePlaythroughState(state: PlaythroughState): void {
  localStorage.setItem(PLAYTHROUGH_STATE_KEY, JSON.stringify(state))
}

function PlaythroughPlayerView({ sharedRoomCode, onRoomEntered }: {
  sharedRoomCode: string | null
  onRoomEntered: (code: string) => void
}) {
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    const remembered = getRememberedSession()
    return sharedRoomCode && remembered?.roomCode === sharedRoomCode ? sharedRoomCode : null
  })
  const enter = (code: string) => {
    setRoomCode(code)
    onRoomEntered(code)
  }
  return roomCode
    ? <Room code={roomCode} onLeave={() => setRoomCode(null)} />
    : <Landing defaultCode={sharedRoomCode ?? ''} onEnter={enter} />
}

function PlaythroughShell() {
  const [state, setState] = useState(loadPlaythroughState)
  const [resetVersion, setResetVersion] = useState(0)
  const [resetting, setResetting] = useState(false)

  const choosePersona = (selected: PlaythroughPersona) => {
    if (selected !== 'presentation') selectPlaythroughPersona(selected)
    const next = { ...state, selected }
    storePlaythroughState(next)
    setState(next)
  }

  const rememberRoom = (roomCode: string) => {
    const next = { ...state, roomCode: roomCode.toUpperCase() }
    storePlaythroughState(next)
    setState(next)
  }

  const reset = async () => {
    if (resetting) return
    setResetting(true)
    const hostId = getStoredPlaythroughPlayerId('host')
    if (state.roomCode && hostId) {
      try { await closeSpellingRoom(state.roomCode, hostId) } catch { /* The room may already be gone or closed. */ }
    }
    clearPlaythroughSessions()
    localStorage.removeItem(PLAYTHROUGH_STATE_KEY)
    selectPlaythroughPersona('host')
    const fresh: PlaythroughState = { selected: 'host', roomCode: null }
    setState(fresh)
    setResetVersion((version) => version + 1)
    setResetting(false)
  }

  return (
    <div className="playthrough-shell">
      <header className="playthrough-toolbar">
        <div className="playthrough-title"><strong>PLAYTHROUGH ONLY</strong><span>Switch viewpoints without changing the live room.</span></div>
        <nav aria-label="Playthrough viewpoints">
          {PLAYTHROUGH_PERSONAS.map((persona) => (
            <button
              key={persona.id}
              className={state.selected === persona.id ? 'selected' : ''}
              aria-pressed={state.selected === persona.id}
              onClick={() => choosePersona(persona.id)}
            >
              {persona.id === 'presentation' && <MonitorUp size={14} />}{persona.label}
            </button>
          ))}
        </nav>
        <div className="playthrough-room"><small>Live room</small><b>{state.roomCode ?? '— — — —'}</b></div>
        <button className="playthrough-reset" disabled={resetting} onClick={() => void reset()}><RotateCcw size={15} /> {resetting ? 'Resetting…' : 'Reset playthrough'}</button>
      </header>
      <div className="playthrough-viewport" key={`${state.selected}-${resetVersion}`}>
        {state.selected === 'presentation'
          ? state.roomCode
            ? <PresentationRoom code={state.roomCode} />
            : <main className="spell-shell playthrough-empty"><MonitorUp size={40} /><h1>No room yet.</h1><p>Switch to Host and create a game first.</p></main>
          : <PlaythroughPlayerView sharedRoomCode={state.roomCode} onRoomEntered={rememberRoom} />}
      </div>
    </div>
  )
}

function StandardSpellingApp() {
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    const remembered = getRememberedSession()
    return joinCodeFromPath && remembered?.roomCode === joinCodeFromPath ? joinCodeFromPath : null
  })
  if (presentationCodeFromPath) return <PresentationRoom code={presentationCodeFromPath} />
  return roomCode ? <Room code={roomCode} onLeave={() => { window.history.replaceState({}, '', '/spelling'); setRoomCode(null) }} /> : <Landing onEnter={setRoomCode} />
}

export function SpellingApp() {
  useEffect(() => {
    document.title = 'Spelling bee game night'
  }, [])
  return isPlaythroughMode() ? <PlaythroughShell /> : <StandardSpellingApp />
}
