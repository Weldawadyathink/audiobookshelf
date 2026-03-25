import Logger from '../../Logger'
import { areEquivalent, copyValue, isNullOrNaN } from '../../utils'

interface EreaderDeviceObject {
  name: string
  email: string
  availabilityOption: string
  users: string[]
}

interface EmailSettingsInput {
  host?: string | null
  port?: number
  secure?: boolean
  rejectUnauthorized?: boolean
  user?: string | null
  pass?: string | null
  testAddress?: string | null
  fromAddress?: string | null
  ereaderDevices?: Partial<EreaderDeviceObject>[]
}

interface TransportObject {
  host: string | null
  secure: boolean
  port?: number
  auth?: { user: string; pass: string }
  tls?: { rejectUnauthorized: boolean }
}

interface UserModel {
  id: string
  isAdminOrUp: boolean
  isUser: boolean
}

class EmailSettings {
  id: string
  host: string | null
  port: number
  secure: boolean
  rejectUnauthorized: boolean
  user: string | null
  pass: string | null
  testAddress: string | null
  fromAddress: string | null
  ereaderDevices: EreaderDeviceObject[]

  constructor(settings: EmailSettingsInput | null = null) {
    this.id = 'email-settings'
    this.host = null
    this.port = 465
    this.secure = true
    this.rejectUnauthorized = true
    this.user = null
    this.pass = null
    this.testAddress = null
    this.fromAddress = null
    this.ereaderDevices = []

    if (settings) {
      this.construct(settings)
    }
  }

  construct(settings: EmailSettingsInput): void {
    this.host = settings.host
    this.port = settings.port
    this.secure = !!settings.secure
    this.rejectUnauthorized = !!settings.rejectUnauthorized
    this.user = settings.user
    this.pass = settings.pass
    this.testAddress = settings.testAddress
    this.fromAddress = settings.fromAddress
    this.ereaderDevices = settings.ereaderDevices?.map((d) => ({ ...d } as EreaderDeviceObject)) || []

    // rejectUnauthorized added after v2.10.1 - defaults to true
    if (settings.rejectUnauthorized === undefined) {
      this.rejectUnauthorized = true
    }
  }

  toJSON(): EmailSettingsInput & { id: string } {
    return {
      id: this.id,
      host: this.host,
      port: this.port,
      secure: this.secure,
      rejectUnauthorized: this.rejectUnauthorized,
      user: this.user,
      pass: this.pass,
      testAddress: this.testAddress,
      fromAddress: this.fromAddress,
      ereaderDevices: this.ereaderDevices.map((d) => ({ ...d }))
    }
  }

  update(payload: Record<string, unknown> | null): boolean {
    if (!payload) return false

    if (payload.port !== undefined) {
      if (isNullOrNaN(payload.port)) payload.port = 465
      else payload.port = Number(payload.port)
    }
    if (payload.secure !== undefined) payload.secure = !!payload.secure
    if (payload.rejectUnauthorized !== undefined) payload.rejectUnauthorized = !!payload.rejectUnauthorized

    if (payload.ereaderDevices !== undefined && !Array.isArray(payload.ereaderDevices)) payload.ereaderDevices = undefined

    if ((payload.ereaderDevices as EreaderDeviceObject[])?.length) {
      // Validate ereader devices
      payload.ereaderDevices = (payload.ereaderDevices as EreaderDeviceObject[])
        .map((device) => {
          if (!device.name || !device.email) {
            Logger.error(`[EmailSettings] Update ereader device is invalid`, device)
            return null
          }
          if (!device.availabilityOption || !['adminOrUp', 'userOrUp', 'guestOrUp', 'specificUsers'].includes(device.availabilityOption)) {
            device.availabilityOption = 'adminOrUp'
          }
          if (device.availabilityOption === 'specificUsers' && !device.users?.length) {
            device.availabilityOption = 'adminOrUp'
          }
          if (device.availabilityOption !== 'specificUsers' && device.users?.length) {
            device.users = []
          }
          return device
        })
        .filter((d) => d)
    }

    let hasUpdates = false

    const json = this.toJSON()
    for (const key in json) {
      if (key === 'id') continue

      if (payload[key] !== undefined && !areEquivalent(payload[key], (json as unknown as Record<string, unknown>)[key])) {
        (this as Record<string, unknown>)[key] = copyValue(payload[key])
        hasUpdates = true
      }
    }

    return hasUpdates
  }

  getTransportObject(): TransportObject {
    const payload: TransportObject = {
      host: this.host,
      secure: this.secure
    }
    // Only set to true for port 465 (https://nodemailer.com/smtp/#tls-options)
    if (this.port !== 465) {
      payload.secure = false
    }
    if (this.port) payload.port = this.port
    if (this.user && this.pass !== undefined) {
      payload.auth = {
        user: this.user,
        pass: this.pass
      }
    }
    // Allow self-signed certs (https://nodemailer.com/smtp/#3-allow-self-signed-certificates)
    if (!this.rejectUnauthorized) {
      payload.tls = {
        rejectUnauthorized: false
      }
    }

    return payload
  }

  checkUserCanAccessDevice(device: EreaderDeviceObject, user: UserModel): boolean {
    let deviceAvailability = device.availabilityOption || 'adminOrUp'
    if (deviceAvailability === 'adminOrUp' && user.isAdminOrUp) return true
    if (deviceAvailability === 'userOrUp' && (user.isAdminOrUp || user.isUser)) return true
    if (deviceAvailability === 'guestOrUp') return true
    if (deviceAvailability === 'specificUsers') {
      let deviceUsers = device.users || []
      return deviceUsers.includes(user.id)
    }
    return false
  }

  /**
   * Get ereader devices accessible to user
   */
  getEReaderDevices(user: UserModel): EreaderDeviceObject[] {
    return this.ereaderDevices.filter((device) => this.checkUserCanAccessDevice(device, user))
  }

  /**
   * Get ereader device by name
   */
  getEReaderDevice(deviceName: string): EreaderDeviceObject | undefined {
    return this.ereaderDevices.find((d) => d.name === deviceName)
  }
}

export = EmailSettings
