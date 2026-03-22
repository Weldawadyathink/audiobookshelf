import axios from 'axios'
import Logger from '../Logger'
import { isNullOrNaN } from '../utils/index'
import packageJson from '../../package.json'

interface SearchTrackOptions {
  artist?: string
  isrc?: string
  title?: string
  album?: string
  limit?: number | string | null
}

class MusicBrainz {
  get userAgentString(): string {
    return `audiobookshelf/${packageJson.version} (https://audiobookshelf.org)`
  }

  searchTrack(options: SearchTrackOptions): Promise<unknown[]> {
    const luceneParts: string[] = []
    if (options.artist) luceneParts.push(`artist:${options.artist}`)
    if (options.isrc) luceneParts.push(`isrc:${options.isrc}`)
    if (options.title) luceneParts.push(`recording:${options.title}`)
    if (options.album) luceneParts.push(`release:${options.album}`)

    if (!luceneParts.length) {
      Logger.error(`[MusicBrainz] Invalid search options - must have at least one of artist, isrc, title, album`)
      return Promise.resolve([])
    }

    return axios
      .get('https://musicbrainz.org/ws/2/recording', {
        params: {
          query: luceneParts.join(' AND '),
          limit: isNullOrNaN(options.limit) ? 15 : Number(options.limit),
          fmt: 'json'
        },
        headers: { 'User-Agent': this.userAgentString } // Bug fix: was silently dropped in original (axios.get only takes 2 args)
      })
      .then((response) => (response.data as { recordings?: unknown[] }).recordings || [])
      .catch((error: unknown) => {
        Logger.error(`[MusicBrainz] search request error`, error)
        return []
      })
  }
}

export = MusicBrainz
