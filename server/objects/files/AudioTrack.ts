import FileMetadata from '../metadata/FileMetadata'

interface AudioFileData {
  index: number
  duration: number
  metadata: FileMetadata
  ino: string
  mimeType: string
  codec?: string | null
}

class AudioTrack {
  index: number | null
  startOffset: number | null
  duration: number | null
  title: string | null
  contentUrl: string | null
  mimeType: string | null
  codec: string | null
  metadata: FileMetadata | null

  constructor() {
    this.index = null
    this.startOffset = null
    this.duration = null
    this.title = null
    this.contentUrl = null
    this.mimeType = null
    this.codec = null
    this.metadata = null
  }

  toJSON() {
    return {
      index: this.index,
      startOffset: this.startOffset,
      duration: this.duration,
      title: this.title,
      contentUrl: this.contentUrl,
      mimeType: this.mimeType,
      codec: this.codec,
      metadata: this.metadata?.toJSON() || null
    }
  }

  setData(itemId: string, audioFile: AudioFileData, startOffset: number): void {
    this.index = audioFile.index
    this.startOffset = startOffset
    this.duration = audioFile.duration
    this.title = audioFile.metadata.filename || ''

    this.contentUrl = `/api/items/${itemId}/file/${audioFile.ino}`
    this.mimeType = audioFile.mimeType
    this.codec = audioFile.codec || null
    this.metadata = audioFile.metadata.clone()
  }

  setFromStream(title: string, duration: number, contentUrl: string): void {
    this.index = 1
    this.startOffset = 0
    this.duration = duration
    this.title = title
    this.contentUrl = contentUrl
    this.mimeType = 'application/vnd.apple.mpegurl'
  }
}

export = AudioTrack
