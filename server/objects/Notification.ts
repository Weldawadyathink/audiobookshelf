import { v4 as uuidv4 } from 'uuid'

interface NotificationInput {
  id?: string
  libraryId?: string | null
  eventName?: string
  urls?: string[]
  titleTemplate?: string
  bodyTemplate?: string
  type?: string | null
  enabled?: boolean
  lastFiredAt?: number | null
  lastAttemptFailed?: boolean
  numConsecutiveFailedAttempts?: number
  numTimesFired?: number
  createdAt?: number
  [key: string]: unknown
}

class Notification {
  id: string | null
  libraryId: string | null
  eventName: string
  urls: string[]
  titleTemplate: string
  bodyTemplate: string
  type: string | null
  enabled: boolean

  lastFiredAt: number | null
  lastAttemptFailed: boolean
  numConsecutiveFailedAttempts: number
  numTimesFired: number
  createdAt: number | null

  constructor(notification: NotificationInput | null = null) {
    this.id = null
    this.libraryId = null
    this.eventName = ''
    this.urls = []
    this.titleTemplate = ''
    this.bodyTemplate = ''
    this.type = 'info'
    this.enabled = false

    this.lastFiredAt = null
    this.lastAttemptFailed = false
    this.numConsecutiveFailedAttempts = 0
    this.numTimesFired = 0
    this.createdAt = null

    if (notification) {
      this.construct(notification)
    }
  }

  construct(notification: NotificationInput): void {
    this.id = notification.id || null
    this.libraryId = notification.libraryId || null
    this.eventName = notification.eventName || ''
    this.urls = notification.urls || []
    this.titleTemplate = notification.titleTemplate || ''
    this.bodyTemplate = notification.bodyTemplate || ''
    this.type = notification.type || 'info'
    this.enabled = !!notification.enabled
    this.lastFiredAt = notification.lastFiredAt || null
    this.lastAttemptFailed = !!notification.lastAttemptFailed
    this.numConsecutiveFailedAttempts = notification.numConsecutiveFailedAttempts || 0
    this.numTimesFired = notification.numTimesFired || 0
    this.createdAt = notification.createdAt || null
  }

  toJSON() {
    return {
      id: this.id,
      libraryId: this.libraryId,
      eventName: this.eventName,
      urls: this.urls,
      titleTemplate: this.titleTemplate,
      bodyTemplate: this.bodyTemplate,
      enabled: this.enabled,
      type: this.type,
      lastFiredAt: this.lastFiredAt,
      lastAttemptFailed: this.lastAttemptFailed,
      numConsecutiveFailedAttempts: this.numConsecutiveFailedAttempts,
      numTimesFired: this.numTimesFired,
      createdAt: this.createdAt
    }
  }

  setData(payload: NotificationInput): void {
    this.id = uuidv4()
    this.libraryId = payload.libraryId || null
    this.eventName = payload.eventName || ''
    this.urls = payload.urls || []
    this.titleTemplate = payload.titleTemplate || ''
    this.bodyTemplate = payload.bodyTemplate || ''
    this.enabled = !!payload.enabled
    this.type = payload.type || null
    this.createdAt = Date.now()
  }

  update(payload: NotificationInput): boolean {
    if (!this.enabled && payload.enabled) {
      // Reset
      this.lastFiredAt = null
      this.lastAttemptFailed = false
      this.numConsecutiveFailedAttempts = 0
    }

    const keysToUpdate = ['libraryId', 'eventName', 'urls', 'titleTemplate', 'bodyTemplate', 'enabled', 'type']
    let hasUpdated = false
    for (const key of keysToUpdate) {
      if (payload[key] !== undefined) {
        if (key === 'urls') {
          const payloadUrls = payload[key] as string[]
          if (payloadUrls.join(',') !== this.urls.join(',')) {
            this.urls = [...payloadUrls]
            hasUpdated = true
          }
        } else if (payload[key] !== (this as Record<string, unknown>)[key]) {
          (this as Record<string, unknown>)[key] = payload[key]
          hasUpdated = true
        }
      }
    }
    return hasUpdated
  }

  updateNotificationFired(success: boolean): void {
    this.lastFiredAt = Date.now()
    this.lastAttemptFailed = !success
    this.numConsecutiveFailedAttempts = success ? 0 : this.numConsecutiveFailedAttempts + 1
    this.numTimesFired++
  }

  replaceVariablesInTemplate(templateText: string, data: Record<string, string>): string {
    const ptrn = /{{ ?([a-zA-Z]+) ?}}/mg

    let match: RegExpExecArray | null
    let updatedTemplate = templateText
    while ((match = ptrn.exec(templateText)) != null) {
      if (data[match[1]]) {
        updatedTemplate = updatedTemplate.replace(match[0], data[match[1]])
      }
    }
    return updatedTemplate
  }

  parseTitleTemplate(data: Record<string, string>): string {
    return this.replaceVariablesInTemplate(this.titleTemplate, data)
  }

  parseBodyTemplate(data: Record<string, string>): string {
    return this.replaceVariablesInTemplate(this.bodyTemplate, data)
  }

  getApprisePayload(data: Record<string, string>) {
    return {
      urls: this.urls,
      title: this.parseTitleTemplate(data),
      body: this.parseBodyTemplate(data)
    }
  }
}

export = Notification
