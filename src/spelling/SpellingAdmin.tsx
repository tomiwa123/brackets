import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Lock,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { fetchSpellingAdminStats, resetSpellingAdminStats } from './firestore'
import { isValidSpellingAdminPassphrase } from './gameEngine'
import type { GameMode, SpellingAdminDashboardStats, SpellingRoom } from './types'

const ADMIN_SESSION_KEY = 'spelling:admin:unlocked'

const CONFIGURED_PASSPHRASES = [
  import.meta.env.VITE_SPELLING_ADMIN_PASSPHRASE as string | undefined,
  import.meta.env.VITE_TRANSFORM_PASSPHRASE as string | undefined,
]

function isSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function saveSessionUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
    else sessionStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    // Ignore storage errors in private browsing mode.
  }
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic',
  team: 'Team Showdown',
}

const STATUS_LABELS: Record<SpellingRoom['status'], string> = {
  lobby: 'Lobby',
  playing: 'Playing',
  finished: 'Finished',
  closed: 'Closed',
}

export function SpellingAdmin() {
  const [unlocked, setUnlocked] = useState(isSessionUnlocked)
  const [passphrase, setPassphrase] = useState('')
  const [wrongAttempt, setWrongAttempt] = useState(false)
  const [stats, setStats] = useState<SpellingAdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const nextStats = await fetchSpellingAdminStats()
      setStats(nextStats)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load Spelling Bee statistics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (unlocked) {
      void loadStats()
    }
  }, [unlocked, loadStats])

  const handleUnlock = (event: FormEvent) => {
    event.preventDefault()
    if (isValidSpellingAdminPassphrase(passphrase, CONFIGURED_PASSPHRASES)) {
      saveSessionUnlocked(true)
      setUnlocked(true)
      setWrongAttempt(false)
      setPassphrase('')
    } else {
      setWrongAttempt(true)
    }
  }

  const handleLock = () => {
    saveSessionUnlocked(false)
    setUnlocked(false)
    setStats(null)
  }

  const handleDownloadJson = () => {
    if (!stats) return
    const dateStamp = new Date().toISOString().slice(0, 10)
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `spelling_stats_${dateStamp}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const handleConfirmReset = async () => {
    if (resetting) return
    setResetting(true)
    setError('')
    try {
      const resetStats = await resetSpellingAdminStats()
      setStats(resetStats)
      setConfirmResetOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset statistics.')
    } finally {
      setResetting(false)
    }
  }

  if (!unlocked) {
    return (
      <main className="spell-shell spell-admin-gate">
        <nav className="spell-nav">
          <span className="bee-mark">B</span>
          <span>Spelling bee game night · Admin</span>
        </nav>
        <section className="spell-admin-login-wrap">
          <form className="entry-card spell-admin-login-card" onSubmit={handleUnlock}>
            <div className="spell-admin-lock-icon">
              <Lock size={22} />
            </div>
            <p className="eyebrow"><Sparkles size={14} /> Restricted dashboard</p>
            <h2>Spelling Bee Admin</h2>
            <p className="spell-admin-login-copy">Enter the admin password to view room metrics and usage activity.</p>
            <label>
              Password
              <input
                type="password"
                autoFocus
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                placeholder="Enter password"
              />
            </label>
            {wrongAttempt && <p className="form-error">Incorrect password. Please try again.</p>}
            <button type="submit" className="primary-button">
              Unlock dashboard <span>→</span>
            </button>
          </form>
        </section>
      </main>
    )
  }

  const totalRooms = stats?.totalRooms ?? 0
  const modeItems: Array<{ label: string; count: number; percent: number; tone: string }> = [
    {
      label: MODE_LABELS.classic,
      count: stats?.modeCounts.classic ?? 0,
      percent: totalRooms > 0 ? Math.round(((stats?.modeCounts.classic ?? 0) / totalRooms) * 100) : 0,
      tone: 'honey',
    },
    {
      label: MODE_LABELS.team,
      count: stats?.modeCounts.team ?? 0,
      percent: totalRooms > 0 ? Math.round(((stats?.modeCounts.team ?? 0) / totalRooms) * 100) : 0,
      tone: 'blue',
    },
  ]

  const statusItems: Array<{ label: string; count: number; percent: number; tone: string }> = (
    ['lobby', 'playing', 'finished', 'closed'] as const
  ).map((status) => {
    const count = stats?.statusCounts[status] ?? 0
    return {
      label: STATUS_LABELS[status],
      count,
      percent: totalRooms > 0 ? Math.round((count / totalRooms) * 100) : 0,
      tone: status === 'finished' ? 'sage' : status === 'playing' ? 'blue' : status === 'lobby' ? 'honey' : 'muted',
    }
  })

  return (
    <main className="spell-shell spell-admin-page">
      <header className="room-header spell-admin-header">
        <span className="bee-mark">B</span>
        <div>
          <small>Spelling bee game night</small>
          <b>Admin Analytics Dashboard</b>
        </div>
        <div className="spell-admin-header-actions">
          {stats?.resetAt ? (
            <span className="spell-admin-since">Since {formatTimestamp(stats.resetAt)}</span>
          ) : null}
          <button className="secondary-button spell-admin-small-btn" onClick={() => void loadStats()} disabled={loading}>
            <RefreshCw size={15} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <a className="secondary-button spell-admin-small-btn" href="/spelling">
            Game home
          </a>
          <button className="secondary-button spell-admin-small-btn" onClick={handleLock}>
            <Lock size={15} /> Lock
          </button>
        </div>
      </header>

      <div className="spell-admin-container">
        {error && (
          <div className="spell-admin-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <section className="spell-admin-kpi-grid" aria-label="Key performance indicators">
          <article className="spell-admin-kpi-card">
            <div className="spell-admin-kpi-top">
              <span className="eyebrow"><Eye size={14} /> Site Visits</span>
            </div>
            <strong className="spell-admin-kpi-value">{stats?.visits ?? 0}</strong>
            <p className="spell-admin-kpi-meta">
              <b>{stats?.uniqueVisits ?? 0}</b> unique browsers tracked
            </p>
          </article>

          <article className="spell-admin-kpi-card">
            <div className="spell-admin-kpi-top">
              <span className="eyebrow"><Users size={14} /> Rooms Created</span>
              <span className="spell-admin-badge blue">{stats?.activeRooms ?? 0} active</span>
            </div>
            <strong className="spell-admin-kpi-value">{stats?.totalRooms ?? 0}</strong>
            <p className="spell-admin-kpi-meta">
              Classic &amp; Team Showdown rooms
            </p>
          </article>

          <article className="spell-admin-kpi-card">
            <div className="spell-admin-kpi-top">
              <span className="eyebrow"><Trophy size={14} /> Games Completed</span>
              <span className="spell-admin-badge sage">{stats?.completionRatePercent ?? 0}% rate</span>
            </div>
            <strong className="spell-admin-kpi-value">{stats?.completedRooms ?? 0}</strong>
            <p className="spell-admin-kpi-meta">
              Reached final scoreboard
            </p>
          </article>

          <article className="spell-admin-kpi-card">
            <div className="spell-admin-kpi-top">
              <span className="eyebrow"><CheckCircle2 size={14} /> Turns Judged</span>
              <span className="spell-admin-badge honey">{stats?.overallAccuracyPercent ?? 0}% accuracy</span>
            </div>
            <strong className="spell-admin-kpi-value">{stats?.totalTurns ?? 0}</strong>
            <p className="spell-admin-kpi-meta">
              <b>{stats?.correctTurns ?? 0}</b> spelled correctly
            </p>
          </article>
        </section>

        <section className="spell-admin-charts-grid" aria-label="Breakdown charts">
          <article className="spell-admin-panel">
            <div className="spell-admin-panel-header">
              <p className="eyebrow"><Activity size={14} /> Format &amp; lifecycle</p>
              <h2>Game Mode and Status Breakdown</h2>
            </div>

            <div className="spell-admin-bar-group">
              <h3>Game Mode</h3>
              {modeItems.map((item) => (
                <div className="spell-admin-bar-row" key={item.label}>
                  <div className="spell-admin-bar-label">
                    <b>{item.label}</b>
                    <span>{item.count} ({item.percent}%)</span>
                  </div>
                  <div className="spell-admin-bar-track">
                    <div
                      className={`spell-admin-bar-fill ${item.tone}`}
                      style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="spell-admin-bar-group">
              <h3>Room Status</h3>
              {statusItems.map((item) => (
                <div className="spell-admin-bar-row" key={item.label}>
                  <div className="spell-admin-bar-label">
                    <b>{item.label}</b>
                    <span>{item.count} ({item.percent}%)</span>
                  </div>
                  <div className="spell-admin-bar-track">
                    <div
                      className={`spell-admin-bar-fill ${item.tone}`}
                      style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="spell-admin-panel">
            <div className="spell-admin-panel-header">
              <p className="eyebrow"><BarChart3 size={14} /> Word themes</p>
              <h2>Category Breakdown</h2>
            </div>

            <div className="spell-admin-bar-group">
              {(stats?.categoryStats ?? []).map((cat) => (
                <div className="spell-admin-bar-row" key={cat.category}>
                  <div className="spell-admin-bar-label">
                    <b>{cat.category}</b>
                    <span>
                      {cat.turns} {cat.turns === 1 ? 'turn' : 'turns'} · {cat.sharePercent}% share · {cat.accuracyPercent}% correct
                    </span>
                  </div>
                  <div className="spell-admin-bar-track">
                    <div
                      className="spell-admin-bar-fill blue"
                      style={{ width: `${Math.max(cat.turns > 0 ? 4 : 0, cat.sharePercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="spell-admin-panel spell-admin-table-panel" aria-label="Recent rooms activity">
          <div className="spell-admin-panel-header">
            <p className="eyebrow"><Users size={14} /> Live &amp; historical sessions</p>
            <h2>Recent Rooms ({stats?.recentRooms.length ?? 0})</h2>
          </div>

          <div className="spell-admin-table-wrap">
            <table className="spell-admin-table">
              <thead>
                <tr>
                  <th>Time Created</th>
                  <th>Room Code</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Players &amp; Turns</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentRooms ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="spell-admin-empty-row">
                      {loading ? 'Loading room history…' : 'No Spelling Bee rooms recorded in this window.'}
                    </td>
                  </tr>
                ) : (
                  (stats?.recentRooms ?? []).map((room) => (
                    <tr key={room.roomCode}>
                      <td>{formatTimestamp(room.createdAt)}</td>
                      <td>
                        <strong className="spell-admin-room-code">{room.roomCode}</strong>
                      </td>
                      <td>
                        <span className={`spell-admin-badge ${room.mode === 'team' ? 'blue' : 'honey'}`}>
                          {MODE_LABELS[room.mode]}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`spell-admin-badge ${
                            room.status === 'finished'
                              ? 'sage'
                              : room.status === 'playing'
                                ? 'blue'
                                : room.status === 'lobby'
                                  ? 'honey'
                                  : 'muted'
                          }`}
                        >
                          {STATUS_LABELS[room.status]}
                        </span>
                      </td>
                      <td>
                        <div className="spell-admin-room-details">
                          <b>{room.playerCount} {room.playerCount === 1 ? 'player' : 'players'}</b>
                          <span>
                            {room.turnCount} {room.turnCount === 1 ? 'turn' : 'turns'} ({room.accuracyPercent}% correct) · Top score {room.topScore}
                          </span>
                          {room.playerNames.length > 0 && (
                            <small>{room.playerNames.join(', ')}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <a
                          className="spell-admin-action-link"
                          href={`/spelling/present/${room.roomCode}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Present <ExternalLink size={13} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="spell-admin-footer">
            <button
              type="button"
              className="secondary-button spell-admin-footer-btn"
              onClick={handleDownloadJson}
              disabled={!stats}
            >
              <Download size={16} /> Download JSON Log
            </button>
            <button
              type="button"
              className="secondary-button spell-admin-footer-btn danger"
              onClick={() => setConfirmResetOpen(true)}
            >
              <RotateCcw size={16} /> Reset Statistics
            </button>
          </footer>
        </section>
      </div>

      {confirmResetOpen && (
        <div className="result-overlay spell-admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
          <div className="entry-card spell-admin-modal">
            <h2 id="reset-modal-title">Reset Statistics?</h2>
            <p>
              This resets site visits and unique visitors to 0 and hides rooms created before now from the dashboard metrics. Existing room documents remain intact in Firestore.
            </p>
            <div className="spell-admin-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmResetOpen(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button danger-button"
                onClick={() => void handleConfirmReset()}
                disabled={resetting}
              >
                {resetting ? 'Resetting…' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
