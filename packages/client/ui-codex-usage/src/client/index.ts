import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { createCodexUsagePill } from './CodexUsagePill.tsx'

/** Required host connection and overlay registration services. */
export const inject = ['connection', 'slots']

/** Browser plugin body: register a frame-wide Codex usage pill. */
export function apply(ctx: ClientContext & { connection: ConnectionHandle }): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'codex-usage',
    order: 10,
  }, createCodexUsagePill(signal => ctx.connection.api.llm.codexUsage({}, signal).then((response) => {
    if (!response.result.ok) throw new Error(response.result.error.message)
    return response.result.value
  }))))
}
