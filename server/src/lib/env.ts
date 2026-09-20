/** 读取整型环境变量；缺失或非法时回退默认值 */
export function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

/** 读取布尔环境变量；1 / true / yes / on 视为真 */
export function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  if (raw === undefined || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw)
}
