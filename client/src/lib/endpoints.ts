/**
 * 接口清单的单一数据源。
 *
 * 为什么单独抽出来：这份清单原先分散在三个地方（仪表盘的功能接口列表与性能接口列表、
 * 性能测试入口的场景表），改一处漏两处是必然。现在只在「仪表盘」与「大模型控制台」
 * 之间共享数据，交互控件留在各自的页面组件里（它们依赖组件状态，不适合放这里）。
 *
 * 约定：
 *   - 本文件只放纯数据，不放 JSX，不放请求逻辑；
 *   - 同 group 的条目必须相邻，仪表盘的分组单元格合并依赖数组顺序。
 */

export interface ApiEndpoint {
  group: string
  method: string
  path: string
  desc: string
  params?: string
  body?: string
  /** required = 需要 Bearer Token；none = 故意不加鉴权 */
  auth: 'required' | 'none'
}

/**
 * 功能接口：业务能力本身（增删改查、上传、统计）。
 * 这些是压测时要测的「真实负载」。
 */
export const FUNCTION_ENDPOINTS: ApiEndpoint[] = [
  { group: '认证', method: 'POST', path: '/api/auth/login', desc: '用户登录，返回 Bearer Token', body: '{ username, password }', auth: 'none' },
  { group: '认证', method: 'POST', path: '/api/auth/register', desc: '注册新账号（默认禁用，需管理员激活）', body: '{ username, email, password, phone?, role? }', auth: 'none' },
  { group: '认证', method: 'POST', path: '/api/auth/logout', desc: '用户登出', auth: 'required' },
  { group: '认证', method: 'GET', path: '/api/auth/me', desc: '获取当前用户信息', auth: 'required' },

  { group: '用户管理', method: 'GET', path: '/api/users', desc: '用户列表（分页、关键词、角色筛选）', params: '?page=1&pageSize=5&keyword=&role=', auth: 'required' },
  { group: '用户管理', method: 'GET', path: '/api/users/:id', desc: '用户详情', auth: 'required' },
  { group: '用户管理', method: 'POST', path: '/api/users', desc: '新增用户', body: '{ username, email, password, role? }', auth: 'required' },
  { group: '用户管理', method: 'PUT', path: '/api/users/:id', desc: '编辑用户', body: '{ username?, email?, status?, password? }', auth: 'required' },
  { group: '用户管理', method: 'DELETE', path: '/api/users/:id', desc: '删除用户（仅超管）', auth: 'required' },
  { group: '用户管理', method: 'PUT', path: '/api/users/:id/role', desc: '修改角色（仅超管）', body: '{ role }', auth: 'required' },

  { group: '商品管理', method: 'GET', path: '/api/products', desc: '商品列表（分页、关键词、分类、排序）', params: '?page=1&pageSize=6&keyword=&categoryId=&sortBy=price', auth: 'required' },
  { group: '商品管理', method: 'GET', path: '/api/products/categories', desc: '商品分类列表', auth: 'required' },
  { group: '商品管理', method: 'GET', path: '/api/products/:id', desc: '商品详情', auth: 'required' },
  { group: '商品管理', method: 'POST', path: '/api/products', desc: '新增商品', body: '{ name, price, description?, brand?, stock?, ... }', auth: 'required' },
  { group: '商品管理', method: 'PUT', path: '/api/products/:id', desc: '编辑商品', body: '{ name?, price?, status?, ... }', auth: 'required' },
  { group: '商品管理', method: 'DELETE', path: '/api/products/:id', desc: '删除商品', auth: 'required' },

  { group: '购物车', method: 'GET', path: '/api/cart', desc: '获取购物车', auth: 'required' },
  { group: '购物车', method: 'POST', path: '/api/cart', desc: '加入购物车', body: '{ productId, quantity? }', auth: 'required' },
  { group: '购物车', method: 'PUT', path: '/api/cart/:id', desc: '修改数量', body: '{ quantity }', auth: 'required' },
  { group: '购物车', method: 'DELETE', path: '/api/cart/:id', desc: '移除购物车项', auth: 'required' },

  { group: '订单管理', method: 'GET', path: '/api/orders', desc: '订单列表（分页、关键词、状态筛选）', params: '?page=1&pageSize=5&keyword=&status=', auth: 'required' },
  { group: '订单管理', method: 'GET', path: '/api/orders/:id', desc: '订单详情', auth: 'required' },
  { group: '订单管理', method: 'POST', path: '/api/orders', desc: '创建订单（下单）。不传 items 即结算购物车并清空它，传 items 则按商品直接下单；会扣库存、加销量', body: '{ items?, address?, paymentMethod? }', auth: 'required' },
  { group: '订单管理', method: 'PUT', path: '/api/orders/:id/status', desc: '修改订单状态', body: '{ status }', auth: 'required' },

  { group: '仪表盘', method: 'GET', path: '/api/dashboard/stats', desc: '统计数据（多处聚合，压测易成瓶颈）', auth: 'required' },
  { group: '仪表盘', method: 'GET', path: '/api/dashboard/trends', desc: '近 N 天趋势', params: '?days=7', auth: 'required' },

  { group: '操作日志', method: 'GET', path: '/api/logs', desc: '操作日志列表', params: '?page=1&pageSize=5&username=&action=', auth: 'required' },

  { group: '文件上传', method: 'POST', path: '/api/upload', desc: '上传图片', body: 'FormData { file }', auth: 'required' },
]

/**
 * 性能接口列表 = 压测要打的「实际目标」，按压测视角挑选与组织。
 *
 * 注意：这不是业务接口全量，而是从「功能接口列表」里挑出的「值得压」的子集。
 *   功能列表按业务模块分组，求全，用来查接口；
 *   这里按压测视角分组，每组只留代表性接口，求准，用来设计压测场景。
 * 未收录的接口不代表它们有问题，只代表压测价值低，分三类：
 *   1) 低频后台管理类写操作（改/删商品、改/删用户、改角色）与全部 DELETE；
 *   2) 与已收录接口性能特征重合的（用户/订单列表、用户/订单详情、订单状态流转…），
 *      同组只留一条代表，理由写在各分组注释里；
 *   3) 极轻量、压不出信息的（分类列表、模型列表）。
 *
 * 合成类辅助接口（/api/scenario/*、/api/mock/*、/api/perf/* 工具链、延迟注入、health）
 * 不在此列出——它们不是业务接口，入口在「性能测试入口」页面。
 */
export const PERF_ENDPOINTS: ApiEndpoint[] = [
  // 登录鉴权：只留「写 session」与「验鉴权」两个端点。
  // 未收录 logout（压测中会破坏会话，干扰其他场景）、register（与「写入链路」的创建同为写用户，重复）。
  { group: '登录鉴权', method: 'POST', path: '/api/auth/login', desc: '「登录风暴」主角。每次登录写一条 session，受 SESSION_LIMIT 上限约束', body: '{ username, password }', auth: 'none' },
  { group: '登录鉴权', method: 'GET', path: '/api/auth/me', desc: '最轻量的带鉴权接口，用来剥离并单独量化「鉴权开销」', auth: 'required' },

  // 列表查询：只留三类代表——有缓存、无缓存、用户态。
  // 未收录 users/orders（与 products 同为「有缓存分页列表」）、categories（常量数组直返，无压测价值）。
  { group: '列表查询', method: 'GET', path: '/api/products', desc: '有缓存分页列表的代表：过滤+排序结果走版本化 LRU 缓存，任何写操作都会让它整体失效', params: '?page=1&pageSize=6&keyword=&categoryId=&sortBy=', auth: 'required' },
  { group: '列表查询', method: 'GET', path: '/api/logs', desc: '无缓存列表的代表：每次请求都真扫全表，与上面的商品列表天然构成缓存对照', params: '?page=1&pageSize=5&username=&action=', auth: 'required' },
  { group: '列表查询', method: 'GET', path: '/api/cart', desc: '用户态读的代表：按登录态过滤，且每项都要回查商品，随购物车项数放大', auth: 'required' },

  // 详情查询：只留 1 条。三个详情接口都走 id 索引，实测响应体 0.27–0.52KB、
  // 中位耗时 0.95–1.20ms，差异全在噪声内，属于同一类，压一条即可代表。
  // 保留商品详情是因为它最典型（用户侧高频、商城核心路径）；users/:id 与 orders/:id
  // 特征完全重合，已从本表移除，要看它们请切到「功能接口列表」。
  { group: '详情查询', method: 'GET', path: '/api/products/:id', desc: '代表性详情查询：id 索引 O(1)。数据被撑到几万条后，这条最能体现索引收益（另两条详情接口同级，未重复列出）', auth: 'required' },

  // 聚合统计：只留最重的一条。trends 与 stats 同为全表聚合，查询模式相近，未重复列出。
  { group: '聚合统计', method: 'GET', path: '/api/dashboard/stats', desc: '多处全表聚合，写操作越多越慢，是「数据量增长后先崩」的典型', auth: 'required' },

  // 写入链路：只留真实高频写与「读-改-写」代表，并新增下单。
  // 下单兼具两种压测价值：多步写的吞吐 + 并发正确性（超卖）。
  // 未收录：改/删商品、改/删用户、改角色（低频后台管理）与全部 DELETE
  //   （破坏性强，压完数据即丢；并发删同一 id 首个 200、其余 404，会让错误率失真；
  //    且性能特征与 GET /:id 几乎一致，压不出新信息）；
  //   以及 PUT /orders/:id/status（与 PUT /cart/:id 同为读-改-写，特征重合）。
  // 要看这些接口请切到「功能接口列表」。
  { group: '写入链路', method: 'POST', path: '/api/orders', desc: '下单：唯一「多步写 + 跨模块联动」的接口——扣库存、加销量、建订单、清购物车、写日志，并让订单列表缓存失效。不传 items 即结算购物车。默认并发安全；设 ORDER_RACE_WINDOW_MS>0 可在「校验库存」与「扣减库存」间插入 await，复现超卖（库存扣成负数）', body: '{ items?, address?, paymentMethod? }', auth: 'required' },
  { group: '写入链路', method: 'POST', path: '/api/cart', desc: '加入购物车：真实高频用户行为，按登录态隔离的有状态写', body: '{ productId, quantity? }', auth: 'required' },
  { group: '写入链路', method: 'PUT', path: '/api/cart/:id', desc: '读-改-写的代表：同一用户并发改同一行可观察覆盖问题', body: '{ quantity }', auth: 'required' },
  { group: '写入链路', method: 'POST', path: '/api/products', desc: '后台创建的代表：写入压力的真实来源，且会让商品列表缓存整体失效', body: '{ name, price, ... }', auth: 'required' },

  // 文件上传：大 body + 磁盘 IO
  { group: '文件上传', method: 'POST', path: '/api/upload', desc: 'multipart 大请求体 + 磁盘写入，瓶颈不在 CPU 而在 IO 与带宽', body: 'FormData { file }', auth: 'required' },

  // 大模型接口：TTFT 与逐 token 输出，统计口径与普通接口不同。
  // 未收录 /models 与 /providers（客户端探一次用，不作为压测目标）。
  { group: '大模型接口', method: 'POST', path: '/api/llm/v1/chat/completions', desc: 'OpenAI 兼容 Mock，零成本、无需登录。支持错误注入（error=429|401|400|500|empty|timeout）、TTFT 抖动与长尾（ttft_jitter_ms / ttft_spike_rate / ttft_spike_ms）、截断（answer_tokens > max_tokens → finish_reason=length）。流式下「首字节时间(TTFT)」与「总时长」必须分开统计', body: '{ model, messages, stream?, max_tokens?, answer_tokens?, ttft_ms?, token_interval_ms?, ttft_jitter_ms?, ttft_spike_rate?, ttft_spike_ms?, error? }（标量参数 query 也认，query 优先；messages 必须放 body）', auth: 'none' },
  { group: '大模型接口', method: 'POST', path: '/api/llm-real/v1/chat/completions', desc: '真实上游透传（默认 DeepSeek）：指标与计费都是真的。默认关闭，需 ENABLE_LLM_UPSTREAM=true 且必须登录；多上游走 /api/llm-real/v1/<provider>/chat/completions。⚠️ 压测请直连上游，不要打这个接口——本服务是 Node 单进程，事件循环会先饱和（实测约 3.4k req/s），数据反映的不是上游', body: '{ model?, messages, stream?, max_tokens? }', auth: 'required' },
]

/**
 * 大模型相关接口单独取一份，供「大模型控制台」与列表页共用。
 * 从 PERF_ENDPOINTS 派生，不另外维护一份，避免两处描述不一致。
 */
export const LLM_ENDPOINTS: ApiEndpoint[] = PERF_ENDPOINTS.filter(e => e.group === '大模型接口')
