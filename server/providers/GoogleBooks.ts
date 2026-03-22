import axios from 'axios'
import Logger from '../Logger'

interface IndustryIdentifier {
  type: string
  identifier: string
}

interface VolumeInfo {
  title: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publisherDate?: string
  description?: string
  industryIdentifiers?: IndustryIdentifier[]
  categories?: string[]
  imageLinks?: Record<string, string>
}

interface VolumeItem {
  id: string
  volumeInfo?: VolumeInfo
}

interface GoogleBooksResponse {
  items?: VolumeItem[]
}

interface SearchResult {
  id: string
  title: string
  subtitle: string | null
  author: string | null
  publisher: string | undefined
  publishedYear: string | null
  description: string | undefined
  cover: string | null
  genres: string[] | null
  isbn: string | null
}

class GoogleBooks {
  readonly #responseTimeout = 10000

  constructor() {}

  extractIsbn(industryIdentifiers: IndustryIdentifier[] | null | undefined): string | null {
    if (!industryIdentifiers || !industryIdentifiers.length) return null

    const isbnObj = industryIdentifiers.find((i) => i.type === 'ISBN_13') || industryIdentifiers.find((i) => i.type === 'ISBN_10')
    if (isbnObj && isbnObj.identifier) return isbnObj.identifier
    return null
  }

  cleanResult(item: VolumeItem): SearchResult | null {
    const { id, volumeInfo } = item
    if (!volumeInfo) return null
    const { title, subtitle, authors, publisher, publisherDate, description, industryIdentifiers, categories, imageLinks } = volumeInfo

    let cover: string | null = null
    // Selects the largest cover assuming the largest is the last key in the object
    if (imageLinks && Object.keys(imageLinks).length) {
      cover = imageLinks[Object.keys(imageLinks).pop()!] ?? null
      cover = cover?.replace(/^http:/, 'https:') || null
    }

    return {
      id,
      title,
      subtitle: subtitle || null,
      author: authors ? authors.join(', ') : null,
      publisher,
      publishedYear: publisherDate ? publisherDate.split('-')[0] : null,
      description,
      cover,
      genres: categories && Array.isArray(categories) ? [...categories] : null,
      isbn: this.extractIsbn(industryIdentifiers)
    }
  }

  /**
   * Search for a book by title and author
   * @param title
   * @param author
   * @param timeout response timeout in ms
   */
  async search(title: string, author: string | null | undefined, timeout: number = this.#responseTimeout): Promise<(SearchResult | null)[]> {
    if (!timeout || isNaN(timeout)) timeout = this.#responseTimeout

    const encodedTitle = encodeURIComponent(title)
    let queryString = `q=intitle:${encodedTitle}`
    if (author) {
      queryString += `+inauthor:${encodeURIComponent(author)}`
    }
    const url = `https://www.googleapis.com/books/v1/volumes?${queryString}`
    Logger.debug(`[GoogleBooks] Search url: ${url}`)
    const items = await axios
      .get<GoogleBooksResponse>(url, { timeout })
      .then((res) => {
        if (!res || !res.data || !res.data.items) return []
        return res.data.items
      })
      .catch((error: Error) => {
        Logger.error('[GoogleBooks] Volume search error', error.message)
        return []
      })
    return items.map((item) => this.cleanResult(item))
  }
}

export = GoogleBooks
