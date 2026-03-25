import { parseOpfMetadataXML } from '../utils/parsers/parseOpfMetadata'
import { readTextFile } from '../utils/fileUtils'

interface OpfLibraryFileObj {
  metadata: {
    path: string
  }
}

class OpfFileScanner {
  constructor() {}

  /**
   * Parse metadata from .opf file found in library scan and update bookMetadata
   */
  async scanBookOpfFile(opfLibraryFileObj: OpfLibraryFileObj, bookMetadata: Record<string, unknown>): Promise<void> {
    const xmlText = await readTextFile(opfLibraryFileObj.metadata.path)
    const opfMetadata = xmlText ? await parseOpfMetadataXML(xmlText) : null
    if (opfMetadata) {
      for (const key in opfMetadata) {
        if (key === 'tags') {
          // Add tags only if tags are empty
          if (opfMetadata.tags.length) {
            bookMetadata.tags = opfMetadata.tags
          }
        } else if (key === 'genres') {
          // Add genres only if genres are empty
          if (opfMetadata.genres.length) {
            bookMetadata.genres = opfMetadata.genres
          }
        } else if (key === 'authors') {
          if (opfMetadata.authors?.length) {
            bookMetadata.authors = opfMetadata.authors
          }
        } else if (key === 'narrators') {
          if (opfMetadata.narrators?.length) {
            bookMetadata.narrators = opfMetadata.narrators
          }
        } else if (key === 'series') {
          if (opfMetadata.series?.length) {
            bookMetadata.series = opfMetadata.series
          }
        } else if (opfMetadata[key] && key !== 'sequence') {
          bookMetadata[key] = opfMetadata[key]
        }
      }
    }
  }
}

export = new OpfFileScanner()
