const Logger = require('../Logger')

import type { KoboRequest } from '../routers/KoboRouter'
import type { Response, NextFunction } from 'express'

const proxyKoboRequests = true
const koboStoreApiUrl = 'https://storeapi.kobo.com'
const koboImageHostUrl = 'https://cdn.kobo.com/book-images'

export function proxyOrRedirectToKobo(req: KoboRequest, res: Response, defaultResponse: () => Response) {
  if (proxyKoboRequests) {
    if (req.method === 'GET') {
      Logger.debug(`[koboUtils] Kobo proxy enabled, redirecting GET request to ${req.path}`)
      return res.status(307).redirect(getKoboUrl(req))
    }
    else {
      // TODO: Test if redirect is actually working
      Logger.debug(`[koboUtils] Kobo proxy enabled, testing redirect for ${req.method}: ${req.path}`)
      return res.status(307).redirect(getKoboUrl(req))
    }
  }
  else {
    Logger.debug(`[koboUtils] Kobo proxy disabled, returning empty response for ${req.method}: ${req.path}`)
    return defaultResponse()
  }
}

export function getKoboUrl(req: KoboRequest) {
  // Request path is at abs.url/kobo/:authtoken/:path
  // Express strips the mount point, so req.path is /:authtoken/:path
  // Return the kobo store api url with just the path, suitable for a redirect or proxy

  return `${koboStoreApiUrl}${req.path.replace(`/${req.params.authToken}`, '')}`
}
