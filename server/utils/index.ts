// @ts-nocheck
import Path from 'path'
import uuid from 'uuid'
import Logger from '../Logger'
import { parseString } from 'xml2js'
import areEquivalent from './areEquivalent'

export const levenshteinDistance = (str1: any, str2: any, caseSensitive = false): number => {
  str1 = String(str1)
  str2 = String(str2)
  if (!caseSensitive) {
    str1 = str1.toLowerCase()
    str2 = str2.toLowerCase()
  }
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      )
    }
  }
  return track[str2.length][str1.length]
}

export const levenshteinSimilarity = (str1: string, str2: string, caseSensitive = false): number => {
  const distance = levenshteinDistance(str1, str2, caseSensitive)
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  return 1 - distance / maxLength
}

export const isObject = (val: unknown): val is Record<string, unknown> => {
  return val !== null && typeof val === 'object'
}

export const comparePaths = (path1: string, path2: string): boolean => {
  return path1 === path2 || Path.normalize(path1) === Path.normalize(path2)
}

export const isNullOrNaN = (num: unknown): boolean => {
  return num === null || isNaN(num as number)
}

export const xmlToJSON = (xml: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    parseString(xml, (err, results) => {
      if (err) {
        Logger.error(`[xmlToJSON] Error`, err)
        resolve(null)
      } else {
        resolve(results)
      }
    })
  })
}

export const getId = (prepend = ''): string => {
  var _id = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8)
  if (prepend) return prepend + '_' + _id
  return _id
}

export function elapsedPretty(seconds: number): string {
  if (seconds > 0 && seconds < 1) {
    return `${Math.floor(seconds * 1000)} ms`
  }
  if (seconds < 60) {
    return `${Math.floor(seconds)} sec`
  }
  let minutes = Math.floor(seconds / 60)
  if (minutes < 70) {
    return `${minutes} min`
  }
  let hours = Math.floor(minutes / 60)
  minutes -= hours * 60

  let days = Math.floor(hours / 24)
  hours -= days * 24

  const timeParts = []
  if (days) {
    timeParts.push(`${days} d`)
  }
  if (hours || (days && minutes)) {
    timeParts.push(`${hours} hr`)
  }
  if (minutes) {
    timeParts.push(`${minutes} min`)
  }
  return timeParts.join(' ')
}

export function secondsToTimestamp(seconds: number, includeMs = false, alwaysIncludeHours = false): string {
  var _seconds = seconds
  var _minutes = Math.floor(seconds / 60)
  _seconds -= _minutes * 60
  var _hours = Math.floor(_minutes / 60)
  _minutes -= _hours * 60

  var ms = _seconds - Math.floor(seconds)
  _seconds = Math.floor(_seconds)

  const msString = includeMs ? '.' + ms.toFixed(3).split('.')[1] : ''
  if (alwaysIncludeHours) {
    return `${_hours.toString().padStart(2, '0')}:${_minutes.toString().padStart(2, '0')}:${_seconds.toString().padStart(2, '0')}${msString}`
  }
  if (!_hours) {
    return `${_minutes}:${_seconds.toString().padStart(2, '0')}${msString}`
  }
  return `${_hours}:${_minutes.toString().padStart(2, '0')}:${_seconds.toString().padStart(2, '0')}${msString}`
}

export const reqSupportsWebp = (req: any): boolean => {
  if (!req || !req.headers || !req.headers.accept) return false
  return req.headers.accept.includes('image/webp') || req.headers.accept === '*/*'
}

export { areEquivalent }

export const copyValue = (val: unknown): unknown => {
  if (val === undefined || val === '') return null
  else if (!val) return val

  if (!isObject(val)) return val

  if (Array.isArray(val)) {
    return val.map(copyValue)
  } else {
    var final: Record<string, unknown> = {}
    for (const key in val) {
      final[key] = copyValue((val as Record<string, unknown>)[key])
    }
    return final
  }
}

export const toNumber = (val: unknown, fallback = 0): number => {
  if (isNaN(val as number) || val === null) return fallback
  return Number(val)
}

export const cleanStringForSearch = (str: string): string => {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[\'\.\`\",]/g, '')
    .trim()
}

const getTitleParts = (title: string): [string, string | null] => {
  if (!title) return ['', null]
  const prefixesToIgnore = (global.ServerSettings as any)?.sortingPrefixes || []
  for (const prefix of prefixesToIgnore) {
    if (title.toLowerCase().startsWith(`${prefix} `)) {
      return [title.substr(prefix.length + 1), `${prefix.substr(0, 1).toUpperCase() + prefix.substr(1)}`]
    }
  }
  return [title, null]
}

export const getTitleIgnorePrefix = (title: string): string => {
  return getTitleParts(title)[0]
}

export const getTitlePrefixAtEnd = (title: string): string => {
  let [sort, prefix] = getTitleParts(title)
  return prefix ? `${sort}, ${prefix}` : title
}

export const escapeRegExp = (str: string): string => {
  if (typeof str !== 'string') return ''
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const validateUrl = (rawUrl: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  try {
    return new URL(rawUrl).toString()
  } catch (error) {
    Logger.error(`Invalid URL "${rawUrl}"`, error)
    return null
  }
}

export const isUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false
  return uuid.validate(str)
}

export const isValidASIN = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false
  return /^[A-Z0-9]{10}$/.test(str)
}

export const timestampToSeconds = (timestamp: string): number | null => {
  if (typeof timestamp !== 'string') {
    return null
  }
  const parts = timestamp.split(':').map(Number)
  if (parts.some(isNaN)) {
    return null
  } else if (parts.length === 1) {
    return parts[0]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return null
}

export class ValidationError extends Error {
  paramName: string
  status: number

  constructor(paramName: string, message: string, status = 400) {
    super(`Query parameter "${paramName}" ${message}`)
    this.name = 'ValidationError'
    this.paramName = paramName
    this.status = status
  }
}

export class NotFoundError extends Error {
  status: number

  constructor(message: string, status = 404) {
    super(message)
    this.name = 'NotFoundError'
    this.status = status
  }
}
