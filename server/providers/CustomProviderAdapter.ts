import axios from 'axios'
import Logger from '../Logger'
import { sanitize } from '../utils/htmlSanitizer'

const Database = require('../Database')

interface SeriesResult {
  series: string
  sequence?: string
}

interface SearchResult {
  title?: unknown
  subtitle?: unknown
  author?: unknown
  narrator?: unknown
  publisher?: unknown
  publishedYear?: unknown
  description?: unknown
  cover?: unknown
  isbn?: unknown
  asin?: unknown
  genres?: unknown
  tags?: unknown
  series?: unknown
  language?: unknown
  duration?: unknown
  [key: string]: unknown
}

class CustomProviderAdapter {
  readonly #responseTimeout = 10000

  constructor() {}

  /**
   * @param timeout response timeout in ms
   */
  async search(title: string, author: string, isbn: string, providerSlug: string, mediaType: string, timeout: number = this.#responseTimeout): Promise<Record<string, unknown>[]> {
    if (!timeout || isNaN(timeout)) timeout = this.#responseTimeout

    const providerId = providerSlug.split('custom-')[1]
    const provider = await Database.customMetadataProviderModel.findByPk(providerId)

    if (!provider) {
      throw new Error('Custom provider not found for the given id')
    }

    // Setup query params
    const queryObj: Record<string, string> = {
      mediaType,
      query: title
    }
    if (author) {
      queryObj.author = author
    }
    if (isbn) {
      queryObj.isbn = isbn
    }
    const queryString = new URLSearchParams(queryObj).toString()

    const url = `${provider.url}/search?${queryString}`
    Logger.debug(`[CustomMetadataProvider] Search url: ${url}`)

    // Setup headers
    const axiosOptions: Record<string, unknown> = {
      timeout
    }
    if (provider.authHeaderValue) {
      axiosOptions.headers = {
        Authorization: provider.authHeaderValue
      }
    }

    const matches = await axios
      .get(url, axiosOptions)
      .then((res) => {
        if (!res?.data || !Array.isArray(res.data.matches)) return null
        return res.data.matches as SearchResult[]
      })
      .catch((error: Error) => {
        Logger.error('[CustomMetadataProvider] Search error', error.message)
        return [] as SearchResult[]
      })

    if (!matches) {
      throw new Error('Custom provider returned malformed response')
    }

    const toStringOrUndefined = (value: unknown): string | undefined => {
      if (typeof value === 'string' || typeof value === 'number') return String(value)
      if (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number')) return value.join(',')
      return undefined
    }
    const validateSeriesArray = (series: unknown): SeriesResult[] | undefined => {
      if (!Array.isArray(series) || !series.length) return undefined
      return series
        .map((s: unknown) => {
          if (!s || typeof (s as Record<string, unknown>).series !== 'string') return undefined
          const sObj = s as Record<string, unknown>
          const _series: SeriesResult = {
            series: sObj.series as string
          }
          if (sObj.sequence && (typeof sObj.sequence === 'string' || typeof sObj.sequence === 'number')) {
            _series.sequence = String(sObj.sequence)
          }
          return _series
        })
        .filter((s): s is SeriesResult => s !== undefined)
    }
    /**
     * Validates and dedupes tags/genres array
     * Can be comma separated string or array of strings
     */
    const validateTagsGenresArray = (tagsGenres: unknown): string[] | undefined => {
      if (!tagsGenres || (typeof tagsGenres !== 'string' && !Array.isArray(tagsGenres))) return undefined

      let arr: string[]
      // If string, split by comma and trim each item
      if (typeof tagsGenres === 'string') arr = tagsGenres.split(',')
      // If array, ensure all items are strings
      else if (!tagsGenres.every((t) => typeof t === 'string')) return undefined
      else arr = tagsGenres as string[]

      // Trim and filter out empty strings
      arr = arr.map((t) => t.trim()).filter(Boolean)
      if (!arr.length) return undefined

      // Dedup
      return [...new Set(arr)]
    }

    // re-map keys to throw out
    return matches.map((match) => {
      const { title, subtitle, author, narrator, publisher, publishedYear, description, cover, isbn, asin, genres, tags, series, language, duration } = match

      const payload: Record<string, unknown> = {
        title: toStringOrUndefined(title),
        subtitle: toStringOrUndefined(subtitle),
        author: toStringOrUndefined(author),
        narrator: toStringOrUndefined(narrator),
        publisher: toStringOrUndefined(publisher),
        publishedYear: toStringOrUndefined(publishedYear),
        description: description && typeof description === 'string' ? sanitize(description) : undefined,
        cover: toStringOrUndefined(cover),
        isbn: toStringOrUndefined(isbn),
        asin: toStringOrUndefined(asin),
        genres: validateTagsGenresArray(genres),
        tags: validateTagsGenresArray(tags),
        series: validateSeriesArray(series),
        language: toStringOrUndefined(language),
        duration: !isNaN(duration as number) && duration !== null ? Number(duration) : undefined
      }

      // Remove undefined values
      for (const key in payload) {
        if (payload[key] === undefined) {
          delete payload[key]
        }
      }

      return payload
    })
  }
}

export = CustomProviderAdapter
