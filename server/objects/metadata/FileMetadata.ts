interface FileMetadataInput {
  filename?: string | null
  ext?: string | null
  path?: string | null
  relPath?: string | null
  size?: number | null
  mtimeMs?: number | null
  ctimeMs?: number | null
  birthtimeMs?: number | null
  [key: string]: unknown
}

class FileMetadata {
  filename: string | null
  ext: string | null
  path: string | null
  relPath: string | null
  size: number | null
  mtimeMs: number | null
  ctimeMs: number | null
  birthtimeMs: number | null
  wasModified: boolean

  constructor(metadata?: FileMetadataInput | null) {
    this.filename = null
    this.ext = null
    this.path = null
    this.relPath = null
    this.size = null
    this.mtimeMs = null
    this.ctimeMs = null
    this.birthtimeMs = null

    if (metadata) {
      this.construct(metadata)
    }

    // Temp flag used in scans
    this.wasModified = false
  }

  construct(metadata: FileMetadataInput): void {
    this.filename = metadata.filename ?? null
    this.ext = metadata.ext ?? null
    this.path = metadata.path ?? null
    this.relPath = metadata.relPath ?? null
    this.size = metadata.size ?? null
    this.mtimeMs = metadata.mtimeMs ?? null
    this.ctimeMs = metadata.ctimeMs ?? null
    this.birthtimeMs = metadata.birthtimeMs ?? null
  }

  toJSON(): FileMetadataInput {
    return {
      filename: this.filename,
      ext: this.ext,
      path: this.path,
      relPath: this.relPath,
      size: this.size,
      mtimeMs: this.mtimeMs,
      ctimeMs: this.ctimeMs,
      birthtimeMs: this.birthtimeMs
    }
  }

  clone(): FileMetadata {
    return new FileMetadata(this.toJSON())
  }

  get format(): string {
    if (!this.ext) return ''
    return this.ext.slice(1).toLowerCase()
  }
  get filenameNoExt(): string {
    return this.filename.replace(this.ext, '')
  }

  update(payload: Record<string, unknown>): boolean {
    var hasUpdates = false
    for (const key in payload) {
      if ((this as Record<string, unknown>)[key] !== undefined && (this as Record<string, unknown>)[key] !== payload[key]) {
        (this as Record<string, unknown>)[key] = payload[key]
        hasUpdates = true
      }
    }
    return hasUpdates
  }

  setData(payload: Record<string, unknown>): void {
    for (const key in payload) {
      if ((this as Record<string, unknown>)[key] !== undefined) {
        (this as Record<string, unknown>)[key] = payload[key]
      }
    }
  }
}

export = FileMetadata
