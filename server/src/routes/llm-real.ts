import { Router, Request, Response, NextFunction } from 'express'
import { Readable } from 'node:stream'
import { envInt, envBool } from '../lib/env.js'
import { requireAuth } from '../middleware/auth.js'

/**
 * 上游大模型透传接口（真实 API）。
 *
 * 挂载点：/api/llm-real/v1
 *
 * 与 /api/llm/v1（Mock）的关系：
 *   - Mock  ：零成本、可注入错误、适合 CI 回归与边界演练，但行为是模拟的
 *   - Real  ：转发到真实上游，指标与计费都是真的，但花钱、且受供应商容量约束
 *
 * ⚠️ 压测时请直连上游，不要打这个接口。
 *    它自己是 Node 单进程，事件循环先饱和（实测约 3.4k req/s），
 *    打出来的数据反映的是本服务而不是上游。
 *    这里的定位是「统一入口 + 前端演示 + 低频验证」，不是压测通道。
 *
 * 鉴权：本接口必须登录。它直接产生费用，裸奔等于把别人的 API 账单送给公众。
 *       （Mock 故意不加鉴权，方便把「纯服务端容量」和「带鉴权开销」分开测。）
 *
 * ── 多上游 ──
 *
 * 支持同时配置多个供应商，按路径段区分：
 *
 *   POST /api/llm-real/v1/chat/completions            → 默认上游
 *   POST /api/llm-real/v1/deepseek/chat/completions   → 名为 deepseek 的上游
 *   POST /api/llm-real/v1/openai/chat/completions     → 名为 openai 的上游
 *
 * 配置方式（服务名自动从环境变量发现，无需登记）：
 *
 *   LLM_UPSTREAM_DEEPSEEK_KEY=sk-xxx
 *   LLM_UPSTREAM_DEEPSEEK_BASE=https://api.deepseek.com
 *   LLM_UPSTREAM_DEEPSEEK_MODELS=deepseek-flash,deepseek-v4-pro
 *
 *   LLM_UPSTREAM_OPENAI_KEY=sk-yyy
 *   LLM_UPSTREAM_OPENAI_BASE=https://api.openai.com/v1
 *   LLM_UPSTREAM_OPENAI_MODELS=gpt-4o-mini
 *
 * 也兼容不带名字的旧写法，它会注册成名为 default 的上游：
 *
 *   LLM_UPSTREAM_KEY / LLM_UPSTREAM_BASE / LLM_UPSTREAM_MODELS
 *
 * 默认上游的优先级：LLM_UPSTREAM_DEFAULT 指定的名字 > default > 第一个（按字母序）。
 */

const DEFAULT_BASE = 'https://api.deepseek.com'
const DEFAULT_MODELS = ['deepseek-flash', 'deepseek-v4-pro']
const LEGACY_PROVIDER = 'default'
/** 模型白名单里写 * 表示放行上游返回的全部模型（不推荐，失去成本保护） */
const ALLOW_ANY = '*'

/** 我方注入的压测旋钮，绝不能透传给上游 */
const INJECTED_PARAMS = new Set([
  'error', 'timeout_ms', 'retry_after',
  'ttft_ms', 'ttft_jitter_ms', 'ttft_spike_rate', 'ttft_spike_ms',
  'token_interval_ms', 'answer_tokens',
])

interface Provider {
  name: string
  key: string
  base: string
  models: string[]
}

function parseModels(raw: string | undefined): string[] {
  const list = (raw ? raw.split(',') : DEFAULT_MODELS).map(s => s.trim()).filter(Boolean)
  return list.length > 0 ? list : DEFAULT_MODELS
}

function buildProvider(name: string, upper: string, legacy = false): Provider | null {
  const p = legacy ? 'LLM_UPSTREAM' : `LLM_UPSTREAM_${upper}`
  const key = (process.env[`${p}_KEY`] || '').trim()
  if (!key) return null
  return {
    name,
    key,
    base: (process.env[`${p}_BASE`] || DEFAULT_BASE).replace(/\/+$/, ''),
    models: parseModels(process.env[`${p}_MODELS`]),
  }
}

/**
 * 扫描环境变量，发现所有已配置的上游。
 *
 * 为什么用扫描而不是显式登记：少一处配置就少一处忘记改的地方。
 * 只要按约定命名，加一个供应商就是加三行环境变量，不用动代码。
 *
 * 注意 `LLM_UPSTREAM_KEY`（旧写法）不会被 `_KEY$` 正则误判成名为空的上游：
 * 前缀之后只剩 "KEY"，无法再拆出一个「名字 + _KEY」。
 */
function loadProviders(): { providers: Map<string, Provider>; defaultName: string | null } {
  const providers = new Map<string, Provider>()

  const names = new Set<string>()
  for (const envKey of Object.keys(process.env)) {
    const m = /^LLM_UPSTREAM_([A-Z0-9]+)_KEY$/.exec(envKey)
    if (m) names.add(m[1].toLowerCase())
  }

  // 排序保证「取第一个」的结果稳定可复现
  for (const name of [...names].sort()) {
    const provider = buildProvider(name, name.toUpperCase())
    if (provider) providers.set(name, provider)
  }

  // 旧写法兜底；已被具名 default 占用时不覆盖
  if (!providers.has(LEGACY_PROVIDER)) {
    const legacy = buildProvider(LEGACY_PROVIDER, '', true)
    if (legacy) providers.set(LEGACY_PROVIDER, legacy)
  }

  const wanted = (process.env.LLM_UPSTREAM_DEFAULT || '').trim().toLowerCase()
  let defaultName: string | null = null
  if (wanted && providers.has(wanted)) {
    defaultName = wanted
  } else if (providers.has(LEGACY_PROVIDER)) {
    defaultName = LEGACY_PROVIDER
  } else {
    defaultName = providers.keys().next().value ?? null
  }

  return { providers, defaultName }
}

const CONFIG = {
  enabled: envBool('ENABLE_LLM_UPSTREAM', false),
  /** 单次请求的 max_tokens 硬上限，防止误用把余额烧光 */
  maxTokens: envInt('LLM_UPSTREAM_MAX_TOKENS', 1024),
  timeoutMs: envInt('LLM_UPSTREAM_TIMEOUT_MS', 120000),
  /** 压测要干净的指标，默认强制关闭思考模式；?thinking=enabled 可覆盖 */
  disableThinking: envBool('LLM_UPSTREAM_DISABLE_THINKING', true),
  ...loadProviders(),
}

export const llmRealRouter = Router()

/** OpenAI 风格的错误体，与 /api/llm/v1 保持一致 */
function sendError(
  res: Response,
  status: number,
  message: string,
  type = 'invalid_request_error',
  code: string | null = null,
  param: string | null = null
) {
  return res.status(status).json({ error: { message, type, param, code } })
}

function providerNames(): string {
  return [...CONFIG.providers.keys()].join(', ') || '（无）'
}

/**
 * 解析本次请求要用的上游。
 * 路径里没给 provider 时走默认上游；给了但没配置则 404，并列出可用的名字。
 */
function resolveProvider(req: Request, res: Response): Provider | null {
  const raw = req.params?.provider

  if (raw === undefined || raw === '') {
    if (!CONFIG.defaultName) {
      sendError(res, 503,
        'No upstream provider is configured. Set LLM_UPSTREAM_<NAME>_KEY (or the legacy LLM_UPSTREAM_KEY).',
        'invalid_request_error', 'no_provider')
      return null
    }
    const p = CONFIG.providers.get(CONFIG.defaultName)
    if (!p) {
      sendError(res, 503, `Default provider '${CONFIG.defaultName}' is not configured.`,
        'invalid_request_error', 'no_provider')
      return null
    }
    return p
  }

  const name = String(raw).toLowerCase()
  const p = CONFIG.providers.get(name)
  if (!p) {
    sendError(res, 404, `Unknown provider '${name}'. Available: ${providerNames()}.`,
      'invalid_request_error', 'unknown_provider', 'provider')
    return null
  }
  return p
}

/** 模型是否在该上游的白名单内 */
function modelAllowed(provider: Provider, model: string): boolean {
  return provider.models.includes(ALLOW_ANY) || provider.models.includes(model)
}

// 先过鉴权边界，再检查配置，避免把「功能是否开启」暴露给未登录者
llmRealRouter.use(requireAuth)

/** 代理类路由统一的前置检查 */
function requireUpstreamEnabled(_req: Request, res: Response, next: NextFunction) {
  if (!CONFIG.enabled) {
    return sendError(res, 503,
      'Upstream LLM is disabled. Set ENABLE_LLM_UPSTREAM=true and configure LLM_UPSTREAM_<NAME>_KEY to enable it.',
      'invalid_request_error', 'upstream_disabled')
  }
  if (CONFIG.providers.size === 0) {
    return sendError(res, 503,
      'Upstream LLM is enabled but no provider is configured. Set LLM_UPSTREAM_<NAME>_KEY.',
      'invalid_request_error', 'no_provider')
  }
  next()
}

/**
 * GET /api/llm-real/v1/providers
 *
 * 列出已配置的上游，供前端展示和脚本发现。
 * 故意不经过 requireUpstreamEnabled：功能没开时也要能查到「有哪些上游、默认是哪个」，
 * 否则页面上只能显示一个 503，排查不了配置。
 * 不会返回 key 本身，只返回是否已配置。
 */
llmRealRouter.get('/providers', (_req: Request, res: Response) => {
  return res.json({
    enabled: CONFIG.enabled,
    default: CONFIG.defaultName,
    maxTokens: CONFIG.maxTokens,
    disableThinking: CONFIG.disableThinking,
    providers: [...CONFIG.providers.values()].map(p => ({
      name: p.name,
      base: p.base,
      models: p.models,
      isDefault: p.name === CONFIG.defaultName,
      hasKey: true,
    })),
  })
})

/**
 * GET /api/llm-real/v1[/:provider]/models
 *
 * 透传上游的模型列表；上游不可达时回退到本地白名单，
 * 这样前端在没有网络或 key 失效时仍能看到可选模型。
 */
async function handleModels(req: Request, res: Response) {
  const provider = resolveProvider(req, res)
  if (!provider) return

  try {
    const upstream = await fetch(`${provider.base}/models`, {
      headers: { Authorization: `Bearer ${provider.key}` },
      signal: AbortSignal.timeout(Math.min(CONFIG.timeoutMs, 15000)),
    })
    if (upstream.ok) {
      const data: any = await upstream.json()
      // 只放行白名单内的模型；配了 * 则不筛
      if (!provider.models.includes(ALLOW_ANY) && Array.isArray(data?.data)) {
        data.data = data.data.filter((m: any) => provider.models.includes(m?.id))
      }
      return res.json(data)
    }
  } catch {
    // 落到下面的本地回退
  }

  return res.json({
    object: 'list',
    data: provider.models
      .filter(m => m !== ALLOW_ANY)
      .map(id => ({ id, object: 'model', owned_by: provider.name })),
  })
}

llmRealRouter.get('/models', requireUpstreamEnabled, handleModels)
llmRealRouter.get('/:provider/models', requireUpstreamEnabled, handleModels)

/**
 * POST /api/llm-real/v1[/:provider]/chat/completions
 *
 * 透传对话补全，支持 stream。上游的状态码与 Retry-After 原样回传，
 * 这样压测脚本能真实地演练 429 退避与错误分支。
 */
async function handleChatCompletions(req: Request, res: Response) {
  const provider = resolveProvider(req, res)
  if (!provider) return

  const body = req.body ?? {}

  // ---------- 边界校验 ----------

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return sendError(res, 400, "Invalid 'messages': expected a non-empty array.",
      'invalid_request_error', 'invalid_parameter', 'messages')
  }

  const allowAny = provider.models.includes(ALLOW_ANY)
  const defaultModel = allowAny ? '' : provider.models[0]
  const model = String(body.model || defaultModel)

  if (!model) {
    return sendError(res, 400,
      `'model' is required for provider '${provider.name}' (its whitelist is '*').`,
      'invalid_request_error', 'invalid_parameter', 'model')
  }
  if (!modelAllowed(provider, model)) {
    return sendError(res, 400,
      `Invalid 'model': '${model}' is not allowed for provider '${provider.name}'. ` +
      `Available: ${provider.models.join(', ')}.`,
      'invalid_request_error', 'invalid_parameter', 'model')
  }

  let maxTokens = CONFIG.maxTokens
  if (body.max_tokens !== undefined && body.max_tokens !== null && body.max_tokens !== '') {
    const n = Number(body.max_tokens)
    if (!Number.isInteger(n) || n < 1) {
      return sendError(res, 400,
        `Invalid 'max_tokens': expected a positive integer, but got ${JSON.stringify(body.max_tokens)}.`,
        'invalid_request_error', 'invalid_parameter', 'max_tokens')
    }
    if (n > CONFIG.maxTokens) {
      return sendError(res, 400,
        `Invalid 'max_tokens': ${n} exceeds this endpoint's cap of ${CONFIG.maxTokens}. ` +
        `Raise LLM_UPSTREAM_MAX_TOKENS to change it.`,
        'invalid_request_error', 'invalid_parameter', 'max_tokens')
    }
    maxTokens = n
  }

  // ---------- 组装上游请求体 ----------

  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!INJECTED_PARAMS.has(k)) payload[k] = v
  }
  payload.model = model
  payload.max_tokens = maxTokens

  // 思考模式：默认关（指标干净、成本低），?thinking=enabled 显式打开
  const thinkingQ = String(req.query.thinking || '').toLowerCase()
  if (thinkingQ === 'enabled') {
    payload.thinking = { type: 'enabled' }
  } else if (thinkingQ === 'disabled' || CONFIG.disableThinking) {
    payload.thinking = { type: 'disabled' }
  }

  const isStream = body.stream === true

  // ---------- 转发 ----------

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), CONFIG.timeoutMs)
  // 客户端提前断开时中止上游，避免继续计费
  res.on('close', () => {
    if (!res.writableEnded) ac.abort()
  })

  try {
    const upstream = await fetch(`${provider.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
        Accept: isStream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    })

    // 状态码与关键头原样回传，让调用方能真实处理 429 / 401
    res.status(upstream.status)
    const ct = upstream.headers.get('content-type')
    if (ct) res.setHeader('Content-Type', ct)
    const retryAfter = upstream.headers.get('retry-after')
    if (retryAfter) res.setHeader('Retry-After', retryAfter)
    // 便于排查「这次打到哪个上游」，不泄密
    res.setHeader('X-Upstream-Provider', provider.name)

    if (!upstream.body) {
      clearTimeout(timer)
      return res.end()
    }

    const stream = Readable.fromWeb(upstream.body as any)
    const cleanup = () => clearTimeout(timer)
    stream.on('end', cleanup)
    stream.on('error', () => {
      cleanup()
      if (!res.writableEnded) res.end()
    })
    res.on('close', () => {
      cleanup()
      stream.destroy()
    })
    stream.pipe(res)
  } catch (err: any) {
    clearTimeout(timer)
    if (res.headersSent) {
      // 已经吐过数据，无法再改状态码，只能断开
      return res.end()
    }
    const aborted = err?.name === 'AbortError' || err?.name === 'TimeoutError'
    return sendError(
      res, aborted ? 504 : 502,
      aborted
        ? `Upstream '${provider.name}' did not respond within ${CONFIG.timeoutMs}ms.`
        : `Failed to reach upstream '${provider.name}': ${err?.message || 'unknown error'}`,
      'server_error',
      aborted ? 'upstream_timeout' : 'upstream_unreachable'
    )
  }
}

llmRealRouter.post('/chat/completions', requireUpstreamEnabled, handleChatCompletions)
llmRealRouter.post('/:provider/chat/completions', requireUpstreamEnabled, handleChatCompletions)
