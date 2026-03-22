/**
 * TODO: Add more fields
 * @see https://anansi-project.github.io/docs/comicinfo/intro
 */

interface SeriesItem {
  name: string
  sequence: string | null
}

interface ComicMetadataResult {
  title: string | null
  series: SeriesItem[]
  description: string | null
}

export const parse = (comicInfoJson: Record<string, unknown> | null | undefined): ComicMetadataResult | null => {
  if (!comicInfoJson?.ComicInfo) return null

  const comicInfo = comicInfoJson.ComicInfo as Record<string, string[] | undefined>
  const ComicSeries = comicInfo.Series?.[0]?.trim() || null
  const ComicNumber = comicInfo.Number?.[0]?.trim() || null
  const ComicSummary = comicInfo.Summary?.[0]?.trim() || null

  let title: string | null = null
  const series: SeriesItem[] = []
  if (ComicSeries) {
    series.push({ name: ComicSeries, sequence: ComicNumber })
    title = ComicSeries
    if (ComicNumber) title += ` ${ComicNumber}`
  }

  return { title, series, description: ComicSummary }
}
