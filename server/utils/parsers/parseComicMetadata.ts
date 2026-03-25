// @ts-nocheck
import Path from 'path'
import Logger from '../../Logger'
import parseComicInfoMetadata from './parseComicInfoMetadata'
import globals from '../globals'
import { xmlToJSON } from '../index'
import { createComicBookExtractor } from '../comicBookExtractors'

export async function extractCoverImage(comicPath: string, comicImageFilepath: string, outputCoverPath: string): Promise<boolean> {
  let archive = null
  try {
    archive = createComicBookExtractor(comicPath)
    await archive.open()
    return await archive.extractToFile(comicImageFilepath, outputCoverPath)
  } catch (error) {
    Logger.error(`[parseComicMetadata] Failed to extract image "${comicImageFilepath}" from comicPath "${comicPath}" into "${outputCoverPath}"`, error)
    return false
  } finally {
    archive?.close()
  }
}

export async function parse(ebookFile: any) {
  const comicPath = ebookFile.metadata.path
  Logger.debug(`[parseComicMetadata] Parsing comic metadata at "${comicPath}"`)
  let archive = null
  try {
    archive = createComicBookExtractor(comicPath)
    await archive.open()

    const filePaths = await archive.getFilePaths().catch((error) => {
      Logger.error(`[parseComicMetadata] Failed to get file paths from comic at "${comicPath}"`, error)
    })

    filePaths.sort((a, b) => {
      return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    })

    let metadata = null
    const comicInfoPath = filePaths.find((filePath) => filePath === 'ComicInfo.xml')
    if (comicInfoPath) {
      const comicInfoData = await archive.extractToBuffer(comicInfoPath)
      if (comicInfoData) {
        const comicInfoStr = new TextDecoder().decode(comicInfoData)
        const comicInfoJson = await xmlToJSON(comicInfoStr)
        if (comicInfoJson) {
          metadata = parseComicInfoMetadata.parse(comicInfoJson)
        }
      }
    }

    const payload: any = {
      path: comicPath,
      ebookFormat: ebookFile.ebookFormat,
      metadata
    }

    const firstImagePath = filePaths.find((filePath) => globals.SupportedImageTypes.includes(Path.extname(filePath).toLowerCase().slice(1)))
    if (firstImagePath) {
      payload.ebookCoverPath = firstImagePath
    } else {
      Logger.warn(`[parseComicMetadata] Cover image not found in comic at "${comicPath}"`)
    }

    return payload
  } catch (error) {
    Logger.error(`[parseComicMetadata] Failed to parse comic metadata at "${comicPath}"`, error)
    return null
  } finally {
    archive?.close()
  }
}
