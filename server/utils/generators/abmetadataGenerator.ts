import Logger from '../../Logger'
import * as parseSeriesString from '../parsers/parseSeriesString'

interface ChapterInput {
  start: unknown
  end: unknown
  title: unknown
}

interface Chapter {
  id: number
  start: number
  end: number
  title: string
}

export function parseJson(text: string): Record<string, unknown> | null {
  try {
    const abmetadataData: Record<string, unknown> = JSON.parse(text)

    // Old metadata.json used nested "metadata"
    if (abmetadataData.metadata) {
      for (const key in abmetadataData.metadata as Record<string, unknown>) {
        if ((abmetadataData.metadata as Record<string, unknown>)[key] === undefined) continue
        let newModelKey = key
        if (key === 'feedUrl') newModelKey = 'feedURL'
        else if (key === 'imageUrl') newModelKey = 'imageURL'
        else if (key === 'itunesPageUrl') newModelKey = 'itunesPageURL'
        else if (key === 'type') newModelKey = 'podcastType'
        abmetadataData[newModelKey] = (abmetadataData.metadata as Record<string, unknown>)[key]
      }
    }
    delete abmetadataData.metadata

    if ((abmetadataData.series as unknown[])?.length) {
      abmetadataData.series = [...new Set((abmetadataData.series as (string | null | undefined)[]).map((t) => t?.trim()).filter((t): t is string => !!t))]
      abmetadataData.series = (abmetadataData.series as string[]).map((series) => parseSeriesString.parse(series))
    }
    // clean tags & remove dupes
    if ((abmetadataData.tags as unknown[])?.length) {
      abmetadataData.tags = [...new Set((abmetadataData.tags as (string | null | undefined)[]).map((t) => t?.trim()).filter((t): t is string => !!t))]
    }
    if ((abmetadataData.chapters as unknown[])?.length) {
      abmetadataData.chapters = cleanChaptersArray(abmetadataData.chapters as ChapterInput[], abmetadataData.title as string)
    }
    // clean remove dupes
    if ((abmetadataData.authors as unknown[])?.length) {
      abmetadataData.authors = [...new Set((abmetadataData.authors as (string | null | undefined)[]).map((t) => t?.trim()).filter((t): t is string => !!t))]
    }
    if ((abmetadataData.narrators as unknown[])?.length) {
      abmetadataData.narrators = [...new Set((abmetadataData.narrators as (string | null | undefined)[]).map((t) => t?.trim()).filter((t): t is string => !!t))]
    }
    if ((abmetadataData.genres as unknown[])?.length) {
      abmetadataData.genres = [...new Set((abmetadataData.genres as (string | null | undefined)[]).map((t) => t?.trim()).filter((t): t is string => !!t))]
    }
    return abmetadataData
  } catch (error) {
    Logger.error(`[abmetadataGenerator] Invalid metadata.json JSON`, error)
    return null
  }
}

function cleanChaptersArray(chaptersArray: ChapterInput[], mediaTitle: string): Chapter[] | null {
  const chapters: Chapter[] = []
  let index = 0
  for (const chap of chaptersArray) {
    if (chap.start === null || isNaN(chap.start as number)) {
      Logger.error(`[abmetadataGenerator] Invalid chapter start time ${chap.start} for "${mediaTitle}" metadata file`)
      return null
    }
    if (chap.end === null || isNaN(chap.end as number)) {
      Logger.error(`[abmetadataGenerator] Invalid chapter end time ${chap.end} for "${mediaTitle}" metadata file`)
      return null
    }
    if (!chap.title || typeof chap.title !== 'string') {
      Logger.error(`[abmetadataGenerator] Invalid chapter title ${chap.title} for "${mediaTitle}" metadata file`)
      return null
    }

    chapters.push({
      id: index++,
      start: chap.start as number,
      end: chap.end as number,
      title: chap.title
    })
  }
  return chapters
}
