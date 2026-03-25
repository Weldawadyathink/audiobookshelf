// @ts-nocheck
import Path from 'path'
import packageJson from '../../../package.json'
import { BookshelfView } from '../../utils/constants'
import Logger from '../../Logger'
import User from '../../models/User'
import { sanitize } from '../../utils/htmlSanitizer'

class ServerSettings {
  id: string
  tokenSecret: string | null
  scannerParseSubtitle: boolean
  scannerFindCovers: boolean
  scannerCoverProvider: string
  scannerPreferMatchedMetadata: boolean
  scannerDisableWatcher: boolean
  storeCoverWithItem: boolean
  storeMetadataWithItem: boolean
  metadataFileFormat: string
  rateLimitLoginRequests: number
  rateLimitLoginWindow: number
  allowIframe: boolean
  backupPath: string
  backupSchedule: string | boolean
  backupsToKeep: number
  maxBackupSize: number
  loggerDailyLogsToKeep: number
  loggerScannerLogsToKeep: number
  homeBookshelfView: number
  bookshelfView: number
  podcastEpisodeSchedule: string
  sortingIgnorePrefix: boolean
  sortingPrefixes: string[]
  chromecastEnabled: boolean
  dateFormat: string
  timeFormat: string
  language: string
  allowedOrigins: string[]
  logLevel: number
  version: string | null
  buildNumber: number
  authLoginCustomMessage: string | null
  authActiveAuthMethods: string[]
  authOpenIDIssuerURL: string | null
  authOpenIDAuthorizationURL: string | null
  authOpenIDTokenURL: string | null
  authOpenIDUserInfoURL: string | null
  authOpenIDJwksURL: string | null
  authOpenIDLogoutURL: string | null
  authOpenIDClientID: string | null
  authOpenIDClientSecret: string | null
  authOpenIDTokenSigningAlgorithm: string
  authOpenIDButtonText: string
  authOpenIDAutoLaunch: boolean
  authOpenIDAutoRegister: boolean
  authOpenIDMatchExistingBy: string | null
  authOpenIDMobileRedirectURIs: string[]
  authOpenIDGroupClaim: string
  authOpenIDAdvancedPermsClaim: string
  authOpenIDSubfolderForRedirectURLs: string | undefined

  constructor(settings?: Record<string, any>) {
    this.id = 'server-settings'
    this.tokenSecret = null

    this.scannerParseSubtitle = false
    this.scannerFindCovers = false
    this.scannerCoverProvider = 'google'
    this.scannerPreferMatchedMetadata = false
    this.scannerDisableWatcher = false

    this.storeCoverWithItem = false
    this.storeMetadataWithItem = false
    this.metadataFileFormat = 'json'

    this.rateLimitLoginRequests = 10
    this.rateLimitLoginWindow = 10 * 60 * 1000
    this.allowIframe = false

    this.backupPath = Path.join(global.MetadataPath, 'backups')
    this.backupSchedule = false
    this.backupsToKeep = 2
    this.maxBackupSize = 1

    this.loggerDailyLogsToKeep = 7
    this.loggerScannerLogsToKeep = 2

    this.homeBookshelfView = BookshelfView.DETAIL
    this.bookshelfView = BookshelfView.DETAIL

    this.podcastEpisodeSchedule = '0 * * * *'

    this.sortingIgnorePrefix = false
    this.sortingPrefixes = ['the', 'a']

    this.chromecastEnabled = false
    this.dateFormat = 'MM/dd/yyyy'
    this.timeFormat = 'HH:mm'
    this.language = 'en-us'
    this.allowedOrigins = []

    this.logLevel = Logger.logLevel

    this.version = packageJson.version
    this.buildNumber = packageJson.buildNumber

    this.authLoginCustomMessage = null
    this.authActiveAuthMethods = ['local']

    this.authOpenIDIssuerURL = null
    this.authOpenIDAuthorizationURL = null
    this.authOpenIDTokenURL = null
    this.authOpenIDUserInfoURL = null
    this.authOpenIDJwksURL = null
    this.authOpenIDLogoutURL = null
    this.authOpenIDClientID = null
    this.authOpenIDClientSecret = null
    this.authOpenIDTokenSigningAlgorithm = 'RS256'
    this.authOpenIDButtonText = 'Login with OpenId'
    this.authOpenIDAutoLaunch = false
    this.authOpenIDAutoRegister = false
    this.authOpenIDMatchExistingBy = null
    this.authOpenIDMobileRedirectURIs = ['audiobookshelf://oauth']
    this.authOpenIDGroupClaim = ''
    this.authOpenIDAdvancedPermsClaim = ''
    this.authOpenIDSubfolderForRedirectURLs = undefined

    if (settings) {
      this.construct(settings)
    }
  }

  construct(settings: Record<string, any>): void {
    this.tokenSecret = settings.tokenSecret
    this.scannerFindCovers = !!settings.scannerFindCovers
    this.scannerCoverProvider = settings.scannerCoverProvider || 'google'
    this.scannerParseSubtitle = settings.scannerParseSubtitle
    this.scannerPreferMatchedMetadata = !!settings.scannerPreferMatchedMetadata
    this.scannerDisableWatcher = !!settings.scannerDisableWatcher

    this.storeCoverWithItem = !!settings.storeCoverWithItem
    this.storeMetadataWithItem = !!settings.storeMetadataWithItem
    this.metadataFileFormat = settings.metadataFileFormat || 'json'

    this.rateLimitLoginRequests = !isNaN(settings.rateLimitLoginRequests) ? Number(settings.rateLimitLoginRequests) : 10
    this.rateLimitLoginWindow = !isNaN(settings.rateLimitLoginWindow) ? Number(settings.rateLimitLoginWindow) : 10 * 60 * 1000
    this.allowIframe = !!settings.allowIframe

    this.backupPath = settings.backupPath || Path.join(global.MetadataPath, 'backups')
    this.backupSchedule = settings.backupSchedule || false
    this.backupsToKeep = settings.backupsToKeep || 2
    this.maxBackupSize = settings.maxBackupSize === 0 ? 0 : settings.maxBackupSize || 1

    this.loggerDailyLogsToKeep = settings.loggerDailyLogsToKeep || 7
    this.loggerScannerLogsToKeep = settings.loggerScannerLogsToKeep || 2

    this.homeBookshelfView = settings.homeBookshelfView || BookshelfView.STANDARD
    this.bookshelfView = settings.bookshelfView || BookshelfView.STANDARD

    this.sortingIgnorePrefix = !!settings.sortingIgnorePrefix
    this.sortingPrefixes = settings.sortingPrefixes || ['the']
    this.chromecastEnabled = !!settings.chromecastEnabled
    this.dateFormat = settings.dateFormat || 'MM/dd/yyyy'
    this.timeFormat = settings.timeFormat || 'HH:mm'
    this.language = settings.language || 'en-us'
    this.allowedOrigins = settings.allowedOrigins || []
    this.logLevel = settings.logLevel || Logger.logLevel
    this.version = settings.version || null
    this.buildNumber = settings.buildNumber || 0

    this.authLoginCustomMessage = sanitize(settings.authLoginCustomMessage) || null
    this.authActiveAuthMethods = settings.authActiveAuthMethods || ['local']

    this.authOpenIDIssuerURL = settings.authOpenIDIssuerURL || null
    this.authOpenIDAuthorizationURL = settings.authOpenIDAuthorizationURL || null
    this.authOpenIDTokenURL = settings.authOpenIDTokenURL || null
    this.authOpenIDUserInfoURL = settings.authOpenIDUserInfoURL || null
    this.authOpenIDJwksURL = settings.authOpenIDJwksURL || null
    this.authOpenIDLogoutURL = settings.authOpenIDLogoutURL || null
    this.authOpenIDClientID = settings.authOpenIDClientID || null
    this.authOpenIDClientSecret = settings.authOpenIDClientSecret || null
    this.authOpenIDTokenSigningAlgorithm = settings.authOpenIDTokenSigningAlgorithm || 'RS256'
    this.authOpenIDButtonText = settings.authOpenIDButtonText || 'Login with OpenId'
    this.authOpenIDAutoLaunch = !!settings.authOpenIDAutoLaunch
    this.authOpenIDAutoRegister = !!settings.authOpenIDAutoRegister
    this.authOpenIDMatchExistingBy = settings.authOpenIDMatchExistingBy || null
    this.authOpenIDMobileRedirectURIs = settings.authOpenIDMobileRedirectURIs || ['audiobookshelf://oauth']
    this.authOpenIDGroupClaim = settings.authOpenIDGroupClaim || ''
    this.authOpenIDAdvancedPermsClaim = settings.authOpenIDAdvancedPermsClaim || ''
    this.authOpenIDSubfolderForRedirectURLs = settings.authOpenIDSubfolderForRedirectURLs

    if (!Array.isArray(this.authActiveAuthMethods)) {
      this.authActiveAuthMethods = ['local']
    }

    if (this.authActiveAuthMethods.includes('openid') && !this.isOpenIDAuthSettingsValid) {
      this.authActiveAuthMethods.splice(this.authActiveAuthMethods.indexOf('openid', 0), 1)
    }

    if (!Array.isArray(this.authActiveAuthMethods) || this.authActiveAuthMethods.length == 0) {
      this.authActiveAuthMethods = ['local']
    }

    // Migrations
    if (settings.storeCoverWithBook != undefined) {
      this.storeCoverWithItem = !!settings.storeCoverWithBook
    }
    if (settings.storeMetadataWithBook != undefined) {
      this.storeMetadataWithItem = !!settings.storeMetadataWithBook
    }
    if (settings.homeBookshelfView == undefined) {
      this.homeBookshelfView = settings.bookshelfView
    }
    if (settings.metadataFileFormat == undefined) {
      this.metadataFileFormat = 'abs'
    }

    if (this.metadataFileFormat !== 'json') {
      Logger.warn(`[ServerSettings] Invalid metadataFileFormat ${this.metadataFileFormat} (as of v2.4.5 only json is supported)`)
      this.metadataFileFormat = 'json'
    }

    if (this.logLevel !== Logger.logLevel) {
      Logger.setLogLevel(this.logLevel)
    }

    if (process.env.BACKUP_PATH && this.backupPath !== process.env.BACKUP_PATH) {
      Logger.info(`[ServerSettings] Using backup path from environment variable ${process.env.BACKUP_PATH}`)
      this.backupPath = process.env.BACKUP_PATH
    }

    if (process.env.ALLOW_IFRAME === '1' && !this.allowIframe) {
      Logger.info(`[ServerSettings] Using allowIframe from environment variable`)
      this.allowIframe = true
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      tokenSecret: this.tokenSecret,
      scannerFindCovers: this.scannerFindCovers,
      scannerCoverProvider: this.scannerCoverProvider,
      scannerParseSubtitle: this.scannerParseSubtitle,
      scannerPreferMatchedMetadata: this.scannerPreferMatchedMetadata,
      scannerDisableWatcher: this.scannerDisableWatcher,
      storeCoverWithItem: this.storeCoverWithItem,
      storeMetadataWithItem: this.storeMetadataWithItem,
      metadataFileFormat: this.metadataFileFormat,
      rateLimitLoginRequests: this.rateLimitLoginRequests,
      rateLimitLoginWindow: this.rateLimitLoginWindow,
      allowIframe: this.allowIframe,
      backupPath: this.backupPath,
      backupSchedule: this.backupSchedule,
      backupsToKeep: this.backupsToKeep,
      maxBackupSize: this.maxBackupSize,
      loggerDailyLogsToKeep: this.loggerDailyLogsToKeep,
      loggerScannerLogsToKeep: this.loggerScannerLogsToKeep,
      homeBookshelfView: this.homeBookshelfView,
      bookshelfView: this.bookshelfView,
      podcastEpisodeSchedule: this.podcastEpisodeSchedule,
      sortingIgnorePrefix: this.sortingIgnorePrefix,
      sortingPrefixes: [...this.sortingPrefixes],
      chromecastEnabled: this.chromecastEnabled,
      dateFormat: this.dateFormat,
      timeFormat: this.timeFormat,
      language: this.language,
      allowedOrigins: this.allowedOrigins,
      logLevel: this.logLevel,
      version: this.version,
      buildNumber: this.buildNumber,
      authLoginCustomMessage: this.authLoginCustomMessage,
      authActiveAuthMethods: this.authActiveAuthMethods,
      authOpenIDIssuerURL: this.authOpenIDIssuerURL,
      authOpenIDAuthorizationURL: this.authOpenIDAuthorizationURL,
      authOpenIDTokenURL: this.authOpenIDTokenURL,
      authOpenIDUserInfoURL: this.authOpenIDUserInfoURL,
      authOpenIDJwksURL: this.authOpenIDJwksURL,
      authOpenIDLogoutURL: this.authOpenIDLogoutURL,
      authOpenIDClientID: this.authOpenIDClientID,
      authOpenIDClientSecret: this.authOpenIDClientSecret,
      authOpenIDTokenSigningAlgorithm: this.authOpenIDTokenSigningAlgorithm,
      authOpenIDButtonText: this.authOpenIDButtonText,
      authOpenIDAutoLaunch: this.authOpenIDAutoLaunch,
      authOpenIDAutoRegister: this.authOpenIDAutoRegister,
      authOpenIDMatchExistingBy: this.authOpenIDMatchExistingBy,
      authOpenIDMobileRedirectURIs: this.authOpenIDMobileRedirectURIs,
      authOpenIDGroupClaim: this.authOpenIDGroupClaim,
      authOpenIDAdvancedPermsClaim: this.authOpenIDAdvancedPermsClaim,
      authOpenIDSubfolderForRedirectURLs: this.authOpenIDSubfolderForRedirectURLs
    }
  }

  toJSONForBrowser(): Record<string, unknown> {
    const json = this.toJSON()
    delete json.tokenSecret
    delete json.authOpenIDClientID
    delete json.authOpenIDClientSecret
    delete json.authOpenIDMobileRedirectURIs
    delete json.authOpenIDGroupClaim
    delete json.authOpenIDAdvancedPermsClaim
    return json
  }

  get supportedAuthMethods(): string[] {
    return ['local', 'openid']
  }

  get isOpenIDAuthSettingsValid(): boolean {
    return !!(this.authOpenIDIssuerURL && this.authOpenIDAuthorizationURL && this.authOpenIDTokenURL && this.authOpenIDUserInfoURL && this.authOpenIDJwksURL && this.authOpenIDClientID && this.authOpenIDClientSecret && this.authOpenIDTokenSigningAlgorithm)
  }

  get authenticationSettings(): Record<string, unknown> {
    return {
      authLoginCustomMessage: this.authLoginCustomMessage,
      authActiveAuthMethods: this.authActiveAuthMethods,
      authOpenIDIssuerURL: this.authOpenIDIssuerURL,
      authOpenIDAuthorizationURL: this.authOpenIDAuthorizationURL,
      authOpenIDTokenURL: this.authOpenIDTokenURL,
      authOpenIDUserInfoURL: this.authOpenIDUserInfoURL,
      authOpenIDJwksURL: this.authOpenIDJwksURL,
      authOpenIDLogoutURL: this.authOpenIDLogoutURL,
      authOpenIDClientID: this.authOpenIDClientID,
      authOpenIDClientSecret: this.authOpenIDClientSecret,
      authOpenIDTokenSigningAlgorithm: this.authOpenIDTokenSigningAlgorithm,
      authOpenIDButtonText: this.authOpenIDButtonText,
      authOpenIDAutoLaunch: this.authOpenIDAutoLaunch,
      authOpenIDAutoRegister: this.authOpenIDAutoRegister,
      authOpenIDMatchExistingBy: this.authOpenIDMatchExistingBy,
      authOpenIDMobileRedirectURIs: this.authOpenIDMobileRedirectURIs,
      authOpenIDGroupClaim: this.authOpenIDGroupClaim,
      authOpenIDAdvancedPermsClaim: this.authOpenIDAdvancedPermsClaim,
      authOpenIDSubfolderForRedirectURLs: this.authOpenIDSubfolderForRedirectURLs,
      authOpenIDSamplePermissions: User.getSampleAbsPermissions()
    }
  }

  get authFormData(): Record<string, unknown> {
    const clientFormData: Record<string, unknown> = {
      authLoginCustomMessage: sanitize(this.authLoginCustomMessage)
    }
    if (this.authActiveAuthMethods.includes('openid')) {
      clientFormData.authOpenIDButtonText = this.authOpenIDButtonText
      clientFormData.authOpenIDAutoLaunch = this.authOpenIDAutoLaunch
    }
    return clientFormData
  }

  update(payload: Record<string, any>): boolean {
    let hasUpdates = false
    for (const key in payload) {
      if (key === 'authLoginCustomMessage') {
        payload[key] = sanitize(payload[key])
      }
      if (key === 'sortingPrefixes') {
        continue
      } else if (key === 'authActiveAuthMethods') {
        if (!payload[key]?.length) {
          Logger.error(`[ServerSettings] Invalid authActiveAuthMethods`, payload[key])
          continue
        }
        this.authActiveAuthMethods.sort()
        payload[key].sort()
        if (payload[key].join() !== this.authActiveAuthMethods.join()) {
          this.authActiveAuthMethods = payload[key]
          hasUpdates = true
        }
      } else if ((this as Record<string, unknown>)[key] !== payload[key]) {
        if (key === 'logLevel') {
          Logger.setLogLevel(payload[key])
        }
        (this as Record<string, unknown>)[key] = payload[key]
        hasUpdates = true
      }
    }
    return hasUpdates
  }
}

export = ServerSettings
