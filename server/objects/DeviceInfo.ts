import { v4 as uuidv4 } from 'uuid'
import { stripAllTags } from '../utils/htmlSanitizer'

interface UABrowser {
  name?: string | null
  version?: string | null
}

interface UAOs {
  name?: string | null
  version?: string | null
}

interface UADevice {
  type?: string | null
}

interface UAParser {
  browser: UABrowser
  os: UAOs
  device: UADevice
}

interface ClientDeviceInfo {
  deviceId?: string | null
  clientVersion?: string | null
  manufacturer?: string | null
  model?: string | null
  sdkVersion?: string | null
  clientName?: string | null
}

interface DeviceInfoInput {
  id?: string | null
  userId?: string | null
  deviceId?: string | null
  ipAddress?: string | null
  browserName?: string | null
  browserVersion?: string | null
  osName?: string | null
  osVersion?: string | null
  deviceType?: string | null
  clientVersion?: string | null
  manufacturer?: string | null
  model?: string | null
  sdkVersion?: string | null
  clientName?: string | null
  deviceName?: string | null
}

class DeviceInfo {
  /** @type {string[]} Fields to sanitize when loading from stored data */
  static stringFields = ['deviceId', 'clientVersion', 'manufacturer', 'model', 'sdkVersion', 'clientName', 'deviceName']

  id: string | null
  userId: string | null
  deviceId: string | null
  ipAddress: string | null

  // From User Agent (see: https://www.npmjs.com/package/ua-parser-js)
  browserName: string | null
  browserVersion: string | null
  osName: string | null
  osVersion: string | null
  deviceType: string | null

  // From client
  clientVersion: string | null
  manufacturer: string | null
  model: string | null
  sdkVersion: string | null // Android Only

  clientName: string | null
  deviceName: string | null

  constructor(deviceInfo: DeviceInfoInput | null = null) {
    this.id = null
    this.userId = null
    this.deviceId = null
    this.ipAddress = null

    this.browserName = null
    this.browserVersion = null
    this.osName = null
    this.osVersion = null
    this.deviceType = null

    this.clientVersion = null
    this.manufacturer = null
    this.model = null
    this.sdkVersion = null

    this.clientName = null
    this.deviceName = null

    if (deviceInfo) {
      this.construct(deviceInfo)
    }
  }

  construct(deviceInfo: DeviceInfoInput): void {
    for (const key in deviceInfo) {
      if ((deviceInfo as Record<string, unknown>)[key] !== undefined && (this as Record<string, unknown>)[key] !== undefined) {
        (this as Record<string, unknown>)[key] = DeviceInfo.stringFields.includes(key) ? stripAllTags((deviceInfo as Record<string, unknown>)[key] as string) : (deviceInfo as Record<string, unknown>)[key]
      }
    }
  }

  toJSON(): Partial<DeviceInfoInput> {
    const obj: DeviceInfoInput = {
      id: this.id,
      userId: this.userId,
      deviceId: this.deviceId,
      ipAddress: this.ipAddress,
      browserName: this.browserName,
      browserVersion: this.browserVersion,
      osName: this.osName,
      osVersion: this.osVersion,
      deviceType: this.deviceType,
      clientVersion: this.clientVersion,
      manufacturer: this.manufacturer,
      model: this.model,
      sdkVersion: this.sdkVersion,
      clientName: this.clientName,
      deviceName: this.deviceName
    }
    for (const key in obj) {
      if ((obj as Record<string, unknown>)[key] === null || (obj as Record<string, unknown>)[key] === undefined) {
        delete (obj as Record<string, unknown>)[key]
      }
    }
    return obj
  }

  get deviceDescription(): string {
    if (this.model) {
      // Set from mobile apps
      if (this.sdkVersion) return `${this.model} SDK ${this.sdkVersion} / v${this.clientVersion}`
      return `${this.model} / v${this.clientVersion}`
    }
    return `${this.osName} ${this.osVersion} / ${this.browserName}`
  }

  // When client doesn't send a device id
  getTempDeviceId(): string {
    const keys = [this.userId, this.browserName, this.browserVersion, this.osName, this.osVersion, this.clientVersion, this.manufacturer, this.model, this.sdkVersion, this.ipAddress].map((k) => k || '')
    return 'temp-' + Buffer.from(keys.join('-'), 'utf-8').toString('base64')
  }

  setData(ip: string | null, ua: UAParser | null, clientDeviceInfo: ClientDeviceInfo | null, serverVersion: string, userId: string): void {
    this.id = uuidv4()
    this.userId = userId
    this.deviceId = clientDeviceInfo?.deviceId || this.id
    this.ipAddress = ip || null

    this.browserName = ua?.browser.name || null
    this.browserVersion = ua?.browser.version || null
    this.osName = ua?.os.name || null
    this.osVersion = ua?.os.version || null
    this.deviceType = ua?.device.type || null

    this.clientVersion = stripAllTags(clientDeviceInfo?.clientVersion) || serverVersion
    this.manufacturer = stripAllTags(clientDeviceInfo?.manufacturer) || null
    this.model = stripAllTags(clientDeviceInfo?.model) || null
    this.sdkVersion = stripAllTags(clientDeviceInfo?.sdkVersion) || null

    this.clientName = stripAllTags(clientDeviceInfo?.clientName) || null
    if (this.sdkVersion) {
      if (!this.clientName) this.clientName = 'Abs Android'
      this.deviceName = `${this.manufacturer || 'Unknown'} ${this.model || ''}`
    } else if (this.model) {
      if (!this.clientName) this.clientName = 'Abs iOS'
      this.deviceName = `${this.manufacturer || 'Unknown'} ${this.model || ''}`
    } else if (this.osName && this.browserName) {
      if (!this.clientName) this.clientName = 'Abs Web'
      this.deviceName = `${this.osName} ${this.osVersion || 'N/A'} ${this.browserName}`
    } else if (!this.clientName) {
      this.clientName = 'Unknown'
    }

    if (!this.deviceId) {
      this.deviceId = this.getTempDeviceId()
    }
  }

  update(deviceInfo: DeviceInfo | DeviceInfoInput): boolean {
    const deviceInfoJson = (deviceInfo as DeviceInfo).toJSON ? (deviceInfo as DeviceInfo).toJSON() : (deviceInfo as DeviceInfoInput)
    const existingDeviceInfoJson = this.toJSON()

    let hasUpdates = false
    for (const key in deviceInfoJson) {
      if (['id', 'deviceId'].includes(key)) continue

      if ((deviceInfoJson as Record<string, unknown>)[key] !== (existingDeviceInfoJson as Record<string, unknown>)[key]) {
        (this as Record<string, unknown>)[key] = (deviceInfoJson as Record<string, unknown>)[key]
        hasUpdates = true
      }
    }

    for (const key in existingDeviceInfoJson) {
      if (['id', 'deviceId'].includes(key)) continue

      if ((existingDeviceInfoJson as Record<string, unknown>)[key] && !(deviceInfoJson as Record<string, unknown>)[key]) {
        (this as Record<string, unknown>)[key] = null
        hasUpdates = true
      }
    }

    return hasUpdates
  }
}

export = DeviceInfo
