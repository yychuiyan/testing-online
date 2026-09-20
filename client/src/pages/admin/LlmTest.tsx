import { useCallback, useEffect, useState } from 'react'
import {
  Card, Button, InputNumber, Select, Space, Table, Tag, Typography,
  Row, Col, Statistic, Alert, Descriptions,
} from 'antd'
import { ExperimentOutlined, ThunderboltOutlined, CloudServerOutlined } from '@ant-design/icons'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { llmFetch } from '../../lib/api'
import { LLM_ENDPOINTS } from '../../lib/endpoints'

/**
 * 大模型控制台。
 *
 * 与「性能测试入口」的分工：那边是所有压测场景的总入口，这里是专门给大模型用的操作台。
 * 单独开一页的理由是「能动手」而不是「再列一遍接口」：
 *   - Mock 支持五类注入（错误码 / TTFT 长尾 / 截断），此前没有任何 UI；
 *   - TTFT 必须在客户端从流里量，只讲口径看不见数，这里点一下就能看到实测值；
 *   - 上游配置状态需要一个落脚点。
 *
 * 接口文案与「仪表盘 → 性能接口列表」同源（lib/endpoints），改一处即可。
 */

interface ProviderInfo {
  name: string
  base: string
  models: string[]
  isDefault: boolean
  hasKey: boolean
}
interface ProvidersResp {
  enabled: boolean
  default: string | null
  maxTokens: number
  disableThinking: boolean
  providers: ProviderInfo[]
}

interface CallResult {
  ok: boolean
  status: number
  ttftMs: number | null
  e2eMs: number
  tokens: number
  finishReason: string
  preview: string
  errorCode: string
  note: string
}

/** 可注入的错误；'' 表示不注入 */
const ERROR_OPTIONS = [
  { value: '', label: '不注入（正常返回）' },
  { value: '429', label: '429 限流（带 Retry-After）' },
  { value: '401', label: '401 凭证失效' },
  { value: '400', label: '400 参数错误' },
  { value: '500', label: '500 服务端错误' },
  { value: 'empty', label: 'empty 空响应（200 但内容为空）' },
  { value: 'timeout', label: 'timeout 挂住不返回' },
]

export default function LlmTest() {
  useDocumentTitle('大模型控制台')

  // --- 注入参数 ---
  const [error, setError] = useState('')
  const [ttftMs, setTtftMs] = useState(20)
  const [jitterMs, setJitterMs] = useState(0)
  const [spikeRate, setSpikeRate] = useState(0)
  const [spikeMs, setSpikeMs] = useState(800)
  const [maxTokens, setMaxTokens] = useState(64)
  const [answerTokens, setAnswerTokens] = useState(64)
  const [stream, setStream] = useState(true)
  const [timeoutMs, setTimeoutMs] = useState(3000)

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CallResult | null>(null)

  // --- 上游状态 ---
  const [providers, setProviders] = useState<ProvidersResp | null>(null)
  const [providerErr, setProviderErr] = useState('')

  // --- 成本估算 ---
  const [estRequests, setEstRequests] = useState(1000)
  const [estIn, setEstIn] = useState(500)
  const [estOut, setEstOut] = useState(200)

  // 单价（美元 / 百万 token），取 DeepSeek off-peak 价作为默认参照
  const PRICE_IN = 0.15
  const PRICE_OUT = 0.6

  const fetchProviders = useCallback(async () => {
    setProviderErr('')
    try {
      const res = await llmFetch('/llm-real/v1/providers')
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setProviders(null)
        setProviderErr(body?.error?.message || `HTTP ${res.status}`)
        return
      }
      setProviders(await res.json())
    } catch (e) {
      setProviders(null)
      setProviderErr(e instanceof Error ? e.message : '请求失败')
    }
  }, [])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  /**
   * 打一次 Mock，在客户端量 TTFT。
   *
   * TTFT 只能这样量：从发出请求到收到第一个含内容的 SSE chunk。
   * 非流式请求拿不到这个数——服务端一次性返回，客户端只能看到总时长。
   */
  const run = async () => {
    setRunning(true)
    setResult(null)

    const params = new URLSearchParams()
    if (error) params.set('error', error)
    if (error === 'timeout') params.set('timeout_ms', String(timeoutMs))
    params.set('ttft_ms', String(ttftMs))
    if (jitterMs > 0) params.set('ttft_jitter_ms', String(jitterMs))
    if (spikeRate > 0 && spikeMs > 0) {
      params.set('ttft_spike_rate', String(spikeRate))
      params.set('ttft_spike_ms', String(spikeMs))
    }
    params.set('token_interval_ms', '2')

    const body = {
      model: 'mock-gpt',
      messages: [{ role: 'user', content: '用一句话说明什么是首 token 延迟' }],
      stream,
      max_tokens: maxTokens,
      answer_tokens: answerTokens,
    }

    // 注入 timeout 时服务端不响应，客户端必须自己兜底，否则页面一直转
    const ac = new AbortController()
    const abortTimer = setTimeout(() => ac.abort(), Math.max(timeoutMs + 2000, 8000))

    const t0 = performance.now()
    let ttft: number | null = null
    let tokens = 0
    let finishReason = ''
    let preview = ''
    let status = 0
    let errorCode = ''
    let note = ''

    try {
      const res = await llmFetch(`/llm/v1/chat/completions?${params.toString()}`, {
        method: 'POST',
        body: JSON.stringify(body),
        signal: ac.signal,
      })
      status = res.status

      if (!stream) {
        const data: any = await res.json()
        const e2e = performance.now() - t0
        clearTimeout(abortTimer)
        if (data?.error) {
          return setResult({
            ok: false, status, ttftMs: null, e2eMs: e2e, tokens: 0,
            finishReason: '', preview: '',
            errorCode: data.error.code || '', note: data.error.message || '',
          })
        }
        const msg = data?.choices?.[0]?.message?.content ?? ''
        return setResult({
          ok: true, status, ttftMs: null, e2eMs: e2e,
          tokens: data?.usage?.completion_tokens ?? 0,
          finishReason: data?.choices?.[0]?.finish_reason ?? '',
          preview: msg.slice(0, 80),
          errorCode: '', note: '非流式请求拿不到 TTFT，只能看到总时长',
        })
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('响应没有可读流')

      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          const s = line.trim()
          if (!s.startsWith('data:')) continue
          const payload = s.slice(5).trim()
          if (payload === '[DONE]') continue
          let d: any
          try { d = JSON.parse(payload) } catch { continue }

          if (d?.error) {
            errorCode = d.error.code || ''
            note = d.error.message || ''
            continue
          }
          const choice = d?.choices?.[0]
          const delta = choice?.delta
          if (delta && (delta.content || delta.reasoning_content)) {
            if (ttft === null) ttft = performance.now() - t0
            tokens++
            if (preview.length < 80) preview += delta.content ?? ''
          }
          if (choice?.finish_reason) finishReason = choice.finish_reason
        }
      }

      clearTimeout(abortTimer)
      setResult({
        ok: status < 400,
        status, ttftMs: ttft, e2eMs: performance.now() - t0,
        tokens, finishReason, preview,
        errorCode, note,
      })
    } catch (e) {
      clearTimeout(abortTimer)
      const aborted = e instanceof DOMException && e.name === 'AbortError'
      setResult({
        ok: false, status, ttftMs: null, e2eMs: performance.now() - t0,
        tokens: 0, finishReason: '', preview: '',
        errorCode: aborted ? 'client_abort' : 'client_error',
        note: aborted
          ? `客户端在 ${Math.max(timeoutMs + 2000, 8000)}ms 后主动断开（注入 timeout 时服务端不会响应）`
          : (e instanceof Error ? e.message : '请求异常'),
      })
    } finally {
      setRunning(false)
    }
  }

  const costTotal = estRequests * (estIn / 1e6 * PRICE_IN + estOut / 1e6 * PRICE_OUT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>
          <ExperimentOutlined /> 大模型控制台
        </Typography.Title>
        <Typography.Text type="secondary">
          Mock 注入演练 · TTFT 实测 · 上游状态 · 指标口径与成本
        </Typography.Text>
      </div>

      {/* ---------- 注入控制台 ---------- */}
      <Card title={<><ThunderboltOutlined /> 注入控制台（打 Mock）</>}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="为什么 TTFT 要在这里量"
          description="TTFT 只能在客户端从响应流里量：从发出请求到收到第一个含内容的 chunk。非流式请求拿不到这个数。点「发起请求」后会显示实测的 TTFT 与总时长。"
        />
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">注入错误</Typography.Text>
            <Select
              style={{ width: '100%' }}
              value={error}
              onChange={setError}
              options={ERROR_OPTIONS}
            />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text type="secondary">ttft_ms</Typography.Text>
            <InputNumber min={0} max={30000} style={{ width: '100%' }} value={ttftMs} onChange={v => setTtftMs(v ?? 0)} />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text type="secondary">ttft_jitter_ms</Typography.Text>
            <InputNumber min={0} max={30000} style={{ width: '100%' }} value={jitterMs} onChange={v => setJitterMs(v ?? 0)} />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text type="secondary">spike_rate (%)</Typography.Text>
            <InputNumber min={0} max={100} style={{ width: '100%' }} value={spikeRate} onChange={v => setSpikeRate(v ?? 0)} />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text type="secondary">spike_ms</Typography.Text>
            <InputNumber min={0} max={60000} style={{ width: '100%' }} value={spikeMs} onChange={v => setSpikeMs(v ?? 0)} />
          </Col>

          <Col xs={12} md={4}>
            <Typography.Text type="secondary">max_tokens</Typography.Text>
            <InputNumber min={1} max={4096} style={{ width: '100%' }} value={maxTokens} onChange={v => setMaxTokens(v ?? 1)} />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text type="secondary">
              answer_tokens
              {answerTokens > maxTokens && <Tag color="orange" style={{ marginLeft: 4 }}>截断</Tag>}
            </Typography.Text>
            <InputNumber min={1} max={4096} style={{ width: '100%' }} value={answerTokens} onChange={v => setAnswerTokens(v ?? 1)} />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text type="secondary">timeout_ms</Typography.Text>
            <InputNumber min={0} max={60000} style={{ width: '100%' }} value={timeoutMs} onChange={v => setTimeoutMs(v ?? 0)} />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text type="secondary">流式</Typography.Text>
            <div>
              <Button
                size="small"
                type={stream ? 'primary' : 'default'}
                onClick={() => setStream(s => !s)}
              >
                {stream ? 'stream = true' : 'stream = false'}
              </Button>
            </div>
          </Col>
          <Col xs={24} md={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Space>
              <Button type="primary" loading={running} onClick={run}>发起请求</Button>
              <Button onClick={() => setResult(null)}>清空结果</Button>
            </Space>
          </Col>
        </Row>

        {result && (
          <div style={{ marginTop: 20 }}>
            {result.errorCode && (
              <Alert
                type={result.ok ? 'warning' : 'error'}
                showIcon
                style={{ marginBottom: 12 }}
                message={`错误码：${result.errorCode}`}
                description={result.note}
              />
            )}
            {result.ok && result.tokens === 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="HTTP 200 但没有输出 token —— 典型的「假成功」"
                description="状态码正常、监控不报警，但用户拿到的是空回复。只统计错误率会漏掉这类问题，必须同时看输出 token 数是否为零。"
              />
            )}
            <Row gutter={[16, 16]}>
              <Col xs={12} md={4}><Card size="small"><Statistic title="HTTP" value={result.status || '—'} /></Card></Col>
              <Col xs={12} md={4}>
                <Card size="small">
                  <Statistic
                    title="TTFT (ms)"
                    value={result.ttftMs === null ? '—' : Math.round(result.ttftMs)}
                    valueStyle={{ color: result.ttftMs && result.ttftMs > 500 ? '#cf1322' : undefined }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={4}><Card size="small"><Statistic title="总时长 (ms)" value={Math.round(result.e2eMs)} /></Card></Col>
              <Col xs={12} md={4}><Card size="small"><Statistic title="tokens" value={result.tokens} /></Card></Col>
              <Col xs={12} md={8}>
                <Card size="small">
                  <Statistic
                    title="finish_reason"
                    value={result.finishReason || '—'}
                    valueStyle={{ color: result.finishReason === 'length' ? '#d46b08' : undefined }}
                  />
                </Card>
              </Col>
            </Row>
            {result.preview && (
              <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                <Typography.Text type="secondary">内容预览：</Typography.Text>
                <Typography.Text>{result.preview}…</Typography.Text>
              </Typography.Paragraph>
            )}
          </div>
        )}
      </Card>

      {/* ---------- 上游状态 ---------- */}
      <Card
        title={<><CloudServerOutlined /> 真实上游状态</>}
        extra={<Button size="small" onClick={fetchProviders}>刷新</Button>}
      >
        {providerErr && (
          <Alert
            type="warning"
            showIcon
            message="上游未启用或未配置"
            description={
              <>
                <Typography.Text>{providerErr}</Typography.Text>
                <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                  <Typography.Text type="secondary">
                    启用方式：ENABLE_LLM_UPSTREAM=true 且配置 LLM_UPSTREAM_&lt;NAME&gt;_KEY，然后重启服务端。
                  </Typography.Text>
                </Typography.Paragraph>
              </>
            }
          />
        )}
        {providers && !providers.enabled && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="真实上游未启用（默认关闭）"
            description={
              <>
                启用方式：设 <Typography.Text code>ENABLE_LLM_UPSTREAM=true</Typography.Text> 与
                {' '}<Typography.Text code>LLM_UPSTREAM_DEEPSEEK_KEY=sk-...</Typography.Text>，
                再重启服务端。下方为当前配置快照。
                <br />
                注意：启用后压测也不要打这里的透传接口，它跑在 Node 单进程里，会先于上游饱和。
              </>
            }
          />
        )}
        {providers && (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="已启用">{providers.enabled ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="默认上游">{providers.default ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="max_tokens 上限">{providers.maxTokens}</Descriptions.Item>
              <Descriptions.Item label="强制关闭思考">{providers.disableThinking ? '是' : '否'}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              rowKey="name"
              pagination={false}
              dataSource={providers.providers}
              columns={[
                { title: '名称', dataIndex: 'name', width: 120 },
                { title: '地址', dataIndex: 'base', width: 280, render: (v: string) => <Typography.Text code style={{ fontSize: 12 }}>{v}</Typography.Text> },
                { title: '模型白名单', dataIndex: 'models', render: (v: string[]) => v.map(m => <Tag key={m}>{m}</Tag>) },
                {
                  title: '默认', dataIndex: 'isDefault', width: 70,
                  render: (v: boolean) => (v ? <Tag color="blue">默认</Tag> : '—'),
                },
              ]}
            />
          </>
        )}
      </Card>

      {/* ---------- 指标口径 ---------- */}
      <Card title="指标口径">
        <Table
          size="small"
          rowKey="metric"
          pagination={false}
          dataSource={[
            { metric: 'TTFT', full: 'Time To First Token', how: '从发出请求到收到第一个含内容的 chunk。只能在客户端从流里量', trap: '思考模式下首个 token 是思考内容，与内容首 token 不是一回事' },
            { metric: 'TPOT / ITL', full: 'Time Per Output Token / Inter-Token Latency', how: '(总时长 − TTFT) ÷ (输出 token 数 − 1)', trap: 'token 数要用 usage.completion_tokens，不能数 chunk 个数' },
            { metric: 'E2E', full: '端到端总时长', how: '从发出请求到收到最后一个 chunk', trap: '与 TTFT 是两个指标，混在一起看会掩盖首包慢的问题' },
            { metric: 'Tokens/s', full: 'token 吞吐', how: '输出 token 总数 ÷ 总时长。比 req/s 更能反映 LLM 负载', trap: 'prompt 缓存命中会显著抬高这个值，测出来会虚好' },
            { metric: 'RPS', full: '请求吞吐', how: '完成请求数 ÷ 总时长', trap: 'prompt 长度差异大时，RPS 不能横向比较' },
          ]}
          columns={[
            { title: '指标', dataIndex: 'metric', width: 110, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
            { title: '全称', dataIndex: 'full', width: 240 },
            { title: '怎么算', dataIndex: 'how' },
            { title: '容易错的地方', dataIndex: 'trap' },
          ]}
        />
      </Card>

      {/* ---------- 成本估算 ---------- */}
      <Card title="成本估算">
        <Typography.Paragraph type="secondary">
          单价按 DeepSeek off-peak 参照：输入 ${PRICE_IN}、输出 ${PRICE_OUT} / 百万 token。
          实际跑之前先估一下，避免误用把余额烧光。prompt 缓存命中时输入价可低至 ${'0.003'}。
        </Typography.Paragraph>
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={12} md={5}>
            <Typography.Text type="secondary">请求数</Typography.Text>
            <InputNumber min={1} max={1000000} style={{ width: '100%' }} value={estRequests} onChange={v => setEstRequests(v ?? 1)} />
          </Col>
          <Col xs={12} md={5}>
            <Typography.Text type="secondary">平均输入 token</Typography.Text>
            <InputNumber min={1} max={100000} style={{ width: '100%' }} value={estIn} onChange={v => setEstIn(v ?? 1)} />
          </Col>
          <Col xs={12} md={5}>
            <Typography.Text type="secondary">平均输出 token</Typography.Text>
            <InputNumber min={1} max={100000} style={{ width: '100%' }} value={estOut} onChange={v => setEstOut(v ?? 1)} />
          </Col>
          <Col xs={24} md={9}>
            <Card size="small">
              <Statistic
                title="预估总成本"
                value={costTotal}
                precision={4}
                prefix="$"
                suffix={`≈ ${(costTotal * 7.1).toFixed(2)} 元`}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ---------- 接口 ---------- */}
      <Card title="接口">
        <Table
          size="small"
          rowKey="path"
          pagination={false}
          dataSource={LLM_ENDPOINTS}
          columns={[
            {
              title: '接口', dataIndex: 'path', width: 300,
              render: (v: string, r) => (
                <>
                  <Tag color={r.method === 'POST' ? 'processing' : 'success'}>{r.method}</Tag>
                  <Typography.Text code style={{ fontSize: 12 }}>{v}</Typography.Text>
                </>
              ),
            },
            {
              title: '鉴权', dataIndex: 'auth', width: 90,
              render: (v: string) => (v === 'required' ? <Tag color="gold">需要</Tag> : <Tag>免鉴权</Tag>),
            },
            { title: '说明', dataIndex: 'desc' },
          ]}
        />
      </Card>
    </div>
  )
}
