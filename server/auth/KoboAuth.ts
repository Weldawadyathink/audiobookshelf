/*
 * Kobo authentication
 * When logged in to Kobo's servers, a user gets a user key that is used to
 * validate future api calls. That key is somehow irrevokable (WTF?). Some
 * api endpoints also use the device id for validation.
 *
 * Our implementation:
 * Ignore the kobo auth entirely. A kobo authToken is generated per user.
 * The url parameter is at kobo/:authToken. This auth token provides indefinite
 * access, but can be revoked, unlike the kobo official apis. That token only
 * provides access to the /kobo/ api endpoints. The exact security posture can
 * be decided later. In calibre-web, the only destructive kobo api action is
 * archiving a book.
 */

import type { KoboRequest } from '../routers/KoboRouter'
import type { Response, NextFunction } from 'express'

const Logger = require('../Logger')
const UserModel = require('../models/User')
const crypto = require('crypto')
const { proxyOrRedirectToKobo } = require('../utils/koboUtils')

class KoboAuthManager {
  constructor() {}

  /**
   * Middleware to validate the kobo auth token from the URL parameter
   * Embeds the user object in the request object for later use.
   */
  static async validateABSAuthToken(req: KoboRequest, res: Response, next: NextFunction, authToken: string) {
    try {
    if (!authToken || typeof authToken !== 'string' || authToken.trim().length === 0) {
        Logger.debug('[KoboAuthManager] Invalid auth token: token is empty')
        return res.status(401).json({ error: 'Invalid auth token' })
      }

      // TODO: Implement actual token validation against database
      // For now, return root user
      const user = await UserModel.getUserByUsername('root')
      if (!user) {
        Logger.debug('[KoboAuthManager] User not found')
        return res.status(401).json({ error: 'User not found' })
      }
      req.user = user
      return next()

    } catch (error) {
      Logger.error('[KoboAuthManager] Error validating auth token', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /kobo/:authToken/v1/auth/device
   * Returns dummy tokens that are ignored. Authentication with ABS is done by the auth token in the URL.
   */
  static async handleKoboAuth(req: KoboRequest, res: Response) {
    try {
      return proxyOrRedirectToKobo(req, res, () => {
        const body = req.body || {}
        const userKey = body.UserKey || ''

        // Generate random tokens
        const accessToken = crypto.randomBytes(24).toString('base64')
        const refreshToken = crypto.randomBytes(24).toString('base64')
        const trackingId = crypto.randomUUID()

        Logger.debug('[KoboController] Sending dummy tokens for stock kobo device')

        return res.status(200).json({
          AccessToken: accessToken,
          RefreshToken: refreshToken,
          TokenType: 'Bearer',
          TrackingId: trackingId,
          UserKey: userKey
        })
      })
    } catch (error) {
      Logger.error('[KoboAuthManager] Error handling kobo auth', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

module.exports = KoboAuthManager
