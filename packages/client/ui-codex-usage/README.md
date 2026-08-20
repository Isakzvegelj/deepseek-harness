# `@deepseek-ai/dsh-client-ui-codex-usage`

English | [中文](README.zh.md)

The browser half contributes a compact frame-wide meter for the ChatGPT/Codex plan's provider-reported session and weekly rate-limit windows. The host fetches usage with its configured `CODEX_ACCESS_TOKEN`; the bearer token never crosses the RPC boundary.

## Configuration

No settings are required. When Codex is not connected or the usage endpoint is unavailable, the pill remains available and reports the failure without blocking conversation use.

## Model Experience

None, as this package renders provider-reported account usage for a human and registers nothing model-facing.

#### KV Cache effect

None; the package does not assemble provider requests.

## Known Limitations and Deferred Work

- The ChatGPT usage endpoint is provider-owned and may change its response fields or availability.
- Values are refreshed on mount and every 30 seconds; the meter is informational and does not gate requests.
