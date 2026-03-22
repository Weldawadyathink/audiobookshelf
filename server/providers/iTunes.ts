import axios from 'axios'
import Logger from '../Logger'
import htmlSanitizer = require('../utils/htmlSanitizer')

interface iTunesSearchParams {
  term: string
  country?: string
  media?: string
  entity?: string
  lang?: string
  limit?: number
}

interface ArtworkData {
  artworkUrl600?: string
  [key: string]: unknown
}

interface iTunesRawResult extends ArtworkData {
  collectionId?: string | number
  artistId?: string | number
  artistName?: string
  collectionName?: string
  description?: string
  releaseDate?: string
  primaryGenreName?: string
  genres?: string[]
  trackCount?: number
  feedUrl?: string
  collectionViewUrl?: string
  trackExplicitness?: string
}

interface AudiobookResult {
  id: string | number | undefined
  artistId: string | number | undefined
  title: string | undefined
  author: string
  description: string | null
  publishedYear: string | null
  genres: string[] | null
  cover: string | null
}

interface iTunesPodcastSearchResult {
  id: string | number | undefined
  artistId: string | number | null
  title: string | undefined
  artistName: string | undefined
  description: string
  descriptionPlain: string
  releaseDate: string | undefined
  genres: string[]
  cover: string | null
  trackCount: number | undefined
  feedUrl: string | undefined
  pageUrl: string | undefined
  explicit: boolean
}

class iTunes {
  readonly #responseTimeout = 10000

  constructor() {}

  /**
   * @see https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html
   *
   * @param options
   * @param timeout response timeout in ms
   */
  search(options: iTunesSearchParams, timeout: number = this.#responseTimeout): Promise<iTunesRawResult[]> {
    if (!options.term) {
      Logger.error('[iTunes] Invalid search options - no term')
      return Promise.resolve([])
    }
    if (!timeout || isNaN(timeout)) timeout = this.#responseTimeout

    const query = {
      term: options.term,
      media: options.media,
      entity: options.entity,
      lang: options.lang,
      limit: options.limit,
      country: options.country
    }
    return axios
      .get<{ results?: iTunesRawResult[] }>('https://itunes.apple.com/search', {
        params: query,
        timeout
      })
      .then((response) => {
        return response.data.results || []
      })
      .catch((error: Error) => {
        Logger.error(`[iTunes] search request error`, error.message)
        return []
      })
  }

  // Example cover art: https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/cb/ea/73/cbea739b-ff3b-11c4-fb93-7889fbec7390/9781598874983_cover.jpg/100x100bb.jpg
  // 100x100bb can be replaced by other values https://github.com/bendodson/itunes-artwork-finder
  // Target size 600 or larger
  getCoverArtwork(data: ArtworkData): string | null {
    if (data.artworkUrl600) {
      return data.artworkUrl600
    }
    // Should already be sorted from small to large
    const artworkSizes = Object.keys(data)
      .filter((key) => key.startsWith('artworkUrl'))
      .map((key) => {
        return {
          url: data[key] as string,
          size: Number(key.replace('artworkUrl', ''))
        }
      })
    if (!artworkSizes.length) return null

    // Return next biggest size > 600
    const nextBestSize = artworkSizes.find((size) => size.size > 600)
    if (nextBestSize) return nextBestSize.url

    // Find square artwork
    const squareArtwork = artworkSizes.find((size) => size.url.includes(`${size.size}x${size.size}bb`))

    // Square cover replace with 600x600bb
    if (squareArtwork) {
      return squareArtwork.url.replace(`${squareArtwork.size}x${squareArtwork.size}bb`, '600x600bb')
    }

    // Last resort just return biggest size
    return artworkSizes[artworkSizes.length - 1].url
  }

  cleanAudiobook(data: iTunesRawResult): AudiobookResult {
    // artistName can be "Name1, Name2 & Name3" so we refactor this to "Name1, Name2, Name3"
    //  see: https://github.com/advplyr/audiobookshelf/issues/1022
    const author = (data.artistName || '').split(' & ').join(', ')

    return {
      id: data.collectionId,
      artistId: data.artistId,
      title: data.collectionName,
      author,
      description: data.description || null,
      publishedYear: data.releaseDate ? data.releaseDate.split('-')[0] : null,
      genres: data.primaryGenreName ? [data.primaryGenreName] : null,
      cover: this.getCoverArtwork(data)
    }
  }

  cleanPodcast(data: iTunesRawResult): iTunesPodcastSearchResult {
    return {
      id: data.collectionId,
      artistId: data.artistId || null,
      title: data.collectionName,
      artistName: data.artistName,
      description: htmlSanitizer.sanitize(data.description || ''),
      descriptionPlain: htmlSanitizer.stripAllTags(data.description || ''),
      releaseDate: data.releaseDate,
      genres: data.genres || [],
      cover: this.getCoverArtwork(data),
      trackCount: data.trackCount,
      feedUrl: data.feedUrl,
      pageUrl: data.collectionViewUrl,
      explicit: data.trackExplicitness === 'explicit'
    }
  }

  /**
   * @param term
   * @param timeout response timeout in ms
   */
  searchAudiobooks(term: string, timeout: number = this.#responseTimeout): Promise<AudiobookResult[]> {
    return this.search({ term, entity: 'audiobook', media: 'audiobook' }, timeout).then((results) => {
      return results.map(this.cleanAudiobook.bind(this))
    })
  }

  /**
   * @param term
   * @param options
   * @param timeout response timeout in ms
   */
  searchPodcasts(term: string, options: Partial<iTunesSearchParams> = {}, timeout: number = this.#responseTimeout): Promise<iTunesPodcastSearchResult[]> {
    return this.search({ term, entity: 'podcast', media: 'podcast', ...options }, timeout).then((results) => {
      return results.map(this.cleanPodcast.bind(this))
    })
  }
}

export = iTunes
