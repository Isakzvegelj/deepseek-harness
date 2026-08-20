import { useEffect, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './CodexUsagePill.module.css'

type UsageWindow = { usedPercent: number; resetAt?: number; limitWindowSeconds?: number }
type Usage = { available: boolean; planType?: string; windows: UsageWindow[]; error?: string; fetchedAt: string }
type FetchUsage = (signal?: AbortSignal) => Promise<Usage>
type Props = PropsRuntime<'shell.overlay'>

function label(window: UsageWindow, index: number): string {
  if ((window.limitWindowSeconds ?? 0) > 6 * 24 * 60 * 60) return 'Weekly'
  return index === 0 ? 'Session' : 'Weekly'
}
function pct(value: number): number { return Math.max(0, Math.min(100, Math.round(value))) }
function resetLabel(resetAt: number | undefined): string | undefined {
  if (resetAt === undefined || !Number.isFinite(resetAt)) return undefined
  const value = resetAt < 10_000_000_000 ? resetAt * 1000 : resetAt
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return `Resets ${date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
}

/** Create the frame-wide meter; the host callback remains outside component props. */
export function createCodexUsagePill(fetchUsage: FetchUsage) {
  return function CodexUsagePill(_props: Props) {
    const [usage, setUsage] = useState<Usage>()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const refreshRef = useRef<() => void>(() => {})
    useEffect(() => {
      let disposed = false
      let controller: AbortController | undefined
      const refresh = () => {
        controller?.abort()
        controller = new AbortController()
        const request = controller
        setLoading(true)
        void fetchUsage(request.signal).then((value) => {
          if (!disposed && request === controller) setUsage(value)
        }, (error: unknown) => {
          if (!disposed && request === controller && !(error instanceof DOMException && error.name === 'AbortError')) {
            setUsage({ available: false, windows: [], error: 'Unable to load usage', fetchedAt: new Date().toISOString() })
          }
        }).finally(() => {
          if (!disposed && request === controller) setLoading(false)
        })
      }
      refreshRef.current = refresh
      refresh()
      const timer = window.setInterval(refresh, 30 * 1000)
      const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
      document.addEventListener('visibilitychange', onVisibility)
      window.addEventListener('focus', refresh)
      return () => {
        disposed = true
        controller?.abort()
        window.clearInterval(timer)
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('focus', refresh)
        refreshRef.current = () => {}
      }
    }, [fetchUsage])
    const windows = usage?.windows ?? []
    const summary = loading ? 'Loading…' : usage?.available === false ? 'Unavailable' : windows.length === 0 ? 'No data' : `${pct(windows[0]?.usedPercent ?? 0)}% used`
    return <div className={css.root}>
      <button type="button" className={css.trigger} onClick={() => { setOpen(value => !value) }} aria-expanded={open} aria-controls="codex-usage-dialog" aria-haspopup="dialog" title="ChatGPT plan usage">
        <span className={css.dot} aria-hidden="true" /><span>GPT plan</span><span className={css.summary}>{summary}</span>
      </button>
      {open && <div id="codex-usage-dialog" className={css.card} role="dialog" aria-labelledby="codex-usage-title">
        <div className={css.cardHeader}><h2 id="codex-usage-title">{usage?.planType ?? 'ChatGPT plan'}</h2><button type="button" className={css.refresh} aria-label="Refresh usage" disabled={loading} onClick={() => { refreshRef.current() }}>↻</button></div>
        {windows.length === 0 ? <p className={css.message}>{usage?.error ?? 'No usage windows returned.'}</p> : windows.map((window, index) => {
          const reset = resetLabel(window.resetAt)
          return <div className={css.row} key={`${label(window, index)}-${index}`}><div className={css.rowLabel}><span>{label(window, index)}</span><span>{pct(window.usedPercent)}%</span></div>{reset !== undefined && <div className={css.reset}>{reset}</div>}<div className={css.track}><div className={css.fill} style={{ width: `${pct(window.usedPercent)}%` }} /></div></div>
        })}
        <p className={css.caption}>Updated {usage === undefined ? '—' : new Date(usage.fetchedAt).toLocaleTimeString()}</p>
      </div>}
    </div>
  }
}
