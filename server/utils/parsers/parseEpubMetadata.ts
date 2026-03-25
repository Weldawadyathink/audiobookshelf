// @ts-nocheck
import Path from 'path'
import Logger from '../../Logger'
import StreamZip from '../../libs/nodeStreamZip'
import { parseOpfMetadataJson } from './parseOpfMetadata'
import { xmlToJSON } from '../index'

async function extractFileFromEpub(epubPath: string, filepath: string): Promise<string | undefined> {
  const zip = new StreamZip.async({ file: epubPath })
  const data = await zip.entryData(filepath).catch((error) => {
    Logger.error(`[parseEpubMetadata] Failed to extract ${filepath} from epub at "${epubPath}"`, error)
  })
  const filedata = data?.toString('utf8')
  await zip.close().catch((error) => {
    Logger.error(`[parseEpubMetadata] Failed to close zip`, error)
  })

  return filedata
}

async function extractXmlToJson(epubPath: string, xmlFilepath: string) {
  const filedata = await extractFileFromEpub(epubPath, xmlFilepath)
  if (!filedata) return null
  return xmlToJSON(filedata)
}

export async function extractCoverImage(epubPath: string, epubImageFilepath: string, outputCoverPath: string): Promise<boolean> {
  const zip = new StreamZip.async({ file: epubPath })

  const success = await zip
    .extract(epubImageFilepath, outputCoverPath)
    .then(() => true)
    .catch((error) => {
      Logger.error(`[parseEpubMetadata] Failed to extract image ${epubImageFilepath} from epub at "${epubPath}"`, error)
      return false
    })

  await zip.close().catch((error) => {
    Logger.error(`[parseEpubMetadata] Failed to close zip`, error)
  })

  return success
}

export async function parse(ebookFile: any) {
  const epubPath = ebookFile.metadata.path
  Logger.debug(`Parsing metadata from epub at "${epubPath}"`)
  const containerJson = await extractXmlToJson(epubPath, 'META-INF/container.xml')
  if (!containerJson) {
    return null
  }

  const packageDocPath = containerJson.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path']
  if (!packageDocPath) {
    Logger.error(`Failed to get package doc path in Container.xml`, JSON.stringify(containerJson, null, 2))
    return null
  }

  const packageJson = await extractXmlToJson(epubPath, packageDocPath)
  if (!packageJson) {
    return null
  }

  const opfMetadata = parseOpfMetadataJson(structuredClone(packageJson))
  if (!opfMetadata) {
    Logger.error(`Unable to parse metadata in package doc with json`, JSON.stringify(packageJson, null, 2))
    return null
  }

  const payload: any = {
    path: epubPath,
    ebookFormat: 'epub',
    metadata: opfMetadata
  }

  let packageMetadata = packageJson.package?.metadata
  if (Array.isArray(packageMetadata)) {
    packageMetadata = packageMetadata[0]
  }
  const metaCoverId = packageMetadata?.meta?.find?.((meta) => meta.$?.name === 'cover')?.$?.content

  let manifestFirstImage = null
  if (metaCoverId) {
    manifestFirstImage = packageJson.package?.manifest?.[0]?.item?.find((item) => item.$?.id === metaCoverId)
  }
  if (!manifestFirstImage) {
    manifestFirstImage = packageJson.package?.manifest?.[0]?.item?.find((item) => item.$?.['properties']?.split(' ')?.includes('cover-image'))
  }
  if (!manifestFirstImage) {
    manifestFirstImage = packageJson.package?.manifest?.[0]?.item?.find((item) => item.$?.['media-type']?.startsWith('image/'))
  }

  let coverImagePath = manifestFirstImage?.$?.href
  if (coverImagePath) {
    const packageDirname = Path.dirname(packageDocPath)
    payload.ebookCoverPath = Path.posix.join(packageDirname, coverImagePath)
  } else {
    Logger.warn(`Cover image not found in manifest for epub at "${epubPath}"`)
  }

  return payload
}
