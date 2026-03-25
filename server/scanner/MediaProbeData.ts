import AudioMetaTags from '../objects/metadata/AudioMetaTags'

interface MediaProbeDataInput {
  embeddedCoverArt?: string | null
  format?: string | null
  duration?: number | null
  size?: number | null
  audioStream?: unknown
  videoStream?: unknown
  bitRate?: number | null
  codec?: string | null
  timeBase?: string | null
  language?: string | null
  channelLayout?: string | null
  channels?: number | null
  sampleRate?: number | null
  chapters?: unknown[]
  audioMetaTags?: Record<string, string | null | undefined> | null
  trackNumber?: number | null
  trackTotal?: number | null
  discNumber?: number | null
  discTotal?: number | null
}

interface RawProbeData {
  video_stream?: { codec?: string } | null
  format?: string | null
  duration?: number | null
  size?: number | null
  audio_stream?: {
    bit_rate?: number | null
    codec?: string | null
    time_base?: string | null
    language?: string | null
    channel_layout?: string | null
    channels?: number | null
    sample_rate?: number | null
  }
  bit_rate?: number | null
  chapters?: unknown[]
  tags?: Record<string, string | null | undefined>
}

class MediaProbeData {
  embeddedCoverArt: string | null
  format: string | null
  duration: number | null
  size: number | null

  audioStream: unknown
  videoStream: unknown

  bitRate: number | null
  codec: string | null
  timeBase: string | null
  language: string | null
  channelLayout: string | null
  channels: number | null
  sampleRate: number | null
  chapters: unknown[]

  audioMetaTags: AudioMetaTags | null

  trackNumber: number | null
  trackTotal: number | null

  discNumber: number | null
  discTotal: number | null

  constructor(probeData?: MediaProbeDataInput | null) {
    this.embeddedCoverArt = null
    this.format = null
    this.duration = null
    this.size = null

    this.audioStream = null
    this.videoStream = null

    this.bitRate = null
    this.codec = null
    this.timeBase = null
    this.language = null
    this.channelLayout = null
    this.channels = null
    this.sampleRate = null
    this.chapters = []

    this.audioMetaTags = null

    this.trackNumber = null
    this.trackTotal = null

    this.discNumber = null
    this.discTotal = null

    if (probeData) {
      this.construct(probeData)
    }
  }

  construct(probeData: MediaProbeDataInput): void {
    for (const key in probeData) {
      if (key === 'audioMetaTags' && probeData[key]) {
        this[key] = new AudioMetaTags(probeData[key])
      } else if ((this as Record<string, unknown>)[key] !== undefined) {
        (this as Record<string, unknown>)[key] = (probeData as Record<string, unknown>)[key]
      }
    }
  }

  setData(data: RawProbeData): void {
    this.embeddedCoverArt = data.video_stream?.codec || null
    this.format = data.format
    this.duration = data.duration
    this.size = data.size

    this.audioStream = data.audio_stream
    this.videoStream = this.embeddedCoverArt ? null : data.video_stream || null

    this.bitRate = data.audio_stream.bit_rate || data.bit_rate
    this.codec = data.audio_stream.codec
    this.timeBase = data.audio_stream.time_base
    this.language = data.audio_stream.language
    this.channelLayout = data.audio_stream.channel_layout
    this.channels = data.audio_stream.channels
    this.sampleRate = data.audio_stream.sample_rate
    this.chapters = data.chapters || []

    this.audioMetaTags = new AudioMetaTags()
    this.audioMetaTags.setData(data.tags)
  }
}

export = MediaProbeData
