import FileMetadata from '../metadata/FileMetadata'

interface EBookFileInput {
  ino?: string | null
  metadata?: ConstructorParameters<typeof FileMetadata>[0]
  ebookFormat?: string | null
  addedAt?: number | null
  updatedAt?: number | null
}

interface LibraryFileData {
  ino: string
  metadata: FileMetadata
}

class EBookFile {
  ino: string | null
  metadata: FileMetadata | null
  ebookFormat: string | null
  addedAt: number | null
  updatedAt: number | null

  constructor(file?: EBookFileInput | null) {
    this.ino = null
    this.metadata = null
    this.ebookFormat = null
    this.addedAt = null
    this.updatedAt = null

    if (file) {
      this.construct(file)
    }
  }

  construct(file: EBookFileInput): void {
    this.ino = file.ino ?? null
    this.metadata = new FileMetadata(file.metadata)
    this.ebookFormat = file.ebookFormat || this.metadata.format
    this.addedAt = file.addedAt ?? null
    this.updatedAt = file.updatedAt ?? null
  }

  toJSON() {
    return {
      ino: this.ino,
      metadata: this.metadata.toJSON(),
      ebookFormat: this.ebookFormat,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt
    }
  }

  get isEpub(): boolean {
    return this.ebookFormat === 'epub'
  }

  setData(libraryFile: LibraryFileData): void {
    this.ino = libraryFile.ino
    this.metadata = libraryFile.metadata.clone()
    this.ebookFormat = libraryFile.metadata.format
    this.addedAt = Date.now()
    this.updatedAt = Date.now()
  }

  updateFromLibraryFile(libraryFile: LibraryFileData): boolean {
    var hasUpdated = false

    if (this.metadata.update(libraryFile.metadata.toJSON())) {
      hasUpdated = true
    }

    if (this.ebookFormat !== libraryFile.metadata.format) {
      this.ebookFormat = libraryFile.metadata.format
      hasUpdated = true
    }

    return hasUpdated
  }
}

export = EBookFile
