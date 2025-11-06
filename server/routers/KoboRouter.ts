const express = require('express')
const KoboController = require('../controllers/KoboController')
const Logger = require('../Logger')
const KoboAuthManager = require('../auth/KoboAuth')

import type { Request, Response, NextFunction } from 'express'

// Inline type extension for Kobo-specific request properties
export interface KoboUser {
  id: number
  canDownload: boolean
  canAccessExplicitContent: boolean
  canAccessAllLibraries: boolean
  librariesAccessible: number[]
}

export interface KoboRequest extends Request {
  koboAuthToken?: string
  user?: KoboUser
}

class KoboRouter {
  router: import('express').Application

  constructor() {
    this.router = express()
    this.router.disable('x-powered-by')
    this.init()
  }

  init() {
    // Device authentication middleware for ABS auth
    this.router.param('authToken', KoboAuthManager.validateABSAuthToken.bind(this))

    // Device authentication endpoint for kobo auth
    this.router.post('/:authToken/v1/auth/device', KoboAuthManager.handleKoboAuth.bind(this))

    this.router.all('*', (req: KoboRequest, res: Response, next: NextFunction) => {
      Logger.debug(`[KoboRouter] Handling request ${req.method}: ${req.path}`)
      Logger.debug(`[KoboRouter] Request body: ${JSON.stringify(req.body)}`)
      Logger.debug(`[KoboRouter] Request headers: ${JSON.stringify(req.headers)}`)
      Logger.debug(`[KoboRouter] Request query: ${JSON.stringify(req.query)}`)
      Logger.debug(`[KoboRouter] Request params: ${JSON.stringify(req.params)}`)
      next()
    })

    // Fallback redirect for all unknown routes
    this.router.all('*', KoboController.handleFallbackRedirect.bind(this))

    // Initialization
    // this.router.get('/:authToken/v1/initialization', KoboController.handleInit.bind(this))

    // Library sync (main endpoint)
    // this.router.get('/:authToken/v1/library/sync', KoboController.handleSync.bind(this))

    // Book metadata
    // this.router.get('/:authToken/v1/library/:bookUuid/metadata', KoboController.handleMetadata.bind(this))

    // Reading state
    // this.router.get('/:authToken/v1/library/:bookUuid/state', KoboController.getReadingState.bind(this))
    // this.router.put('/:authToken/v1/library/:bookUuid/state', KoboController.updateReadingState.bind(this))

    // Book download
    // this.router.get('/:authToken/download/:bookId/:bookFormat', KoboController.downloadBook.bind(this))

    // Cover images
    // this.router.get('/:authToken/:bookUuid/:width/:height/:isGreyscale/image.jpg', KoboController.getCoverImage.bind(this))
    // this.router.get('/:authToken/:bookUuid/:width/:height/:Quality/:isGreyscale/image.jpg', KoboController.getCoverImage.bind(this))

    // Tags/Collections
    // this.router.post('/:authToken/v1/library/tags', KoboController.createTag.bind(this))
    // this.router.put('/:authToken/v1/library/tags/:tagId', KoboController.updateTag.bind(this))
    // this.router.delete('/:authToken/v1/library/tags/:tagId', KoboController.deleteTag.bind(this))
    // this.router.post('/:authToken/v1/library/tags/:tagId/items', KoboController.addTagItems.bind(this))
    // this.router.post('/:authToken/v1/library/tags/:tagId/items/delete', KoboController.removeTagItems.bind(this))

    // Book deletion
    // this.router.delete('/:authToken/v1/library/:bookUuid', KoboController.deleteBook.bind(this))

    // Unimplemented endpoints (proxy or return empty)
    // this.router.get('/:authToken/v1/user/loyalty/benefits', KoboController.handleBenefits.bind(this))
    // this.router.get('/:authToken/v1/analytics/gettests', KoboController.handleGetTests.bind(this))

    // Top level endpoint
    // this.router.get('/:authToken', KoboController.topLevelEndpoint.bind(this))
  }
}

module.exports = KoboRouter

