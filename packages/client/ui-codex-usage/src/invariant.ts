/** Package-owned invariant companion for the read-only usage projection. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-codex-usage'
export const name = 'client-ui-codex-usage-invariant'
export const inject = ['invariants']

/** No runtime invariant: the feature owns only a disposable slot registration and no durable state. */
const install: InvariantInstaller = () => {}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
