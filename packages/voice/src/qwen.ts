/**
 * Qwen realtime synthesis constants and the 48 system voices.
 * The voice column is sent to DashScope verbatim: case matters, and the names
 * with a space (`Eldric Sage`, `Ono Anna`, `Radio Gol`) keep it.
 */

export type QwenVoiceGroup = 'standard' | 'dialect'

export interface QwenVoice {
  /** `session.update.session.voice`, exactly as DashScope lists it. */
  readonly voice: string
  readonly name: string
  readonly gender: '男' | '女'
  /** One-line trait for the Mandarin group, or the dialect for the dialect group. */
  readonly note: string
  readonly group: QwenVoiceGroup
}

/** Fixed Beijing region. There is no region switch and no model-name field. */
export const QWEN_TTS_MODEL = 'qwen3-tts-flash-realtime'

export const QWEN_TTS_URL = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${QWEN_TTS_MODEL}`

/** 24 kHz, 16-bit, mono, little-endian PCM without a container. */
export const QWEN_SAMPLE_RATE = 24000

export const QWEN_SPEED_MIN = 0.5
export const QWEN_SPEED_MAX = 2

export const DEFAULT_QWEN_VOICE = 'Cherry'
export const DEFAULT_QWEN_SPEED = 1.5

/** 普通话与多语种. */
const STANDARD: readonly QwenVoice[] = [
  { voice: 'Cherry', name: '芊悦', gender: '女', note: '阳光亲切', group: 'standard' },
  { voice: 'Serena', name: '苏瑶', gender: '女', note: '温柔', group: 'standard' },
  { voice: 'Ethan', name: '晨煦', gender: '男', note: '阳光，略带北方口音', group: 'standard' },
  { voice: 'Chelsie', name: '千雪', gender: '女', note: '二次元', group: 'standard' },
  { voice: 'Momo', name: '茉兔', gender: '女', note: '撒娇搞怪', group: 'standard' },
  { voice: 'Vivian', name: '十三', gender: '女', note: '拽、小暴躁', group: 'standard' },
  { voice: 'Moon', name: '月白', gender: '男', note: '率性帅气', group: 'standard' },
  { voice: 'Maia', name: '四月', gender: '女', note: '知性温柔', group: 'standard' },
  { voice: 'Kai', name: '凯', gender: '男', note: '舒缓', group: 'standard' },
  { voice: 'Nofish', name: '不吃鱼', gender: '男', note: '不翘舌的设计师', group: 'standard' },
  { voice: 'Bella', name: '萌宝', gender: '女', note: '小萝莉', group: 'standard' },
  { voice: 'Jennifer', name: '詹妮弗', gender: '女', note: '美语电影质感', group: 'standard' },
  { voice: 'Ryan', name: '甜茶', gender: '男', note: '戏感强', group: 'standard' },
  { voice: 'Katerina', name: '卡捷琳娜', gender: '女', note: '御姐', group: 'standard' },
  { voice: 'Aiden', name: '艾登', gender: '男', note: '美语大男孩', group: 'standard' },
  { voice: 'Eldric Sage', name: '沧明子', gender: '男', note: '沉稳老者', group: 'standard' },
  { voice: 'Mia', name: '乖小妹', gender: '女', note: '乖巧', group: 'standard' },
  { voice: 'Mochi', name: '沙小弥', gender: '男', note: '早慧小大人', group: 'standard' },
  { voice: 'Bellona', name: '燕铮莺', gender: '女', note: '洪亮、字正腔圆', group: 'standard' },
  { voice: 'Vincent', name: '田叔', gender: '男', note: '沙哑烟嗓', group: 'standard' },
  { voice: 'Bunny', name: '萌小姬', gender: '女', note: '萌系小萝莉', group: 'standard' },
  { voice: 'Neil', name: '阿闻', gender: '男', note: '新闻主持人', group: 'standard' },
  { voice: 'Elias', name: '墨讲师', gender: '女', note: '讲课', group: 'standard' },
  { voice: 'Arthur', name: '徐大爷', gender: '男', note: '质朴、慢', group: 'standard' },
  { voice: 'Nini', name: '邻家妹妹', gender: '女', note: '软糯', group: 'standard' },
  { voice: 'Seren', name: '小婉', gender: '女', note: '助眠、舒缓', group: 'standard' },
  { voice: 'Pip', name: '顽屁小孩', gender: '男', note: '调皮童声', group: 'standard' },
  { voice: 'Stella', name: '少女阿月', gender: '女', note: '甜、少女音', group: 'standard' },
  { voice: 'Bodega', name: '博德加', gender: '男', note: '热情西班牙大叔', group: 'standard' },
  { voice: 'Sonrisa', name: '索尼莎', gender: '女', note: '开朗拉美大姐', group: 'standard' },
  { voice: 'Alek', name: '阿列克', gender: '男', note: '低沉、俄语口音', group: 'standard' },
  { voice: 'Dolce', name: '多尔切', gender: '男', note: '慵懒意大利大叔', group: 'standard' },
  { voice: 'Sohee', name: '素熙', gender: '女', note: '韩语欧尼', group: 'standard' },
  { voice: 'Ono Anna', name: '小野杏', gender: '女', note: '鬼灵精怪', group: 'standard' },
  { voice: 'Lenn', name: '莱恩', gender: '男', note: '理性德国青年', group: 'standard' },
  { voice: 'Emilien', name: '埃米尔安', gender: '男', note: '浪漫法国大哥哥', group: 'standard' },
  { voice: 'Andre', name: '安德雷', gender: '男', note: '磁性沉稳', group: 'standard' },
  { voice: 'Radio Gol', name: '拉迪奥·戈尔', gender: '男', note: '足球解说', group: 'standard' },
]

/** 方言：仍是同一个 voice 字段，没有独立的方言参数。 */
const DIALECT: readonly QwenVoice[] = [
  { voice: 'Jada', name: '上海-阿珍', gender: '女', note: '上海话', group: 'dialect' },
  { voice: 'Dylan', name: '北京-晓东', gender: '男', note: '北京话', group: 'dialect' },
  { voice: 'Li', name: '南京-老李', gender: '男', note: '南京话', group: 'dialect' },
  { voice: 'Marcus', name: '陕西-秦川', gender: '男', note: '陕西话', group: 'dialect' },
  { voice: 'Roy', name: '闽南-阿杰', gender: '男', note: '闽南语', group: 'dialect' },
  { voice: 'Peter', name: '天津-李彼得', gender: '男', note: '天津话', group: 'dialect' },
  { voice: 'Sunny', name: '四川-晴儿', gender: '女', note: '四川话', group: 'dialect' },
  { voice: 'Eric', name: '四川-程川', gender: '男', note: '四川话', group: 'dialect' },
  { voice: 'Rocky', name: '粤语-阿强', gender: '男', note: '粤语', group: 'dialect' },
  { voice: 'Kiki', name: '粤语-阿清', gender: '女', note: '粤语', group: 'dialect' },
]

export const QWEN_VOICES: readonly QwenVoice[] = [...STANDARD, ...DIALECT]

const VOICE_SET = new Set(QWEN_VOICES.map((item) => item.voice))

/** Exact, case-sensitive match: the stored value is what goes on the wire. */
export function isQwenVoice(value: unknown): value is string {
  return typeof value === 'string' && VOICE_SET.has(value)
}

/** Round to the settings step, then pull into 0.5–2.0. Non-numbers are the factory speed. */
export function clampQwenSpeed(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_QWEN_SPEED
  const rounded = Math.round(value * 10) / 10
  if (rounded < QWEN_SPEED_MIN) return QWEN_SPEED_MIN
  if (rounded > QWEN_SPEED_MAX) return QWEN_SPEED_MAX
  return rounded
}

export interface QwenVoiceView {
  readonly voice: string
  readonly label: string
  readonly group: QwenVoiceGroup
}

/** What the settings page renders: `中文名 · 性别 · 一句话特点`. */
export function qwenVoiceViews(): QwenVoiceView[] {
  return QWEN_VOICES.map((item) => ({
    voice: item.voice,
    label: `${item.name} · ${item.gender} · ${item.note}`,
    group: item.group,
  }))
}
