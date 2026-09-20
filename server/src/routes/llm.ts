import { Router, Request, Response } from 'express'
import { envInt, envBool } from '../lib/env.js'
import { requireAuth } from '../middleware/auth.js'

/**
 * OpenAI 兼容的 Mock 接口。
 *
 * 目的：让 Locust 的 `locust.contrib.oai.OpenAIUser` 这类专门为 LLM 写的
 * 压测类有对象可打。真实 LLM 接口有三个特点和普通接口不同：
 *   1. 首字节时间（TTFT）远大于普通接口——模型要先「思考」；
 *   2. 响应是流式吐出来的，token 逐个到达，总时长和 TTFT 是两个指标；
 *   3. 计费按 token，所以要在响应里带 usage。
 *
 * 挂载点：/api/llm/v1
 * 用法：把 OpenAI client 的 base_url 指向 http://localhost:3001/api/llm/v1 即可。
 *
 * 除了「一条正确的链路」，另外提供三类按请求可控的注入开关，
 * 否则报告里的 P95 / P99 和错误率永远是一个数，练不出解读能力：
 *   - 错误注入：?error=429|401|400|500|empty|timeout
 *   - TTFT 抖动：?ttft_jitter_ms=50&ttft_spike_rate=5&ttft_spike_ms=500
 *   - 截断：?max_tokens=16&answer_tokens=200 → finish_reason=length
 *
 * 参数位置规则：**所有标量参数 query 与 body 都认，query 优先**。
 * 方便 curl 直接加 ?，也方便 OpenAI client 按标准写在 body 里。
 * 只有结构性的两个字段例外，必须放 body：`messages`（数组）、`stream_options`（对象）。
 * 之所以统一：参数放错位置会被静默忽略（返回 200，看不出问题），比报错更难排查。
 */
export const llmRouter = Router()

/**
 * 可选鉴权：ENABLE_LLM_AUTH=true 时，整个 /api/llm/v1 要求 Bearer Token，
 * 走 testing-online 自己的登录态校验（必须先 POST /api/auth/login）。
 * 默认关闭，这样「纯服务端容量」与「带鉴权开销」可以分开测量。
 */
if (envBool('ENABLE_LLM_AUTH', false)) {
  llmRouter.use(requireAuth)
}

/** 默认模拟的首 token 延迟与逐 token 间隔，可用环境变量覆盖 */
const DEFAULT_TTFT_MS = envInt('LLM_TTFT_MS', 20)
const DEFAULT_TOKEN_INTERVAL_MS = envInt('LLM_TOKEN_INTERVAL_MS', 2)
/** error=timeout 挂住多久后主动断开（先超时的通常是客户端） */
const DEFAULT_TIMEOUT_MS = envInt('LLM_TIMEOUT_MS', 30000)

const MAX_TOKENS = 4096
const MAX_PROMPT_CHARS = 20000

const WORDS = ['炊烟', '压测', '推理', '响应', '吞吐', '并发', '延迟', '令牌', '接口', '缓存', '队列', '协程']

/** 读取整型：缺失或非法时回退默认值（用于 Mock 自己的旋钮，不属于 OpenAI 契约） */
function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

/** 注入参数：query 优先，其次 body */
function param(req: Request, body: any, name: string): unknown {
  const q = (req.query as any)?.[name]
  if (q !== undefined && q !== '') return q
  return body?.[name]
}

/**
 * 读取布尔：`true` / `"true"` / `1` / `"1"` 视为真。
 * query 里的值永远是字符串，不能直接用 `=== true` 判断。
 */
function toBool(raw: unknown): boolean {
  if (raw === true) return true
  const s = String(raw ?? '').trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'on'
}

/**
 * 错误注入目录。消息体与 OpenAI 的错误结构保持一致，
 * 这样客户端按 `error.type` / `error.code` 分支的代码能被真正跑一遍。
 */
const ERROR_SPECS = {
  '429': {
    status: 429,
    type: 'rate_limit_error',
    code: 'rate_limit_exceeded',
    message: 'Rate limit reached for requests. Please retry after a short wait.',
    retryAfter: true,
  },
  '401': {
    status: 401,
    type: 'invalid_request_error',
    code: 'invalid_api_key',
    message: 'Incorrect API key provided. You can find your API key in the console.',
    wwwAuthenticate: true,
  },
  '400': {
    status: 400,
    type: 'invalid_request_error',
    code: null,
    message: 'Invalid request: the prompt or a parameter is not acceptable.',
  },
  '500': {
    status: 500,
    type: 'server_error',
    code: null,
    message: 'The server had an error while processing your request.',
  },
} as const

type ErrorKey = keyof typeof ERROR_SPECS

function isErrorKey(key: string): key is ErrorKey {
  return Object.prototype.hasOwnProperty.call(ERROR_SPECS, key)
}

/** 统一输出 OpenAI 风格的错误体 */
function sendOpenAIError(
  res: Response,
  status: number,
  body: { message: string; type: string; code: string | null; param?: string | null }
) {
  return res.status(status).json({
    error: {
      message: body.message,
      type: body.type,
      param: body.param ?? null,
      code: body.code,
    },
  })
}

/**
 * 粗略估算 token 数：中文按 1 字 1 token，其余按 4 字符 1 token。
 * 真实 tokenizer 会精确得多，这里够用。
 */
function estimateTokens(text: string): number {
  let cjk = 0
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) cjk++
  }
  const other = Math.max(0, text.length - cjk)
  return Math.max(1, cjk + Math.ceil(other / 4))
}

/** 生成 n 个「token」的内容片段 */
function makeTokenPieces(n: number): string[] {
  const pieces: string[] = []
  for (let i = 0; i < n; i++) {
    pieces.push(WORDS[i % WORDS.length] + (i > 0 && i % 9 === 0 ? '。' : ''))
  }
  return pieces
}

/** 把 messages 拍平成纯文本。长度校验由调用方负责，这里不再静默截断 */
function flattenMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return ''
  return messages
    .map((m: any) => {
      if (typeof m?.content === 'string') return m.content
      // 多模态 content 是数组，取其中的文本部分
      if (Array.isArray(m?.content)) {
        return m.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('')
      }
      return ''
    })
    .join('\n')
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
}

/**
 * POST /api/llm/v1/chat/completions
 *
 * 支持 stream（默认 false）与 stream_options.include_usage，
 * 另外可带 `ttft_ms` / `token_interval_ms` 覆盖默认的模拟延迟。
 */
llmRouter.post('/chat/completions', (req: Request, res: Response) => {
  const body = req.body ?? {}
  const model = String(param(req, body, 'model') || 'mock-gpt')
  const stream = toBool(param(req, body, 'stream'))
  const streamOptions = body.stream_options ?? {}
  const includeUsage = streamOptions.include_usage === true

  // ---------- 1. 校验「契约」参数：越界就报 400，不再静默钳制 ----------
  // 这些参数 query 与 body 都认（query 优先），与上面的注入开关保持同一套规则，
  // 避免「放错位置被静默忽略」——那比报错更难排查。

  const rawMaxTokens = param(req, body, 'max_tokens')
  let maxTokens = 64
  if (rawMaxTokens !== undefined && rawMaxTokens !== null && rawMaxTokens !== '') {
    const n = Number(rawMaxTokens)
    if (!Number.isInteger(n) || n < 1 || n > MAX_TOKENS) {
      return sendOpenAIError(res, 400, {
        message: `Invalid 'max_tokens': expected an integer between 1 and ${MAX_TOKENS}, but got ${JSON.stringify(rawMaxTokens)}.`,
        type: 'invalid_request_error',
        code: 'invalid_parameter',
        param: 'max_tokens',
      })
    }
    maxTokens = n
  }

  // 模型「本来想输出」的长度。默认等于上限，也就是「刚好不截断」，
  // 与加这个参数之前的行为完全一致。
  const rawAnswerTokens = param(req, body, 'answer_tokens')
  let answerTokens = maxTokens
  if (rawAnswerTokens !== undefined && rawAnswerTokens !== null && rawAnswerTokens !== '') {
    const n = Number(rawAnswerTokens)
    if (!Number.isInteger(n) || n < 1 || n > MAX_TOKENS) {
      return sendOpenAIError(res, 400, {
        message: `Invalid 'answer_tokens': expected an integer between 1 and ${MAX_TOKENS}, but got ${JSON.stringify(rawAnswerTokens)}.`,
        type: 'invalid_request_error',
        code: 'invalid_parameter',
        param: 'answer_tokens',
      })
    }
    answerTokens = n
  }

  const prompt = flattenMessages(body.messages)
  if (prompt.length > MAX_PROMPT_CHARS) {
    return sendOpenAIError(res, 400, {
      message: `This model's maximum prompt length is ${MAX_PROMPT_CHARS} characters, but the request contained ${prompt.length}.`,
      type: 'invalid_request_error',
      code: 'context_length_exceeded',
      param: 'messages',
    })
  }

  const promptTokens = estimateTokens(prompt)
  const id = `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  const created = Math.floor(Date.now() / 1000)

  // 截断：模型想输出的比上限长，就只吐到上限，并标记 length
  const truncated = answerTokens > maxTokens
  const completionTokens = truncated ? maxTokens : answerTokens
  const finishReason = truncated ? 'length' : 'stop'
  const pieces = makeTokenPieces(completionTokens)

  const usage = {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  }

  // ---------- 2. 错误注入 ----------

  const rawError = param(req, body, 'error')
  if (rawError !== undefined && rawError !== null && String(rawError) !== '') {
    const key = String(rawError)

    if (key === 'empty') {
      // 返回 200 但内容为空：高并发下最常见的「假成功」
      if (!stream) {
        return res.json({
          id,
          object: 'chat.completion',
          created,
          model,
          choices: [
            { index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'stop' },
          ],
          usage: { prompt_tokens: promptTokens, completion_tokens: 0, total_tokens: promptTokens },
        })
      }
      res.writeHead(200, SSE_HEADERS)
      res.write(
        `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] })}\n\n`
      )
      res.write(
        `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`
      )
      if (includeUsage) {
        res.write(
          `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model, choices: [], usage: { prompt_tokens: promptTokens, completion_tokens: 0, total_tokens: promptTokens } })}\n\n`
        )
      }
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    if (key === 'timeout') {
      // 什么都不回，等客户端先超时；到点主动断开，避免连接泄漏
      const ms = clampInt(param(req, body, 'timeout_ms'), 0, 600000, DEFAULT_TIMEOUT_MS)
      const timer = setTimeout(() => {
        if (!res.writableEnded) res.destroy()
      }, ms)
      res.on('close', () => clearTimeout(timer))
      return
    }

    if (!isErrorKey(key)) {
      return sendOpenAIError(res, 400, {
        message: `Unknown injected error '${key}'. Valid values: ${Object.keys(ERROR_SPECS).join(', ')}, empty, timeout.`,
        type: 'invalid_request_error',
        code: 'invalid_parameter',
        param: 'error',
      })
    }

    const spec = ERROR_SPECS[key]
    if ('retryAfter' in spec && spec.retryAfter) {
      res.setHeader('Retry-After', String(clampInt(param(req, body, 'retry_after'), 0, 3600, 1)))
      res.setHeader('X-RateLimit-Limit', '60')
      res.setHeader('X-RateLimit-Remaining', '0')
    }
    if ('wwwAuthenticate' in spec && spec.wwwAuthenticate) {
      res.setHeader('WWW-Authenticate', 'Bearer')
    }
    return sendOpenAIError(res, spec.status, {
      message: spec.message,
      type: spec.type,
      code: spec.code,
    })
  }

  // ---------- 3. 正常链路 ----------

  const ttftMs = clampInt(param(req, body, 'ttft_ms'), 0, 30000, DEFAULT_TTFT_MS)
  const jitterMs = clampInt(param(req, body, 'ttft_jitter_ms'), 0, 30000, 0)
  const spikeRate = clampInt(param(req, body, 'ttft_spike_rate'), 0, 100, 0)
  const spikeMs = clampInt(param(req, body, 'ttft_spike_ms'), 0, 60000, 0)
  const tokenIntervalMs = clampInt(param(req, body, 'token_interval_ms'), 0, 5000, DEFAULT_TOKEN_INTERVAL_MS)

  /**
   * 首 token 延迟 = 基准 + 均匀抖动 + 概率性长尾尖峰。
   * 只有抖动的话，P50 到 P99 会平得像一条线；尖峰才是真实 LLM 的长尾来源。
   */
  const firstTokenDelay = () => {
    const base = ttftMs + (jitterMs > 0 ? Math.random() * jitterMs : 0)
    const spike = spikeMs > 0 && spikeRate > 0 && Math.random() * 100 < spikeRate ? spikeMs : 0
    return Math.round(base + spike)
  }

  if (!stream) {
    // 非流式：等「思考」完一次性返回
    return setTimeout(() => {
      res.json({
        id,
        object: 'chat.completion',
        created,
        model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: pieces.join('') },
            finish_reason: finishReason,
          },
        ],
        usage,
      })
    }, firstTokenDelay())
  }

  // 流式：SSE，逐 token 推送
  res.writeHead(200, SSE_HEADERS)

  let closed = false
  let timer: NodeJS.Timeout | null = null

  const stop = () => {
    closed = true
    if (timer) clearTimeout(timer)
    timer = null
  }
  // 同 /api/scenario/stream：req 的 close 会在请求体读完时提前触发，必须用 res
  res.on('close', stop)

  const writeChunk = (payload: unknown) => {
    if (!closed && !res.writableEnded) res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const base = { id, object: 'chat.completion.chunk', created, model }

  const sendNext = (index: number) => {
    if (closed || res.writableEnded) return

    if (index === 0) {
      // 首个 chunk 只带 role
      writeChunk({ ...base, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] })
      timer = setTimeout(() => sendNext(1), tokenIntervalMs)
      return
    }

    if (index <= pieces.length) {
      writeChunk({
        ...base,
        choices: [{ index: 0, delta: { content: pieces[index - 1] }, finish_reason: null }],
      })
      timer = setTimeout(() => sendNext(index + 1), tokenIntervalMs)
      return
    }

    // 收尾：finish_reason（截断时为 length）
    writeChunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: finishReason }] })

    if (includeUsage) {
      writeChunk({ ...base, choices: [], usage })
    }

    if (!closed && !res.writableEnded) res.write('data: [DONE]\n\n')
    res.end()
    stop()
  }

  timer = setTimeout(() => sendNext(0), firstTokenDelay())
})

/**
 * GET /api/llm/v1/models
 *
 * 有些 OpenAI 客户端启动时会先探一次模型列表，补上避免报错。
 */
llmRouter.get('/models', (_req: Request, res: Response) => {
  return res.json({
    object: 'list',
    data: [{ id: 'mock-gpt', object: 'model', owned_by: 'testing-online' }],
  })
})
