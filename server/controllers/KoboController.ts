const crypto = require('crypto')
const Logger = require('../Logger')

import type { KoboRequest, KoboUser } from '../routers/KoboRouter'
import { proxyOrRedirectToKobo } from '../utils/koboUtils'
import type { Response } from 'express'

class KoboController {
  constructor() {}

  static async handleFallbackRedirect(req: KoboRequest, res: Response) {
    Logger.debug(`[KoboController] Handling fallback redirect for ${req.method}: ${req.path}`)
    return proxyOrRedirectToKobo(req, res, () => {
      return res.status(200).json({})
    })
  }
}



// ----------------------------- Begin AI generated code -----------------------------

/**
 * Convert Date to Kobo timestamp string (ISO 8601 format)
 */
function convertToKoboTimestamp(date) {
  if (!date || !(date instanceof Date)) {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  }
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Generate UUID v3 from series name
 */
function generateSeriesId(seriesName) {
  const namespace = Buffer.from('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'hex')
  const name = Buffer.from(seriesName, 'utf8')
  const hash = crypto.createHash('md5').update(Buffer.concat([namespace, name])).digest()
  hash[6] = (hash[6] & 0x0f) | 0x30 // Version 3
  hash[8] = (hash[8] & 0x3f) | 0x80 // Variant
  return hash.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

/**
 * Encode sync token to base64
 */
function encodeSyncToken(token) {
  return Buffer.from(JSON.stringify(token)).toString('base64')
}

/**
 * Decode sync token from base64
 */
function decodeSyncToken(headerValue) {
  try {
    const json = Buffer.from(headerValue, 'base64').toString('utf-8')
    return JSON.parse(json)
  } catch (error) {
    Logger.error('[KoboController] Failed to decode sync token', error)
    return null
  }
}

/**
 * Create default sync token
 */
function createDefaultSyncToken() {
  const epoch = convertToKoboTimestamp(new Date(0))
  return {
    books_last_modified: epoch,
    books_last_created: epoch,
    reading_state_last_modified: epoch,
    archive_last_modified: epoch,
    tags_last_modified: epoch
  }
}

/**
 * Generate download URL for a book
 */
function generateDownloadUrl(bookId, bookFormat, authToken, req) {
  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
  const host = req.get('host')
  const baseUrl = `${protocol}://${host}${global.RouterBasePath || ''}`
  return `${baseUrl}/kobo/${authToken}/download/${bookId}/${bookFormat.toLowerCase()}`
}

/**
 * Map internal read status to Kobo status
 */
function getKoboReadStatus(isFinished, ebookProgress) {
  if (isFinished) return 'Finished'
  if (ebookProgress && ebookProgress > 0) return 'Reading'
  return 'ReadyToRead'
}

/**
 * Map Kobo status to internal values
 */
function getInternalReadStatus(koboStatus) {
  const map = {
    ReadyToRead: { isFinished: false, ebookProgress: 0 },
    Reading: { isFinished: false, ebookProgress: 0.01 },
    Finished: { isFinished: true, ebookProgress: 1 }
  }
  return map[koboStatus] || map.ReadyToRead
}

/**
 * Get ISO 639-1 language code from library item
 */
function getLanguageCode(libraryItem) {
  if (libraryItem.media?.language) {
    // Try to extract 2-letter code (en, fr, etc.)
    const lang = libraryItem.media.language.toLowerCase()
    if (lang.length === 2) return lang
    if (lang.startsWith('en')) return 'en'
    if (lang.startsWith('fr')) return 'fr'
    if (lang.startsWith('de')) return 'de'
    if (lang.startsWith('es')) return 'es'
    if (lang.startsWith('it')) return 'it'
    if (lang.startsWith('pt')) return 'pt'
    if (lang.startsWith('ja')) return 'ja'
    if (lang.startsWith('zh')) return 'zh'
  }
  return 'en' // Default to English
}

class KoboControllerOld {
  constructor() {}

  /**
   * GET /kobo/:authToken/v1/initialization
   * Device initialization
   */
  static async handleInit(req, res) {
    try {
      const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
      const host = req.get('host')
      const baseUrl = `${protocol}://${host}${global.RouterBasePath || ''}`
      const authToken = req.koboAuthToken

      const resources = {
        image_host: `${baseUrl}/kobo/${authToken}`,
        image_url_template: `${baseUrl}/kobo/${authToken}/{ImageId}/{Width}/{Height}/false/image.jpg`,
        image_url_quality_template: `${baseUrl}/kobo/${authToken}/{ImageId}/{Width}/{Height}/{Quality}/false/image.jpg`,
        library_sync: `${baseUrl}/kobo/${authToken}/v1/library/sync`,
        library_metadata: `${baseUrl}/kobo/${authToken}/v1/library/{Ids}/metadata`,
        reading_state: `${baseUrl}/kobo/${authToken}/v1/library/{Ids}/state`,
        tags: `${baseUrl}/kobo/${authToken}/v1/library/tags`
      }

      res.set('x-kobo-apitoken', Buffer.from('{}').toString('base64'))
      res.json({ Resources: resources })
    } catch (error) {
      Logger.error('[KoboController] Init error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /kobo/:authToken/v1/library/sync
   * Main library sync endpoint
   */
  static async handleSync(req, res) {
    try {
      const user = req.user

      // Check download permissions
      if (!user.canDownload) {
        Logger.info(`[KoboController] User needs download permissions for syncing library to Kobo reader`)
        return res.status(403).json({ error: 'Download permission required' })
      }

      // Decode sync token from header
      const syncTokenHeader = req.headers['x-kobo-sync']
      let syncToken = syncTokenHeader ? decodeSyncToken(syncTokenHeader) : null

      if (!syncToken) {
        syncToken = createDefaultSyncToken()
      }

      Logger.info('[KoboController] Kobo library sync request received')
      Logger.debug(`[KoboController] Sync token: ${JSON.stringify(syncToken)}`)

      const syncResults = []
      let newBooksLastModified = new Date(syncToken.books_last_modified)
      let newBooksLastCreated = new Date(syncToken.books_last_created)
      let newReadingStateLastModified = new Date(syncToken.reading_state_last_modified)
      let newTagsLastModified = new Date(syncToken.tags_last_modified)

      // Get user's accessible libraries
      const libraries = user.canAccessAllLibraries
        ? await Database.libraryModel.findAll({ where: { mediaType: 'book' } })
        : await Database.libraryModel.findAll({
            where: {
              id: { [Op.in]: user.librariesAccessible || [] },
              mediaType: 'book'
            }
          })

      const libraryIds = libraries.map((lib) => lib.id)

      if (libraryIds.length === 0) {
        // No accessible libraries
        const responseHeaders = {
          'Content-Type': 'application/json; charset=utf-8',
          'x-kobo-sync': encodeSyncToken(syncToken)
        }
        res.set(responseHeaders)
        return res.json([])
      }

      // Query for changed books
      const booksLastModifiedDate = new Date(syncToken.books_last_modified)
      const booksLastCreatedDate = new Date(syncToken.books_last_created)

      const changedBooks = await Database.libraryItemModel.findAll({
        where: {
          libraryId: { [Op.in]: libraryIds },
          mediaType: 'book',
          [Op.or]: [
            { updatedAt: { [Op.gt]: booksLastModifiedDate } },
            { createdAt: { [Op.gt]: booksLastCreatedDate } }
          ]
        },
        include: [
          {
            model: Database.bookModel,
            include: [
              {
                model: Database.authorModel,
                through: { attributes: [] },
                attributes: ['id', 'name']
              },
              {
                model: Database.seriesModel,
                through: { attributes: ['sequence'] },
                attributes: ['id', 'name']
              }
            ]
          }
        ],
        order: [['updatedAt', 'ASC'], ['id', 'ASC']],
        limit: SYNC_ITEM_LIMIT
      })

      // Process books
      const processedBookIds = []
      const processedLibraryItemIds = []

      // Batch fetch reading states for all books
      const bookIds = changedBooks
        .filter((li) => li.media && li.media.ebookFile)
        .map((li) => li.media.id)

      const readingStatesMap = new Map()
      if (bookIds.length > 0) {
        const readingStates = await Database.mediaProgressModel.findAll({
          where: {
            userId: user.id,
            mediaItemId: { [Op.in]: bookIds },
            mediaItemType: 'book'
          }
        })
        readingStates.forEach((rs) => {
          readingStatesMap.set(rs.mediaItemId, rs)
        })
      }

      for (const libraryItem of changedBooks) {
        if (!libraryItem.media || !libraryItem.media.ebookFile) {
          continue // Skip books without ebook files
        }

        // Check user permissions
        if (libraryItem.media.explicit === true && !user.canAccessExplicitContent) {
          continue
        }
        if (libraryItem.media.tags?.length && !user.checkCanAccessLibraryItemWithTags(libraryItem.media.tags)) {
          continue
        }

        const book = libraryItem.media
        const bookUuid = libraryItem.id
        processedBookIds.push(book.id)
        processedLibraryItemIds.push(libraryItem.id)

        // Get reading state from map
        const mediaProgress = readingStatesMap.get(book.id)

        // Create entitlement
        const entitlement = KoboController.createBookEntitlement(libraryItem, false, req)
        const metadata = KoboController.createBookMetadata(libraryItem, req)

        const entitlementResponse = {
          BookEntitlement: entitlement,
          BookMetadata: metadata
        }

        // Include reading state if modified
        if (mediaProgress) {
          const readingStateDate = new Date(mediaProgress.updatedAt)
          if (readingStateDate > new Date(syncToken.reading_state_last_modified)) {
            entitlementResponse.ReadingState = KoboController.createReadingStateResponse(
              libraryItem,
              mediaProgress
            )
            if (readingStateDate > newReadingStateLastModified) {
              newReadingStateLastModified = readingStateDate
            }
          }
        }

        // Determine if new or changed
        const bookCreated = libraryItem.createdAt
        if (bookCreated > booksLastCreatedDate) {
          syncResults.push({ NewEntitlement: entitlementResponse })
        } else {
          syncResults.push({ ChangedEntitlement: entitlementResponse })
        }

        // Update timestamps
        if (libraryItem.updatedAt > newBooksLastModified) {
          newBooksLastModified = libraryItem.updatedAt
        }
        if (bookCreated > newBooksLastCreated) {
          newBooksLastCreated = bookCreated
        }
      }

      // Query for changed reading states (excluding books already in entitlements)
      // Only query if we have processed books (to avoid empty NOT IN clause)
      if (processedBookIds.length > 0) {
        const changedReadingStates = await Database.mediaProgressModel.findAll({
          where: {
            userId: user.id,
            mediaItemType: 'book',
            updatedAt: { [Op.gt]: new Date(syncToken.reading_state_last_modified) },
            mediaItemId: { [Op.notIn]: processedBookIds }
          },
          limit: SYNC_ITEM_LIMIT,
          order: [['updatedAt', 'ASC']]
        })

        // Batch fetch library items for reading states
        const readingStateBookIds = changedReadingStates.map((rs) => rs.mediaItemId)
        const libraryItemsForReadingStates = readingStateBookIds.length > 0
          ? await Database.libraryItemModel.findAll({
              where: {
                mediaId: { [Op.in]: readingStateBookIds },
                mediaType: 'book',
                libraryId: { [Op.in]: libraryIds }
              },
              include: [
                {
                  model: Database.bookModel
                }
              ]
            })
          : []

        const libraryItemsMap = new Map()
        libraryItemsForReadingStates.forEach((li) => {
          libraryItemsMap.set(li.mediaId, li)
        })

        for (const mediaProgress of changedReadingStates) {
          const libraryItem = libraryItemsMap.get(mediaProgress.mediaItemId)
          if (!libraryItem || !libraryItem.media) continue

          // Check permissions
          if (libraryItem.media.explicit === true && !user.canAccessExplicitContent) {
            continue
          }
          if (libraryItem.media.tags?.length && !user.checkCanAccessLibraryItemWithTags(libraryItem.media.tags)) {
            continue
          }

          syncResults.push({
            ChangedReadingState: {
              ReadingState: KoboController.createReadingStateResponse(libraryItem, mediaProgress)
            }
          })

          const readingStateDate = new Date(mediaProgress.updatedAt)
          if (readingStateDate > newReadingStateLastModified) {
            newReadingStateLastModified = readingStateDate
          }
        }
      }

      // Handle collections/tags
      // TODO: Implement collection syncing

      // Update sync token
      syncToken.books_last_modified = convertToKoboTimestamp(newBooksLastModified)
      syncToken.books_last_created = convertToKoboTimestamp(newBooksLastCreated)
      syncToken.reading_state_last_modified = convertToKoboTimestamp(newReadingStateLastModified)
      syncToken.tags_last_modified = convertToKoboTimestamp(newTagsLastModified)

      // Check if more items remain by querying total count
      const totalChangedCount = await Database.libraryItemModel.count({
        where: {
          libraryId: { [Op.in]: libraryIds },
          mediaType: 'book',
          [Op.or]: [
            { updatedAt: { [Op.gt]: booksLastModifiedDate } },
            { createdAt: { [Op.gt]: booksLastCreatedDate } }
          ]
        }
      })
      const hasMore = totalChangedCount > changedBooks.length

      const responseHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'x-kobo-sync': hasMore ? 'continue' : encodeSyncToken(syncToken)
      }

      res.set(responseHeaders)
      res.json(syncResults)
    } catch (error) {
      Logger.error('[KoboController] Sync error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /kobo/:authToken/v1/library/:bookUuid/metadata
   * Get book metadata
   */
  static async handleMetadata(req, res) {
    try {
      const user = req.user

      if (!user.canDownload) {
        return res.status(403).json({ error: 'Download permission required' })
      }

      const bookUuid = req.params.bookUuid

      const libraryItem = await Database.libraryItemModel.getExpandedById(bookUuid)
      if (!libraryItem || libraryItem.mediaType !== 'book' || !libraryItem.media) {
        Logger.info(`[KoboController] Book ${bookUuid} not found in database`)
        return res.status(404).json({ error: 'Book not found' })
      }

      // Check user permissions
      if (libraryItem.media.explicit === true && !user.canAccessExplicitContent) {
        return res.status(404).json({ error: 'Book not found' })
      }
      if (libraryItem.media.tags?.length && !user.checkCanAccessLibraryItemWithTags(libraryItem.media.tags)) {
        return res.status(404).json({ error: 'Book not found' })
      }

      const metadata = KoboController.createBookMetadata(libraryItem, req)

      res.set('Content-Type', 'application/json; charset=utf-8')
      res.json([metadata])
    } catch (error) {
      Logger.error('[KoboController] Metadata error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /kobo/:authToken/v1/library/:bookUuid/state
   * Get reading state
   */
  static async getReadingState(req, res) {
    try {
      const user = req.user

      const bookUuid = req.params.bookUuid

      const libraryItem = await Database.libraryItemModel.getExpandedById(bookUuid)
      if (!libraryItem || libraryItem.mediaType !== 'book' || !libraryItem.media) {
        return res.status(404).json({ error: 'Book not found' })
      }

      // Get or create reading state
      let mediaProgress = await Database.mediaProgressModel.findOne({
        where: {
          userId: user.id,
          mediaItemId: libraryItem.media.id,
          mediaItemType: 'book'
        }
      })

      if (!mediaProgress) {
        // Create default reading state
        mediaProgress = await Database.mediaProgressModel.create({
          userId: user.id,
          mediaItemId: libraryItem.media.id,
          mediaItemType: 'book',
          isFinished: false,
          ebookProgress: 0
        })
      }

      const readingState = KoboController.createReadingStateResponse(libraryItem, mediaProgress)
      res.json([readingState])
    } catch (error) {
      Logger.error('[KoboController] Get reading state error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * PUT /kobo/:authToken/v1/library/:bookUuid/state
   * Update reading state
   */
  static async updateReadingState(req, res) {
    try {
      const user = req.user

      const bookUuid = req.params.bookUuid
      const body = req.body

      if (!body.ReadingStates || !Array.isArray(body.ReadingStates) || body.ReadingStates.length === 0) {
        return res.status(400).json({ error: 'Malformed request data is missing ReadingStates key' })
      }

      const libraryItem = await Database.libraryItemModel.getExpandedById(bookUuid)
      if (!libraryItem || libraryItem.mediaType !== 'book' || !libraryItem.media) {
        return res.status(404).json({ error: 'Book not found' })
      }

      const requestState = body.ReadingStates[0]

      // Get or create media progress
      let mediaProgress = await Database.mediaProgressModel.findOne({
        where: {
          userId: user.id,
          mediaItemId: libraryItem.media.id,
          mediaItemType: 'book'
        }
      })

      if (!mediaProgress) {
        mediaProgress = await Database.mediaProgressModel.create({
          userId: user.id,
          mediaItemId: libraryItem.media.id,
          mediaItemType: 'book'
        })
      }

      // Update bookmark
      if (requestState.CurrentBookmark) {
        const bookmark = requestState.CurrentBookmark
        if (bookmark.ProgressPercent !== undefined) {
          mediaProgress.ebookProgress = bookmark.ProgressPercent / 100
        }
        if (bookmark.Location) {
          mediaProgress.ebookLocation = bookmark.Location.Value || bookmark.Location.value || null
        }
      }

      // Update statistics
      if (requestState.Statistics) {
        // Store statistics in extraData
        if (!mediaProgress.extraData) mediaProgress.extraData = {}
        mediaProgress.extraData.spentReadingMinutes = requestState.Statistics.SpentReadingMinutes || 0
        mediaProgress.extraData.remainingTimeMinutes = requestState.Statistics.RemainingTimeMinutes || 0
        mediaProgress.changed('extraData', true)
      }

      // Update status
      if (requestState.StatusInfo) {
        const koboStatus = requestState.StatusInfo.Status
        const internalStatus = getInternalReadStatus(koboStatus)
        const oldIsFinished = mediaProgress.isFinished

        mediaProgress.isFinished = internalStatus.isFinished
        if (internalStatus.ebookProgress !== undefined) {
          mediaProgress.ebookProgress = internalStatus.ebookProgress
        }

        // Track times started reading
        if (koboStatus === 'Reading' && oldIsFinished !== internalStatus.isFinished) {
          if (!mediaProgress.extraData) mediaProgress.extraData = {}
          mediaProgress.extraData.timesStartedReading = (mediaProgress.extraData.timesStartedReading || 0) + 1
          mediaProgress.extraData.lastTimeStartedReading = new Date().toISOString()
          mediaProgress.changed('extraData', true)
        }
      }

      await mediaProgress.save()

      const response = {
        RequestResult: 'Success',
        UpdateResults: [
          {
            EntitlementId: bookUuid,
            CurrentBookmarkResult: requestState.CurrentBookmark ? { Result: 'Success' } : undefined,
            StatisticsResult: requestState.Statistics ? { Result: 'Success' } : undefined,
            StatusInfoResult: requestState.StatusInfo ? { Result: 'Success' } : undefined
          }
        ]
      }

      res.json(response)
    } catch (error) {
      Logger.error('[KoboController] Update reading state error', error)
      res.status(400).json({ error: 'Malformed request' })
    }
  }

  /**
   * GET /kobo/:authToken/download/:bookId/:bookFormat
   * Download book file
   */
  static async downloadBook(req, res) {
    try {
      const user = req.user

      if (!user.canDownload) {
        return res.status(403).json({ error: 'Download permission required' })
      }

      const bookId = req.params.bookId
      const bookFormat = req.params.bookFormat.toLowerCase()

      const libraryItem = await Database.libraryItemModel.getExpandedById(bookId)
      if (!libraryItem || libraryItem.mediaType !== 'book' || !libraryItem.media) {
        return res.status(404).json({ error: 'Book not found' })
      }

      // Check user permissions
      if (libraryItem.media.explicit === true && !user.canAccessExplicitContent) {
        return res.status(404).json({ error: 'Book not found' })
      }
      if (libraryItem.media.tags?.length && !user.checkCanAccessLibraryItemWithTags(libraryItem.media.tags)) {
        return res.status(404).json({ error: 'Book not found' })
      }

      const ebookFile = libraryItem.media.ebookFile
      if (!ebookFile || !ebookFile.metadata || !ebookFile.metadata.path) {
        Logger.warn(`[KoboController] No ebook file for library item "${libraryItem.media.title}"`)
        return res.status(404).json({ error: 'Ebook file not found' })
      }

      const ebookPath = ebookFile.metadata.path
      if (!(await fs.pathExists(ebookPath))) {
        Logger.error(`[KoboController] Ebook file path does not exist: ${ebookPath}`)
        return res.status(404).json({ error: 'Ebook file not found' })
      }

      Logger.info(`[KoboController] User "${user.username}" requested download for book "${libraryItem.media.title}" ebook at "${ebookPath}"`)

      if (global.XAccel) {
        const { encodeUriPath } = require('../utils/fileUtils')
        const encodedURI = encodeUriPath(global.XAccel + ebookPath)
        Logger.debug(`[KoboController] Use X-Accel to serve static file ${encodedURI}`)
        return res.status(204).header({ 'X-Accel-Redirect': encodedURI }).send()
      }

      res.setHeader('Content-Type', 'application/epub+zip')
      res.setHeader('Content-Disposition', `attachment; filename="${ebookFile.metadata.filename || 'book.epub'}"`)
      res.sendFile(ebookPath)
    } catch (error) {
      Logger.error('[KoboController] Download book error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /kobo/:authToken/:bookUuid/:width/:height/:isGreyscale/image.jpg
   * Get cover image
   */
  static async getCoverImage(req, res) {
    try {
      const user = req.user

      const bookUuid = req.params.bookUuid
      const height = parseInt(req.params.height) || 500

      const libraryItem = await Database.libraryItemModel.getExpandedById(bookUuid)
      if (libraryItem && libraryItem.media) {
        // Check user permissions
        if (libraryItem.media.explicit === true && !user.canAccessExplicitContent) {
          return res.status(404).json({ error: 'Cover not found' })
        }
        if (libraryItem.media.tags?.length && !user.checkCanAccessLibraryItemWithTags(libraryItem.media.tags)) {
          return res.status(404).json({ error: 'Cover not found' })
        }

        const coverPath = await Database.libraryItemModel.getCoverPath(libraryItem.id)
        if (coverPath && (await fs.pathExists(coverPath))) {
          Logger.debug(`[KoboController] Serving local cover image of book ${bookUuid}`)
          res.setHeader('Content-Type', 'image/jpeg')
          return res.sendFile(coverPath)
        }
      }

      // Redirect to Kobo CDN if not found locally
      Logger.debug(`[KoboController] Redirecting request for cover image of unknown book ${bookUuid} to Kobo`)
      const koboImageUrl = `${KOBO_IMAGEHOST_URL}/${bookUuid}/${req.params.width}/${req.params.height}/false/image.jpg`
      res.redirect(307, koboImageUrl)
    } catch (error) {
      Logger.error('[KoboController] Get cover image error', error)
      res.status(404).json({ error: 'Cover not found' })
    }
  }

  /**
   * POST /kobo/:authToken/v1/library/tags
   * Create tag/collection
   */
  static async createTag(req, res) {
    try {
      const user = req.user

      const body = req.body
      if (!body.Name || !body.Items) {
        return res.status(400).json({ error: 'Malformed tags POST request' })
      }

      // TODO: Create collection/shelf
      const shelfUuid = crypto.randomUUID()
      res.status(201).json(shelfUuid)
    } catch (error) {
      Logger.error('[KoboController] Create tag error', error)
      res.status(400).json({ error: 'Malformed request' })
    }
  }

  /**
   * PUT /kobo/:authToken/v1/library/tags/:tagId
   * Update tag/collection
   */
  static async updateTag(req, res) {
    try {
      const user = req.user

      const tagId = req.params.tagId
      const body = req.body

      if (!body.Name) {
        return res.status(400).json({ error: 'Malformed tags POST request' })
      }

      // TODO: Update collection name
      res.status(200).send(' ')
    } catch (error) {
      Logger.error('[KoboController] Update tag error', error)
      res.status(400).json({ error: 'Malformed request' })
    }
  }

  /**
   * DELETE /kobo/:authToken/v1/library/tags/:tagId
   * Delete tag/collection
   */
  static async deleteTag(req, res) {
    try {
      const user = req.user

      const tagId = req.params.tagId

      // TODO: Delete collection
      res.status(200).send(' ')
    } catch (error) {
      Logger.error('[KoboController] Delete tag error', error)
      res.status(404).json({ error: 'Collection not found' })
    }
  }

  /**
   * POST /kobo/:authToken/v1/library/tags/:tagId/items
   * Add items to tag
   */
  static async addTagItems(req, res) {
    try {
      const user = req.user

      const tagId = req.params.tagId
      const body = req.body

      if (!body.Items) {
        return res.status(400).json({ error: 'Malformed tags POST request' })
      }

      // TODO: Add items to collection
      res.status(201).send('')
    } catch (error) {
      Logger.error('[KoboController] Add tag items error', error)
      res.status(400).json({ error: 'Malformed request' })
    }
  }

  /**
   * POST /kobo/:authToken/v1/library/tags/:tagId/items/delete
   * Remove items from tag
   */
  static async removeTagItems(req, res) {
    try {
      const user = req.user

      const tagId = req.params.tagId
      const body = req.body

      if (!body.Items) {
        return res.status(400).json({ error: 'Malformed tags POST request' })
      }

      // TODO: Remove items from collection
      res.status(200).send('')
    } catch (error) {
      Logger.error('[KoboController] Remove tag items error', error)
      res.status(400).json({ error: 'Malformed request' })
    }
  }

  /**
   * DELETE /kobo/:authToken/v1/library/:bookUuid
   * Delete book
   */
  static async deleteBook(req, res) {
    try {
      const user = req.user

      const bookUuid = req.params.bookUuid

      Logger.info(`[KoboController] Kobo book delete request received for book ${bookUuid}`)

      // TODO: Handle book deletion/archiving
      // If shelf-only sync: do nothing (will be removed on next sync)
      // Otherwise: archive book if user has permission

      res.status(204).send('')
    } catch (error) {
      Logger.error('[KoboController] Delete book error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /kobo/:authToken/v1/user/loyalty/benefits
   * Handle benefits endpoint
   */
  static async handleBenefits(req, res) {
    try {
      res.json({ Benefits: {} })
    } catch (error) {
      Logger.error('[KoboController] Benefits error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /kobo/:authToken/v1/analytics/gettests
   * Handle get tests endpoint
   */
  static async handleGetTests(req, res) {
    try {
      const testKey = req.headers['x-kobo-userkey'] || ''
      res.json({
        Result: 'Success',
        TestKey: testKey,
        Tests: {}
      })
    } catch (error) {
      Logger.error('[KoboController] Get tests error', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /kobo/:authToken
   * Top level endpoint
   */
  static async topLevelEndpoint(req, res) {
    res.json({})
  }

  /**
   * Create book entitlement object
   */
  static createBookEntitlement(libraryItem, archived, req) {
    const bookUuid = libraryItem.id
    return {
      Accessibility: 'Full',
      ActivePeriod: {
        From: convertToKoboTimestamp(new Date())
      },
      Created: convertToKoboTimestamp(libraryItem.createdAt),
      CrossRevisionId: bookUuid,
      Id: bookUuid,
      IsRemoved: archived || false,
      IsHiddenFromArchive: false,
      IsLocked: false,
      LastModified: convertToKoboTimestamp(libraryItem.updatedAt),
      OriginCategory: 'Imported',
      RevisionId: bookUuid,
      Status: 'Active'
    }
  }

  /**
   * Create book metadata object
   */
  static createBookMetadata(libraryItem, req) {
    const book = libraryItem.media
    const bookUuid = libraryItem.id
    const authToken = req.koboAuthToken

    // Build authors
    const authors = book.authors || []
    const authorNames = authors.map((a) => a.name || a)

    // Build download URLs
    const downloadUrls = []
    if (book.ebookFile) {
      const ebookFormat = book.ebookFile.ebookFormat || 'EPUB'
      const format = ebookFormat.toUpperCase()
      const size = book.ebookFile.metadata?.size || 0

      // Add format variations
      if (format === 'KEPUB') {
        downloadUrls.push({
          Format: 'KEPUB',
          Size: size,
          Url: generateDownloadUrl(bookUuid, 'kepub', authToken, req),
          Platform: 'Generic'
        })
      } else if (format === 'EPUB') {
        downloadUrls.push({
          Format: 'EPUB3',
          Size: size,
          Url: generateDownloadUrl(bookUuid, 'epub', authToken, req),
          Platform: 'Generic'
        })
        downloadUrls.push({
          Format: 'EPUB',
          Size: size,
          Url: generateDownloadUrl(bookUuid, 'epub', authToken, req),
          Platform: 'Generic'
        })
      }
    }

    // Build series info
    let seriesInfo = null
    if (book.series && book.series.length > 0) {
      const series = book.series[0]
      const seriesName = series.name || series
      const sequence = series.bookSeries?.sequence || series.sequence || 1
      seriesInfo = {
        Name: seriesName,
        Number: Math.floor(parseFloat(sequence) || 1),
        NumberFloat: parseFloat(sequence) || 1,
        Id: generateSeriesId(seriesName)
      }
    }

    // Get publication date
    let pubDate = new Date()
    if (book.publishedDate) {
      pubDate = new Date(book.publishedDate)
    } else if (book.publishedYear) {
      pubDate = new Date(`${book.publishedYear}-01-01`)
    }

    const metadata = {
      CrossRevisionId: bookUuid,
      EntitlementId: bookUuid,
      RevisionId: bookUuid,
      WorkId: bookUuid,
      Title: book.title || 'Untitled',
      Language: getLanguageCode(libraryItem),
      PublicationDate: convertToKoboTimestamp(pubDate),
      CurrentDisplayPrice: {
        CurrencyCode: 'USD',
        TotalAmount: 0
      },
      CurrentLoveDisplayPrice: {
        TotalAmount: 0
      },
      DownloadUrls: downloadUrls,
      CoverImageId: bookUuid,
      Categories: [DEFAULT_CATEGORY_UUID],
      Genre: DEFAULT_CATEGORY_UUID,
      IsEligibleForKoboLove: false,
      IsInternetArchive: false,
      IsPreOrder: false,
      IsSocialEnabled: true,
      ExternalIds: [],
      PhoneticPronunciations: {}
    }

    // Add description
    if (book.description) {
      metadata.Description = book.description
    }

    // Add authors
    if (authorNames.length > 0) {
      metadata.Contributors = authorNames
      metadata.ContributorRoles = authorNames.map((name) => ({ Name: name }))
    }

    // Add publisher
    if (book.publisher) {
      metadata.Publisher = {
        Name: book.publisher,
        Imprint: ''
      }
    }

    // Add series
    if (seriesInfo) {
      metadata.Series = seriesInfo
    }

    return metadata
  }

  /**
   * Create reading state response
   */
  static createReadingStateResponse(libraryItem, mediaProgress) {
    const bookUuid = libraryItem.id
    const status = getKoboReadStatus(mediaProgress.isFinished, mediaProgress.ebookProgress)

    const readingState = {
      EntitlementId: bookUuid,
      Created: convertToKoboTimestamp(libraryItem.createdAt),
      LastModified: convertToKoboTimestamp(mediaProgress.updatedAt),
      PriorityTimestamp: convertToKoboTimestamp(mediaProgress.updatedAt),
      StatusInfo: {
        LastModified: convertToKoboTimestamp(mediaProgress.updatedAt),
        Status: status,
        TimesStartedReading: mediaProgress.extraData?.timesStartedReading || 0
      }
    }

    // Add last time started reading if available
    if (mediaProgress.extraData?.lastTimeStartedReading) {
      readingState.StatusInfo.LastTimeStartedReading = convertToKoboTimestamp(
        new Date(mediaProgress.extraData.lastTimeStartedReading)
      )
    }

    // Add statistics if available
    if (mediaProgress.extraData?.spentReadingMinutes || mediaProgress.extraData?.remainingTimeMinutes) {
      readingState.Statistics = {
        LastModified: convertToKoboTimestamp(mediaProgress.updatedAt)
      }
      if (mediaProgress.extraData.spentReadingMinutes !== undefined) {
        readingState.Statistics.SpentReadingMinutes = mediaProgress.extraData.spentReadingMinutes
      }
      if (mediaProgress.extraData.remainingTimeMinutes !== undefined) {
        readingState.Statistics.RemainingTimeMinutes = mediaProgress.extraData.remainingTimeMinutes
      }
    }

    // Add bookmark if available
    if (mediaProgress.ebookProgress !== undefined || mediaProgress.ebookLocation) {
      readingState.CurrentBookmark = {
        LastModified: convertToKoboTimestamp(mediaProgress.updatedAt)
      }
      if (mediaProgress.ebookProgress !== undefined) {
        readingState.CurrentBookmark.ProgressPercent = Math.round(mediaProgress.ebookProgress * 100)
        readingState.CurrentBookmark.ContentSourceProgressPercent = Math.round(mediaProgress.ebookProgress * 100)
      }
      if (mediaProgress.ebookLocation) {
        readingState.CurrentBookmark.Location = {
          Value: mediaProgress.ebookLocation,
          Type: 'Position',
          Source: 'User'
        }
      }
    }

    return readingState
  }
}

module.exports = KoboController

