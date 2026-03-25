import date from './libs/dateAndTime'
import { LogLevel } from './utils/constants'
import util from 'util'

interface SocketListener {
  id: string
  socket: any
  level: number
}

interface LogObject {
  timestamp: string
  source: string
  message: string
  levelName: string
  level: number
}

class Logger {
  logManager: any
  isDev: boolean
  logLevel: number
  socketListeners: SocketListener[]

  constructor() {
    this.logManager = null
    this.isDev = process.env.NODE_ENV !== 'production'
    this.logLevel = !this.isDev ? LogLevel.INFO : LogLevel.TRACE
    this.socketListeners = []
  }

  get timestamp(): string {
    return date.format(new Date(), 'YYYY-MM-DD HH:mm:ss.SSS')
  }

  get levelString(): string {
    return this.getLogLevelString(this.logLevel)
  }

  get source(): string {
    const regex = global.isWin ? /^.*\\([^\\:]*:[0-9]*):[0-9]*\)*/ : /^.*\/([^/:]*:[0-9]*):[0-9]*\)*/
    return Error().stack.split('\n')[3].replace(regex, '$1')
  }

  getLogLevelString(level: number): string {
    for (const key in LogLevel) {
      if ((LogLevel as Record<string, number>)[key] === level) {
        return key
      }
    }
    return 'UNKNOWN'
  }

  addSocketListener(socket: any, level: number): void {
    var index = this.socketListeners.findIndex((s) => s.id === socket.id)
    if (index >= 0) {
      this.socketListeners.splice(index, 1, {
        id: socket.id,
        socket,
        level
      })
    } else {
      this.socketListeners.push({
        id: socket.id,
        socket,
        level
      })
    }
  }

  removeSocketListener(socketId: string): void {
    this.socketListeners = this.socketListeners.filter((s) => s.id !== socketId)
  }

  async #logToFileAndListeners(level: number, levelName: string, args: any[], src: string): Promise<void> {
    const expandedArgs = args.map((arg) => (typeof arg !== 'string' ? util.inspect(arg) : arg))
    const logObj: LogObject = {
      timestamp: this.timestamp,
      source: src,
      message: expandedArgs.join(' '),
      levelName,
      level
    }

    this.socketListeners.forEach((socketListener) => {
      if (level >= LogLevel.FATAL || level >= socketListener.level) {
        socketListener.socket.emit('log', logObj)
      }
    })

    if (level >= LogLevel.FATAL || level >= this.logLevel) {
      await this.logManager?.logToFile(logObj)
    }
  }

  setLogLevel(level: number): void {
    this.logLevel = level
    this.debug(`Set Log Level to ${this.levelString}`)
  }

  static ConsoleMethods: Record<string, string> = {
    TRACE: 'trace',
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'error',
    NOTE: 'log'
  }

  #log(levelName: string, source: string, ...args: any[]): Promise<void> | undefined {
    const level = (LogLevel as Record<string, number>)[levelName]
    if (level < LogLevel.FATAL && level < this.logLevel) return
    const consoleMethod = Logger.ConsoleMethods[levelName]
    ;(console as Record<string, any>)[consoleMethod](`[${this.timestamp}] ${levelName}:`, ...args)
    return this.#logToFileAndListeners(level, levelName, args, source)
  }

  trace(...args: any[]): void {
    this.#log('TRACE', this.source, ...args)
  }

  debug(...args: any[]): void {
    this.#log('DEBUG', this.source, ...args)
  }

  info(...args: any[]): void {
    this.#log('INFO', this.source, ...args)
  }

  warn(...args: any[]): void {
    this.#log('WARN', this.source, ...args)
  }

  error(...args: any[]): void {
    this.#log('ERROR', this.source, ...args)
  }

  fatal(...args: any[]): Promise<void> | undefined {
    return this.#log('FATAL', this.source, ...args)
  }

  note(...args: any[]): void {
    this.#log('NOTE', this.source, ...args)
  }
}

export = new Logger()
