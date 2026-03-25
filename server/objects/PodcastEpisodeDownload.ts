import Path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { sanitizeFilename, filePathToPOSIX } from '../utils/fileUtils'
import globals from '../utils/globals'

interface RssPodcastEpisodeEnclosure {
  url: string
  type?: string
}

interface RssPodcastEpisode {
  title?: string | null
  enclosure: RssPodcastEpisodeEnclosure
  season?: string | null
  episode?: string | null
  episodeType?: string | null
  publishedAt?: number | null
  guid?: string | null
}

interface LibraryItemData {
  id: string
  path: string
  media?: {
    title?: string | null
    explicit?: boolean
  }
}

class PodcastEpisodeDownload {
  id: string | null
  rssPodcastEpisode: RssPodcastEpisode | null
  url: string | null
  libraryItem: LibraryItemData | null
  libraryId: string | null
  isAutoDownload: boolean
  isFinished: boolean
  failed: boolean
  appendRandomId: boolean
  targetFilename: string | null
  startedAt: number | null
  createdAt: number | null
  finishedAt: number | null

  constructor() {
    this.id = null
    this.rssPodcastEpisode = null
    this.url = null
    this.libraryItem = null
    this.libraryId = null
    this.isAutoDownload = false
    this.isFinished = false
    this.failed = false
    this.appendRandomId = false
    this.targetFilename = null
    this.startedAt = null
    this.createdAt = null
    this.finishedAt = null
  }

  toJSONForClient() {
    return {
      id: this.id,
      episodeDisplayTitle: this.rssPodcastEpisode?.title ?? null,
      url: this.url,
      libraryItemId: this.libraryItemId,
      libraryId: this.libraryId || null,
      isFinished: this.isFinished,
      failed: this.failed,
      appendRandomId: this.appendRandomId,
      startedAt: this.startedAt,
      createdAt: this.createdAt,
      finishedAt: this.finishedAt,
      podcastTitle: this.libraryItem?.media?.title ?? null,
      podcastExplicit: !!this.libraryItem?.media?.explicit,
      season: this.rssPodcastEpisode?.season ?? null,
      episode: this.rssPodcastEpisode?.episode ?? null,
      episodeType: this.rssPodcastEpisode?.episodeType ?? 'full',
      publishedAt: this.rssPodcastEpisode?.publishedAt ?? null,
      guid: this.rssPodcastEpisode?.guid ?? null
    }
  }

  get urlFileExtension(): string {
    const cleanUrl = this.url.split('?')[0] // Remove query string
    return Path.extname(cleanUrl).substring(1).toLowerCase()
  }
  get fileExtension(): string {
    const extname = this.urlFileExtension
    if (globals.SupportedAudioTypes.includes(extname)) return extname
    return 'mp3'
  }
  get enclosureType(): string | null {
    const enclosureType = this.rssPodcastEpisode.enclosure.type
    return typeof enclosureType === 'string' ? enclosureType : null
  }
  get episodeTitle(): string | null {
    return this.rssPodcastEpisode.title
  }
  get targetPath(): string {
    return filePathToPOSIX(Path.join(this.libraryItem.path, this.targetFilename))
  }
  get targetRelPath(): string {
    return this.targetFilename
  }
  get libraryItemId(): string | null {
    return this.libraryItem?.id || null
  }
  get pubYear(): number | null {
    if (!this.rssPodcastEpisode.publishedAt) return null
    return new Date(this.rssPodcastEpisode.publishedAt).getFullYear()
  }

  getSanitizedFilename(title: string): string {
    const appendage = this.appendRandomId ? ` (${this.id})` : ''
    const filename = `${title.trim()}${appendage}.${this.fileExtension}`
    return sanitizeFilename(filename)
  }

  setAppendRandomId(appendRandomId: boolean): void {
    this.appendRandomId = appendRandomId
    this.targetFilename = this.getSanitizedFilename(this.rssPodcastEpisode.title || '')
  }

  setData(rssPodcastEpisode: RssPodcastEpisode, libraryItem: LibraryItemData, isAutoDownload: boolean, libraryId: string): void {
    this.id = uuidv4()
    this.rssPodcastEpisode = rssPodcastEpisode

    const url = rssPodcastEpisode.enclosure.url
    if (decodeURIComponent(url) !== url) {
      // Already encoded
      this.url = url
    } else {
      this.url = encodeURI(url)
    }

    this.targetFilename = this.getSanitizedFilename(this.rssPodcastEpisode.title || '')

    this.libraryItem = libraryItem
    this.isAutoDownload = isAutoDownload
    this.createdAt = Date.now()
    this.libraryId = libraryId
  }

  setFinished(success: boolean): void {
    this.finishedAt = Date.now()
    this.isFinished = true
    this.failed = !success
  }
}

export = PodcastEpisodeDownload
