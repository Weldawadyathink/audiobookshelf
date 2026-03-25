import Path from 'path'
import { getFileTimestampsWithIno, filePathToPOSIX } from '../../utils/fileUtils'
import globals from '../../utils/globals'
import FileMetadata from '../metadata/FileMetadata'

interface LibraryFileInput {
  ino?: string | null
  metadata?: ConstructorParameters<typeof FileMetadata>[0]
  isSupplementary?: boolean | null
  addedAt?: number | null
  updatedAt?: number | null
}

class LibraryFile {
  ino: string | null
  metadata: FileMetadata | null
  isSupplementary: boolean | null
  addedAt: number | null
  updatedAt: number | null

  constructor(file?: LibraryFileInput | null) {
    this.ino = null
    this.metadata = null
    this.isSupplementary = null
    this.addedAt = null
    this.updatedAt = null

    if (file) {
      this.construct(file)
    }
  }

  construct(file: LibraryFileInput): void {
    this.ino = file.ino ?? null
    this.metadata = new FileMetadata(file.metadata)
    this.isSupplementary = file.isSupplementary === undefined ? null : file.isSupplementary
    this.addedAt = file.addedAt ?? null
    this.updatedAt = file.updatedAt ?? null
  }

  toJSON() {
    return {
      ino: this.ino,
      metadata: this.metadata.toJSON(),
      isSupplementary: this.isSupplementary,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt,
      fileType: this.fileType
    }
  }

  clone(): LibraryFile {
    return new LibraryFile(this.toJSON())
  }

  get fileType(): string {
    if (globals.SupportedImageTypes.includes(this.metadata.format)) return 'image'
    if (globals.SupportedAudioTypes.includes(this.metadata.format)) return 'audio'
    if (globals.SupportedEbookTypes.includes(this.metadata.format)) return 'ebook'
    if (globals.TextFileTypes.includes(this.metadata.format)) return 'text'
    if (globals.MetadataFileTypes.includes(this.metadata.format)) return 'metadata'
    return 'unknown'
  }

  get isMediaFile(): boolean {
    return this.fileType === 'audio' || this.fileType === 'ebook'
  }

  get isEBookFile(): boolean {
    return this.fileType === 'ebook'
  }

  get isOPFFile(): boolean {
    return this.metadata.ext === '.opf'
  }

  async setDataFromPath(path: string, relPath: string): Promise<void> {
    var fileTsData = await getFileTimestampsWithIno(path)
    if (!fileTsData) return
    var fileMetadata = new FileMetadata()
    fileMetadata.setData(fileTsData)
    fileMetadata.filename = Path.basename(relPath)
    fileMetadata.path = filePathToPOSIX(path)
    fileMetadata.relPath = filePathToPOSIX(relPath)
    fileMetadata.ext = Path.extname(relPath)
    this.ino = fileTsData.ino
    this.metadata = fileMetadata
    this.addedAt = Date.now()
    this.updatedAt = Date.now()
  }
}

export = LibraryFile
