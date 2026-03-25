// @ts-nocheck
import h from 'htmlparser2'
import Logger from '../../Logger'

interface OPMLFeed {
  title: string
  feedUrl: string
}

export function parse(opmlText: string): OPMLFeed[] {
  var feeds: OPMLFeed[] = []
  var parser = new h.Parser({
    onopentag: (name, attribs) => {
      if (name === 'outline' && attribs.type === 'rss') {
        if (!attribs.xmlurl) {
          Logger.error('[parseOPML] Invalid opml outline tag has no xmlurl attribute')
        } else {
          feeds.push({
            title: attribs.title || attribs.text || '',
            feedUrl: attribs.xmlurl
          })
        }
      }
    }
  })
  parser.write(opmlText)
  return feeds
}
