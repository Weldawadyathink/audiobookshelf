import axios from 'axios'
import Logger from '../Logger'

class AudiobookCovers {
  readonly #responseTimeout = 10000

  /**
   * @param search Search string
   * @param timeout Request timeout in ms
   */
  async search(search: string, timeout: number = this.#responseTimeout): Promise<{ cover: string }[]> {
    if (!timeout || isNaN(timeout)) timeout = this.#responseTimeout

    const url = `https://api.audiobookcovers.com/cover/bytext/`
    const params = new URLSearchParams([['q', search]])
    const items = await axios
      .get<{ versions: { png: { original: string } } }[]>(url, { params, timeout })
      .then((res) => res?.data || [])
      .catch((error: Error) => {
        Logger.error('[AudiobookCovers] Cover search error', error.message)
        return []
      })
    return items.map((item) => ({ cover: item.versions.png.original }))
  }
}

export = AudiobookCovers
