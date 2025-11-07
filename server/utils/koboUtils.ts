const Logger = require('../Logger')
const axios = require('axios')

import type { KoboRequest } from '../routers/KoboRouter'
import type { Response, NextFunction } from 'express'

const proxyKoboRequests = true
const koboStoreApiUrl = 'https://storeapi.kobo.com'
const koboImageHostUrl = 'https://cdn.kobo.com/book-images'

export async function proxyOrRedirectToKobo(req: KoboRequest, res: Response, defaultResponse: () => Response) {
  if (proxyKoboRequests) {
    try {
      // If kobo receives a redirect for a non-GET request, it will follow the redirect as a GET request.
      // This behavior will be addressed in the future.
      const koboUrl = getKoboUrl(req)

      // Prepare headers to forward, excluding some that shouldn't be forwarded
      const headersToForward: Record<string, string> = {}
      const headersToExclude = ['host', 'connection', 'content-length', 'transfer-encoding']

      Object.keys(req.headers).forEach((key) => {
        const lowerKey = key.toLowerCase()
        if (!headersToExclude.includes(lowerKey) && req.headers[key]) {
          const headerValue = req.headers[key]
          if (typeof headerValue === 'string') {
            headersToForward[key] = headerValue
          } else if (Array.isArray(headerValue) && headerValue.length > 0) {
            headersToForward[key] = headerValue[0]
          }
        }
      })

      // Make the request to Kobo API
      const axiosConfig = {
        method: req.method as string,
        url: koboUrl,
        headers: headersToForward,
        params: req.query,
        data: req.body,
        validateStatus: () => true // Don't throw on any status code
      }

      const response = await axios(axiosConfig)

      // Log the response
      Logger.debug(`[koboUtils] Kobo API response for ${req.method} ${getKoboUrl(req)}:
        Status: ${response.status}
        Headers: ${JSON.stringify(response.headers)}
        Data: ${JSON.stringify(response.data)}
      `)

      // Forward the response to the client
      res.status(response.status)

      // Forward response headers
      Object.keys(response.headers).forEach((key) => {
        const lowerKey = key.toLowerCase()
        // Exclude headers that shouldn't be forwarded
        if (!['connection', 'transfer-encoding', 'content-encoding'].includes(lowerKey)) {
          res.setHeader(key, response.headers[key])
        }
      })

      return res.send(response.data)
    } catch (error: any) {
      Logger.error(`[koboUtils] Error proxying request to Kobo API: ${error.message}`, error)
      return res.status(500).json({ error: 'Failed to proxy request to Kobo API' })
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
  const path = req.path
    .split('/')
    .filter(segment => segment.length > 0)
    .slice(1)
    .join('/')
  return `${koboStoreApiUrl}/${path}`
}
