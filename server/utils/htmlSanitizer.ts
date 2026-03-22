import sanitizeHtml = require('../libs/sanitizeHtml')
import { entities } from './htmlEntities'

export function sanitize(html: string): string {
  if (typeof html !== 'string') {
    return ''
  }

  const sanitizerOptions = {
    allowedTags: ['p', 'ol', 'ul', 'li', 'a', 'strong', 'em', 'del', 'br', 'b', 'i'],
    disallowedTagsMode: 'discard',
    allowedAttributes: {
      a: ['href', 'name', 'target']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false
  }

  return sanitizeHtml(html, sanitizerOptions)
}

export function stripAllTags(html: string, shouldDecodeEntities = true): string {
  if (typeof html !== 'string') return ''

  const sanitizerOptions = {
    allowedTags: [],
    disallowedTagsMode: 'discard'
  }

  const sanitized = sanitizeHtml(html, sanitizerOptions)
  return shouldDecodeEntities ? decodeHTMLEntities(sanitized) : sanitized
}

function decodeHTMLEntities(strToDecode: string): string {
  return strToDecode.replace(/\&([^;]+);?/g, function (entity) {
    if (entity in entities) {
      return (entities as Record<string, string>)[entity]
    }
    return entity
  })
}
