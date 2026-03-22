import { v4 as uuidv4 } from 'uuid'
import Logger from '../Logger'

interface ScanLogEntry {
  timestamp: string
  message: string
  levelName: string
  level: number
}

class ScanLogger {
  id: string | null
  type: string | null
  name: string | null
  verbose: boolean

  startedAt: number | null
  finishedAt: number | null
  elapsed: number | null

  authorsRemovedFromBooks: string[]
  seriesRemovedFromBooks: string[]

  logs: ScanLogEntry[]

  constructor() {
    this.id = null
    this.type = null
    this.name = null
    this.verbose = false

    this.startedAt = null
    this.finishedAt = null
    this.elapsed = null

    this.authorsRemovedFromBooks = []
    this.seriesRemovedFromBooks = []

    this.logs = []
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      elapsed: this.elapsed
    }
  }

  setData(type: string, name: string): void {
    this.id = uuidv4()
    this.type = type
    this.name = name
    this.startedAt = Date.now()
  }

  setComplete(): void {
    this.finishedAt = Date.now()
    this.elapsed = this.finishedAt - this.startedAt!
  }

  addLog(level: number, ...args: unknown[]): void {
    const logObj: ScanLogEntry = {
      timestamp: new Date().toISOString(),
      message: args.join(' '),
      levelName: Logger.getLogLevelString(level),
      level
    }

    if (this.verbose) {
      Logger.debug(`[Scan] "${this.name}":`, ...args)
    }
    this.logs.push(logObj)
  }
}

export = ScanLogger
