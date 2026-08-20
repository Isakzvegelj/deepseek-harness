// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { createCodexUsagePill } from '../src/client/CodexUsagePill.tsx'

afterEach(cleanup)

const props = {} as PropsRuntime<'shell.overlay'>
type UsageWindowValue = { usedPercent: number; resetAt?: number; limitWindowSeconds?: number }
type UsageValue = { available: boolean; windows: UsageWindowValue[]; error?: string }
const value = (overrides: Partial<UsageValue> = {}) => ({
  available: true,
  windows: [{ usedPercent: 42 }],
  fetchedAt: new Date(0).toISOString(),
  ...overrides,
})

describe('CodexUsagePill', () => {
  it('cancels the previous request and ignores its late result', async () => {
    const requests: Array<{ signal: AbortSignal; resolve: (result: ReturnType<typeof value>) => void }> = []
    const fetchUsage = vi.fn((signal?: AbortSignal) => new Promise<ReturnType<typeof value>>((resolve) => {
      requests.push({ signal: signal as AbortSignal, resolve })
    }))
    const Pill = createCodexUsagePill(fetchUsage)
    render(<Pill {...props} />)
    await waitFor(() => { expect(fetchUsage).toHaveBeenCalledTimes(1) })
    fireEvent(window, new Event('focus'))
    await waitFor(() => { expect(fetchUsage).toHaveBeenCalledTimes(2) })
    expect(requests[0]?.signal.aborted).toBe(true)
    requests[0]?.resolve(value({ windows: [{ usedPercent: 1 }] }))
    requests[1]?.resolve(value({ windows: [{ usedPercent: 42 }] }))
    expect(await screen.findByText('42% used')).toBeTruthy()
    expect(screen.queryByText('1% used')).toBeNull()
  })

  it('reports manual refresh rejection and labels successful empty data clearly', async () => {
    let resolveInitial!: (result: ReturnType<typeof value>) => void
    const fetchUsage = vi.fn()
      .mockImplementationOnce(() => new Promise<ReturnType<typeof value>>((resolve) => { resolveInitial = resolve }))
      .mockImplementationOnce(() => Promise.reject(new Error('offline')))
    const Pill = createCodexUsagePill(fetchUsage)
    render(<Pill {...props} />)
    resolveInitial(value({ windows: [] }))
    expect(await screen.findByText('No data')).toBeTruthy()
    fireEvent.click(screen.getByTitle('ChatGPT plan usage'))
    const dialog = screen.getByRole('dialog', { name: 'ChatGPT plan' })
    expect(screen.getByRole('button', { name: 'Refresh usage' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh usage' }))
    expect(await within(dialog).findByText('Unable to load usage')).toBeTruthy()
  })

  it('shows the provider reset timestamp', async () => {
    const fetchUsage = vi.fn(() => Promise.resolve(value({
      windows: [{ usedPercent: 42, resetAt: 1_800_000_000, limitWindowSeconds: 604_800 }],
    })))
    const Pill = createCodexUsagePill(fetchUsage)
    render(<Pill {...props} />)
    expect(await screen.findByText('42% used')).toBeTruthy()
    fireEvent.click(screen.getByTitle('ChatGPT plan usage'))
    expect(await screen.findByText(/^Resets /)).toBeTruthy()
  })
})
