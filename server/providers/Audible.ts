import axios from 'axios'
import Logger from '../Logger'
import { isValidASIN } from '../utils/index'

class Audible {
  readonly #responseTimeout = 10000
  regionMap: Record<string, string>

  constructor() {
    this.regionMap = {
      us: '.com',
      ca: '.ca',
      uk: '.co.uk',
      au: '.com.au',
      fr: '.fr',
      de: '.de',
      jp: '.co.jp',
      it: '.it',
      in: '.in',
      es: '.es'
    }
  }

  cleanSeriesSequence(seriesName: string, sequence: string): string {
    if (!sequence) return ''
    let numberFound = sequence.match(/\.\d+|\d+(?:\.\d+)?/)
    let updatedSequence = numberFound ? numberFound[0] : sequence
    if (sequence !== updatedSequence) {
      Logger.debug(`[Audible] Series "${seriesName}" sequence was cleaned from "${sequence}" to "${updatedSequence}"`)
    }
    return updatedSequence
  }

  cleanResult(item: any): Record<string, unknown> {
    const { title, subtitle, asin, authors, narrators, publisherName, summary, releaseDate, image, genres, seriesPrimary, seriesSecondary, language, runtimeLengthMin, formatType, isbn } = item

    const series = []
    if (seriesPrimary) {
      series.push({
        series: seriesPrimary.name,
        sequence: this.cleanSeriesSequence(seriesPrimary.name, seriesPrimary.position || '')
      })
    }
    if (seriesSecondary) {
      series.push({
        series: seriesSecondary.name,
        sequence: this.cleanSeriesSequence(seriesSecondary.name, seriesSecondary.position || '')
      })
    }

    let genresCleaned: string[] = []
    let tagsCleaned: string[] = []

    if (genres && Array.isArray(genres)) {
      genresCleaned = [...new Set(genres.filter((g) => g.type == 'genre').map((g) => g.name))]
      tagsCleaned = [...new Set(genres.filter((g) => g.type == 'tag').map((g) => g.name))]
    }

    return {
      title,
      subtitle: subtitle || null,
      author: authors ? authors.map(({ name }: { name: string }) => name).join(', ') : null,
      narrator: narrators ? narrators.map(({ name }: { name: string }) => name).join(', ') : null,
      publisher: publisherName,
      publishedYear: releaseDate ? releaseDate.split('-')[0] : null,
      description: summary || null,
      cover: image,
      asin,
      isbn,
      genres: genresCleaned.length ? genresCleaned : null,
      tags: tagsCleaned.length ? tagsCleaned : null,
      series: series.length ? series : null,
      language: language ? language.charAt(0).toUpperCase() + language.slice(1) : null,
      duration: runtimeLengthMin && !isNaN(runtimeLengthMin) ? Number(runtimeLengthMin) : 0,
      region: item.region || null,
      rating: item.rating || null,
      abridged: formatType === 'abridged'
    }
  }

  asinSearch(asin: string, region: string, timeout: number = this.#responseTimeout): Promise<any> | null {
    if (!asin) return null
    if (!timeout || isNaN(timeout)) timeout = this.#responseTimeout

    asin = encodeURIComponent(asin.toUpperCase())
    var regionQuery = region ? `?region=${region}` : ''
    var url = `https://api.audnex.us/books/${asin}${regionQuery}`
    Logger.debug(`[Audible] ASIN url: ${url}`)
    return axios
      .get(url, { timeout })
      .then((res) => {
        if (!res?.data?.asin) return null
        return res.data
      })
      .catch((error: Error) => {
        Logger.error('[Audible] ASIN search error', error.message)
        return null
      })
  }

  async search(title: string, author: string, asin: string, region: string, timeout: number = this.#responseTimeout): Promise<Record<string, unknown>[]> {
    if (region && !this.regionMap[region]) {
      Logger.error(`[Audible] search: Invalid region ${region}`)
      region = ''
    }
    if (!timeout || isNaN(timeout)) timeout = this.#responseTimeout

    let items: any[] = []
    if (asin && isValidASIN(asin.toUpperCase())) {
      const item = await this.asinSearch(asin, region, timeout)
      if (item) items.push(item)
    }

    if (!items.length && isValidASIN(title.toUpperCase())) {
      const item = await this.asinSearch(title, region, timeout)
      if (item) items.push(item)
    }

    if (!items.length) {
      const queryObj: Record<string, string> = {
        num_results: '10',
        products_sort_by: 'Relevance',
        title: title
      }
      if (author) queryObj.author = author
      const queryString = new URLSearchParams(queryObj).toString()
      const tld = region ? this.regionMap[region] : '.com'
      const url = `https://api.audible${tld}/1.0/catalog/products?${queryString}`
      Logger.debug(`[Audible] Search url: ${url}`)
      items = await axios
        .get(url, { timeout })
        .then((res) => {
          if (!res?.data?.products) return null
          return Promise.all(res.data.products.map((result: any) => this.asinSearch(result.asin, region, timeout)))
        })
        .catch((error: Error) => {
          Logger.error('[Audible] query search error', error.message)
          return []
        })
    }
    return items.filter(Boolean).map((item) => this.cleanResult(item)) || []
  }
}

export = Audible
