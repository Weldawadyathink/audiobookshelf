// @ts-nocheck
import axios from 'axios'
import Path from 'path'
import ssrfFilter from 'ssrf-req-filter'
import { exec } from 'child_process'
import fs from '../libs/fsExtra'
import rra from '../libs/recursiveReaddirAsync'
import Logger from '../Logger'
import { AudioMimeType } from './constants'

export const filePathToPOSIX = (path: string): string => {
  if (!global.isWin || !path) return path
  return path.startsWith('\\\\') ? '\\\\' + path.slice(2).replace(/\\/g, '/') : path.replace(/\\/g, '/')
}

export function isSameOrSubPath(parentPath: string, childPath: string): boolean {
  parentPath = filePathToPOSIX(parentPath)
  childPath = filePathToPOSIX(childPath)
  if (parentPath === childPath) return true
  const relativePath = Path.relative(parentPath, childPath)
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !Path.isAbsolute(relativePath))
  )
}

function getFileStat(path: string) {
  try {
    return fs.stat(path)
  } catch (err) {
    Logger.error('[fileUtils] Failed to stat', err)
    return null
  }
}

export async function getFileTimestampsWithIno(path: string): Promise<{ size: number; mtimeMs: number; ctimeMs: number; birthtimeMs: number; ino: string } | false> {
  try {
    var stat = await fs.stat(path, { bigint: true })
    return {
      size: Number(stat.size),
      mtimeMs: Number(stat.mtimeMs),
      ctimeMs: Number(stat.ctimeMs),
      birthtimeMs: Number(stat.birthtimeMs),
      ino: String(stat.ino)
    }
  } catch (err) {
    Logger.error(`[fileUtils] Failed to getFileTimestampsWithIno for path "${path}"`, err)
    return false
  }
}

export const getFileSize = async (path: string): Promise<number> => {
  return (await getFileStat(path))?.size || 0
}

export const getFileMTimeMs = async (path: string): Promise<number> => {
  try {
    return (await getFileStat(path))?.mtimeMs || 0
  } catch (err) {
    Logger.error(`[fileUtils] Failed to getFileMtimeMs`, err)
    return 0
  }
}

export async function checkPathIsFile(filepath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filepath)
    return stat.isFile()
  } catch (err) {
    return false
  }
}

export function getIno(path: string): Promise<string | null> {
  return fs
    .stat(path, { bigint: true })
    .then((data) => String(data.ino))
    .catch((err) => {
      Logger.warn(`[Utils] Failed to get ino for path "${path}"`, err)
      return null
    })
}

export async function readTextFile(path: string): Promise<string> {
  try {
    var data = await fs.readFile(path)
    return String(data)
  } catch (error) {
    Logger.error(`[FileUtils] ReadTextFile error ${error}`)
    return ''
  }
}

export const shouldIgnoreFile = (path: string): string | null => {
  if (Path.basename(path).startsWith('.')) {
    return 'dotfile'
  }
  if (path.split('/').find((p) => p.startsWith('.'))) {
    return 'dotpath'
  }

  const includeAnywhereIgnore = ['@eaDir']
  const filteredInclude = includeAnywhereIgnore.filter((str) => path.includes(str))
  if (filteredInclude.length) {
    return `${filteredInclude[0]} directory`
  }

  const extensionIgnores = ['.part', '.tmp', '.crdownload', '.download', '.bak', '.old', '.temp', '.tempfile', '.tempfile~']

  if (extensionIgnores.includes(Path.extname(path).toLowerCase())) {
    return `${Path.extname(path)} file`
  }

  return null
}

export const recurseFiles = async (path: string, relPathToReplace: string = null): Promise<any[]> => {
  path = filePathToPOSIX(path)
  if (!path.endsWith('/')) path = path + '/'

  if (relPathToReplace) {
    relPathToReplace = filePathToPOSIX(relPathToReplace)
    if (!relPathToReplace.endsWith('/')) relPathToReplace += '/'
  } else {
    relPathToReplace = path
  }

  const options = {
    mode: rra.LIST,
    recursive: true,
    stats: false,
    ignoreFolders: true,
    extensions: true,
    deep: true,
    realPath: true,
    normalizePath: false
  }
  let list = await rra.list(path, options)
  if (list.error) {
    Logger.error('[fileUtils] Recurse files error', list.error)
    return []
  }

  const directoriesToIgnore = []

  list = list
    .filter((item) => {
      if (item.error) {
        Logger.error(`[fileUtils] Recurse files file "${item.fullname}" has error`, item.error)
        return false
      }

      item.fullname = filePathToPOSIX(item.fullname)
      item.path = filePathToPOSIX(item.path)
      const relpath = item.fullname.replace(relPathToReplace, '')
      let reldirname = Path.dirname(relpath)
      if (reldirname === '.') reldirname = ''
      const dirname = Path.dirname(item.fullname)

      if (item.name === '.ignore' && reldirname && reldirname !== '.' && !directoriesToIgnore.includes(dirname)) {
        Logger.debug(`[fileUtils] .ignore found - ignoring directory "${reldirname}"`)
        directoriesToIgnore.push(dirname)
        return false
      }

      const shouldIgnore = shouldIgnoreFile(relpath)
      if (shouldIgnore) {
        Logger.debug(`[fileUtils] Ignoring ${shouldIgnore} - "${relpath}"`)
        return false
      }

      return true
    })
    .filter((item) => {
      if (directoriesToIgnore.some((dir) => item.fullname.startsWith(dir + '/'))) {
        Logger.debug(`[fileUtils] Ignoring path in dir with .ignore "${item.fullname}"`)
        return false
      }
      return true
    })
    .map((item) => {
      var isInRoot = item.path + '/' === relPathToReplace
      return {
        name: item.name,
        path: item.fullname.replace(relPathToReplace, ''),
        reldirpath: isInRoot ? '' : item.path.replace(relPathToReplace, ''),
        fullpath: item.fullname,
        extension: item.extension,
        deep: item.deep
      }
    })

  list.sort((a, b) => a.deep - b.deep)

  return list
}

export const getFilePathItemFromFileUpdate = (fileUpdate: any): any => {
  let relPath = fileUpdate.relPath
  if (relPath.startsWith('/')) relPath = relPath.slice(1)

  const dirname = Path.dirname(relPath)
  return {
    name: Path.basename(relPath),
    path: relPath,
    reldirpath: dirname === '.' ? '' : dirname,
    fullpath: fileUpdate.path,
    extension: Path.extname(relPath),
    deep: relPath.split('/').length - 1
  }
}

export const downloadFile = (url: string, filepath: string, contentTypeFilter: ((ct: string) => boolean) | null = null): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    Logger.debug(`[fileUtils] Downloading file to ${filepath}`)
    axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'audiobookshelf (+https://audiobookshelf.org)'
      },
      timeout: 30000,
      httpAgent: global.DisableSsrfRequestFilter?.(url) ? null : ssrfFilter(url),
      httpsAgent: global.DisableSsrfRequestFilter?.(url) ? null : ssrfFilter(url)
    })
      .then((response) => {
        if (contentTypeFilter && !contentTypeFilter?.(response.headers?.['content-type'])) {
          return reject(new Error(`Invalid content type "${response.headers?.['content-type'] || ''}"`))
        }

        const totalSize = parseInt(response.headers['content-length'], 10)
        let downloadedSize = 0

        const writer = fs.createWriteStream(filepath)
        response.data.pipe(writer)

        let lastProgress = 0
        response.data.on('data', (chunk) => {
          downloadedSize += chunk.length
          const progress = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0
          if (progress >= lastProgress + 5) {
            Logger.debug(`[fileUtils] File "${Path.basename(filepath)}" download progress: ${progress}% (${downloadedSize}/${totalSize} bytes)`)
            lastProgress = progress
          }
        })

        writer.on('finish', resolve)
        writer.on('error', reject)
      })
      .catch((err) => {
        Logger.error(`[fileUtils] Failed to download file "${filepath}"`, err)
        reject(err)
      })
  })
}

export const downloadImageFile = (url: string, filepath: string): Promise<void> => {
  const contentTypeFilter = (contentType: string) => {
    return contentType?.startsWith('image/') && contentType !== 'image/svg+xml'
  }
  return downloadFile(url, filepath, contentTypeFilter)
}

export const sanitizeFilename = (filename: string, colonReplacement = ' - '): string | false => {
  if (typeof filename !== 'string') {
    return false
  }

  filename = filename.normalize('NFC')

  const MAX_FILENAME_BYTES = 255

  const replacement = ''
  const illegalRe = /[\/\?<>\\:\*\|"]/g
  const controlRe = /[\x00-\x1f\x80-\x9f]/g
  const reservedRe = /^\.+$/
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i
  const windowsTrailingRe = /[\. ]+$/
  const lineBreaks = /[\n\r]/g

  let sanitized = filename
    .replace(':', colonReplacement)
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(lineBreaks, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement)
    .replace(/\s+/g, ' ')

  const ext = Path.extname(sanitized)
  const basename = Path.basename(sanitized, ext)
  const extByteLength = Buffer.byteLength(ext, 'utf16le')

  const basenameByteLength = Buffer.byteLength(basename, 'utf16le')
  if (basenameByteLength + extByteLength > MAX_FILENAME_BYTES) {
    Logger.debug(`[fileUtils] Filename "${filename}" is too long (${basenameByteLength + extByteLength} bytes), trimming basename to ${MAX_FILENAME_BYTES - extByteLength} bytes.`)

    const MaxBytesForBasename = MAX_FILENAME_BYTES - extByteLength
    let totalBytes = 0
    let trimmedBasename = ''

    for (const char of basename) {
      totalBytes += Buffer.byteLength(char, 'utf16le')
      if (totalBytes > MaxBytesForBasename) break
      else trimmedBasename += char
    }

    trimmedBasename = trimmedBasename.trim()
    sanitized = trimmedBasename + ext
  }

  if (filename !== sanitized) {
    Logger.debug(`[fileUtils] Sanitized filename "${filename}" to "${sanitized}" (${Buffer.byteLength(sanitized, 'utf16le')} bytes)`)
  }

  return sanitized
}

export const getAudioMimeTypeFromExtname = (extname: string): string | null => {
  if (!extname || !extname.length) return null
  const formatUpper = extname.slice(1).toUpperCase()
  if ((AudioMimeType as Record<string, string>)[formatUpper]) return (AudioMimeType as Record<string, string>)[formatUpper]
  return null
}

export const removeFile = (path: string): Promise<boolean> => {
  if (!path) return Promise.resolve(false)
  return fs
    .remove(path)
    .then(() => true)
    .catch((error) => {
      Logger.error(`[fileUtils] Failed remove file "${path}"`, error)
      return false
    })
}

export const encodeUriPath = (path: string): string => {
  const uri = new URL('/', 'file://')
  uri.pathname = path
  return uri.pathname
}

export const isWritable = async (directory: string): Promise<boolean> => {
  try {
    const accessTestFile = Path.join(directory, 'accessTest')
    await fs.writeFile(accessTestFile, '')
    await fs.remove(accessTestFile)
    return true
  } catch (err) {
    Logger.info(`[fileUtils] Directory is not writable "${directory}"`, err)
    return false
  }
}

export const getWindowsDrives = async (): Promise<string[]> => {
  if (!global.isWin) {
    return []
  }
  return new Promise((resolve, reject) => {
    exec('powershell -Command "(Get-PSDrive -PSProvider FileSystem).Name"', async (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      let drives = stdout
        ?.split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line)
      const validDrives = []
      for (const drive of drives) {
        let drivepath = drive + ':/'
        if (await fs.pathExists(drivepath)) {
          validDrives.push(drivepath)
        } else {
          Logger.error(`Invalid drive ${drivepath}`)
        }
      }
      resolve(validDrives)
    })
  })
}

export const getDirectoriesInPath = async (dirPath: string, level: number): Promise<{ path: string; dirname: string; level: number }[]> => {
  try {
    const paths = await fs.readdir(dirPath)
    let dirs = await Promise.all(
      paths.map(async (dirname) => {
        const fullPath = Path.join(dirPath, dirname)

        const lstat = await fs.lstat(fullPath).catch((error) => {
          Logger.debug(`Failed to lstat "${fullPath}"`, error)
          return null
        })
        if (!lstat?.isDirectory()) return null

        return {
          path: filePathToPOSIX(fullPath),
          dirname,
          level
        }
      })
    )
    dirs = dirs.filter((d) => d)
    return dirs
  } catch (error) {
    Logger.error('Failed to readdir', dirPath, error)
    return []
  }
}

export async function copyToExisting(srcPath: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(srcPath)
    const writeStream = fs.createWriteStream(destPath, { flags: 'w' })

    readStream.pipe(writeStream)

    writeStream.on('finish', () => {
      Logger.debug(`[copyToExisting] Successfully copied file from ${srcPath} to ${destPath}`)
      resolve()
    })

    readStream.on('error', (error) => {
      Logger.error(`[copyToExisting] Error reading from source file ${srcPath}: ${error.message}`)
      readStream.close()
      writeStream.close()
      reject(error)
    })

    writeStream.on('error', (error) => {
      Logger.error(`[copyToExisting] Error writing to destination file ${destPath}: ${error.message}`)
      readStream.close()
      writeStream.close()
      reject(error)
    })
  })
}
