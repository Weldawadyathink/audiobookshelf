// @ts-nocheck
import Path from 'path'
import { filePathToPOSIX } from './fileUtils'
import globals from './globals'
import LibraryFile from '../objects/files/LibraryFile'
import parseNameString from './parsers/parseNameString'

function isMediaFile(mediaType: string, ext: string, audiobooksOnly = false): boolean {
  if (!ext) return false
  const extclean = ext.slice(1).toLowerCase()
  if (mediaType === 'podcast') return globals.SupportedAudioTypes.includes(extclean)
  else if (audiobooksOnly) return globals.SupportedAudioTypes.includes(extclean)
  return globals.SupportedAudioTypes.includes(extclean) || globals.SupportedEbookTypes.includes(extclean)
}

function isScannableNonMediaFile(ext: string): boolean {
  if (!ext) return false
  const extclean = ext.slice(1).toLowerCase()
  return globals.TextFileTypes.includes(extclean) || globals.MetadataFileTypes.includes(extclean) || globals.SupportedImageTypes.includes(extclean)
}

export function checkFilepathIsAudioFile(filepath: string): boolean {
  const ext = Path.extname(filepath)
  if (!ext) return false
  const extclean = ext.slice(1).toLowerCase()
  return globals.SupportedAudioTypes.includes(extclean)
}

export function groupFileItemsIntoLibraryItemDirs(mediaType: string, fileItems: any[], audiobooksOnly: boolean, includeNonMediaFiles = false): Record<string, string[]> {
  const itemsFiltered = fileItems.filter((i) => {
    return i.deep > 0 || (mediaType === 'book' && isMediaFile(mediaType, i.extension, audiobooksOnly))
  })

  const mediaFileItems: any[] = []
  const otherFileItems: any[] = []
  itemsFiltered.forEach((item) => {
    if (isMediaFile(mediaType, item.extension, audiobooksOnly) || (includeNonMediaFiles && isScannableNonMediaFile(item.extension))) {
      mediaFileItems.push(item)
    } else {
      otherFileItems.push(item)
    }
  })

  const libraryItemGroup: Record<string, any> = {}
  mediaFileItems.forEach((item) => {
    const dirparts = item.reldirpath.split('/').filter((p) => !!p)
    const numparts = dirparts.length
    let _path = ''

    if (!dirparts.length) {
      libraryItemGroup[item.name] = item.name
    } else {
      for (let i = 0; i < numparts; i++) {
        const dirpart = dirparts.shift()
        _path = Path.posix.join(_path, dirpart)

        if (libraryItemGroup[_path]) {
          const relpath = Path.posix.join(dirparts.join('/'), item.name)
          libraryItemGroup[_path].push(relpath)
          return
        } else if (!dirparts.length) {
          libraryItemGroup[_path] = [item.name]
          return
        } else if (dirparts.length === 1 && /^(cd|dis[ck])\s*\d{1,3}$/i.test(dirparts[0])) {
          libraryItemGroup[_path] = [Path.posix.join(dirparts[0], item.name)]
          return
        }
      }
    }
  })

  otherFileItems.forEach((item) => {
    const dirparts = item.reldirpath.split('/')
    const numparts = dirparts.length
    let _path = ''

    for (let i = 0; i < numparts; i++) {
      const dirpart = dirparts.shift()
      _path = Path.posix.join(_path, dirpart)
      if (libraryItemGroup[_path]) {
        const relpath = Path.posix.join(dirparts.join('/'), item.name)
        libraryItemGroup[_path].push(relpath)
        return
      }
    }
  })
  return libraryItemGroup
}

export function buildLibraryFile(libraryItemPath: string, files: string[]): Promise<LibraryFile[]> {
  return Promise.all(
    files.map(async (file) => {
      const filePath = Path.posix.join(libraryItemPath, file)
      const newLibraryFile = new LibraryFile()
      await newLibraryFile.setDataFromPath(filePath, file)
      return newLibraryFile
    })
  )
}

function getNarrator(folder: string): [string, string | null] {
  let pattern = /^(?<title>.*) \{(?<narrators>.*)\}$/
  let match = folder.match(pattern)
  return match ? [match.groups.title, match.groups.narrators] : [folder, null]
}

function getSequence(folder: string): [string, string | null] {
  let pattern = /^(?<volumeLabel>vol\.? |volume |book )?(?<sequence>\d{0,3}(?:\.\d{1,2})?)(?<trailingDot>\.?)(?: (?<suffix>.*))?$/i

  let volumeNumber = null
  let parts = folder.split(' - ')
  for (let i = 0; i < parts.length; i++) {
    let match = parts[i].match(pattern)
    if (match && !(match.groups.suffix && !(match.groups.volumeLabel || match.groups.trailingDot))) {
      volumeNumber = isNaN(match.groups.sequence) ? match.groups.sequence : Number(match.groups.sequence).toString()
      parts[i] = match.groups.suffix
      if (!parts[i]) {
        parts.splice(i, 1)
      }
      break
    }
  }

  folder = parts.join(' - ')
  return [folder, volumeNumber]
}

function getPublishedYear(folder: string): [string, string | null] {
  var publishedYear = null

  const pattern = /^ *\(?([0-9]{4})\)? * - *(.+)/
  var match = folder.match(pattern)
  if (match) {
    publishedYear = match[1]
    folder = match[2]
  }

  return [folder, publishedYear]
}

function getSubtitle(folder: string): [string, string] {
  var splitTitle = folder.split(' - ')
  return [splitTitle.shift(), splitTitle.join(' - ')]
}

function getASIN(folder: string): [string, string | null] {
  let asin = null

  let pattern = /(?: |^)\[([A-Z0-9]{10})](?= |$)/
  const match = folder.match(pattern)
  if (match) {
    asin = match[1]
    folder = folder.replace(match[0], '')
  }
  return [folder.trim(), asin]
}

export function getBookDataFromDir(relPath: string, parseSubtitle = false): any {
  const splitDir = relPath.split('/')

  var folder = splitDir.pop()
  var series = splitDir.length > 1 ? splitDir.pop() : null
  var author = splitDir.length > 0 ? splitDir.pop() : null

  var [folder2, asin] = getASIN(folder)
  var [folder3, narrators] = getNarrator(folder2)
  var [folder4, sequence] = series ? getSequence(folder3) : [folder3, null]
  var [folder5, publishedYear] = getPublishedYear(folder4)
  var [title, subtitle] = parseSubtitle ? getSubtitle(folder5) : [folder5, null]

  return {
    title,
    subtitle,
    asin,
    authors: parseNameString.parse(author)?.names || [],
    narrators: parseNameString.parse(narrators)?.names || [],
    seriesName: series,
    seriesSequence: sequence,
    publishedYear
  }
}

function getPodcastDataFromDir(relPath: string): any {
  const splitDir = relPath.split('/')
  const title = splitDir.pop()
  return { title }
}

export function getDataFromMediaDir(libraryMediaType: string, folderPath: string, relPath: string): any {
  relPath = filePathToPOSIX(relPath)
  let fullPath = Path.posix.join(folderPath, relPath)
  let mediaMetadata = null

  if (libraryMediaType === 'podcast') {
    mediaMetadata = getPodcastDataFromDir(relPath)
  } else {
    mediaMetadata = getBookDataFromDir(relPath, !!(global.ServerSettings as any)?.scannerParseSubtitle)
  }

  return {
    mediaMetadata,
    relPath,
    path: fullPath
  }
}
