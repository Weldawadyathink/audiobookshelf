// Global variable augmentation for audiobookshelf server.
// Assigned in index.js and server/Server.js.

declare global {
  var appRoot: string
  var isWin: boolean
  var ConfigPath: string
  var MetadataPath: string
  var RouterBasePath: string
  var Source: string
  var XAccel: string | undefined
  var AllowCors: boolean
  var DisableSsrfRequestFilter: ((url: string) => boolean) | undefined
  var PodcastDownloadTimeout: number
  var MaxFailedEpisodeChecks: number
  // Replace Record<string, unknown> with a proper interface when ServerSettings is converted
  var ServerSettings: Record<string, unknown>
}

export {}
