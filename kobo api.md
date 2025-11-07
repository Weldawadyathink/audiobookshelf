Questions for ABS maintainers

- Mixed typescript transition suitable, or develop with TS and convert back to JS+JSDOC
- Is a single permanent access token suitable for auth?
- Do we want the api to be almost entirely read-only? (Potentially have reading status update, but ignore the "archive" requests from kobo devices)
- Do we want selective sync like the shelves sync in calibre-web? My opinion is no, sync the entire library. Kobo devices already only download the requested books.

Basic sync used endpoints:
  - GET /v1/affiliate
    Sends platformID and SerialNumber as query parameters
    Returns 400 {"ResponseStatus":{"ErrorCode":"ArgumentException","Message":"Invalid token version."}}
  - GET /v1/initialization
    Returns 400 {"ResponseStatus":{"ErrorCode":"ArgumentException","Message":"Invalid token version."}}
  - GET /v1/user/profile
    Sends a much more complex bearer token
    Returns 200, with json data about user profile
  - GET /v1/user/loyalty/benefits
    Returns 200 with json data about VIP points
  - GET /v1/products/books/subscriptions
    Returns 200 with json data about kobo plus
  - GET /v1/deals
    Returns 200 with json about user deals
  - GET /v1/assets
    Returns HTTP 304 not modified a few times
  - POST /v1/analytics/gettests
    Returns 200 {"Result":"Success","TestKey":"ba2427f1-101b-4ccb-954c-325900fe6733","Tests":{}}
  - GET /v1/library/sync
    Includes long x-kobo-synctoken header
    query: {"Filter":"ALL","DownloadUrlFilter":"Generic,Android","PrioritizeRecentReads":"true"}
    Returns 200 with empty data (nothing to sync)
  - GET /v1/user/wishlist
    Returns 200 {"TotalCountByProductType":{},"Items":[],"ItemCount":0,"TotalPageCount":0,"TotalItemCount":0,"CurrentPageIndex":0,"ItemsPerPage":100,"VersionCode":2}
  - GET /v1/products/books/external/od_#######,od_######
    Overdrive rental books?
    Returns 200 with a bunch of json data, including download urls
  - GET /v1/products/books/series/:uuid
    Returns 200 {"Items":[],"ItemCount":0,"TotalPageCount":0,"TotalItemCount":0,"CurrentPageIndex":0,"ItemsPerPage":100,"Filters":{"KoboLoveEnabled":["True","False"],"SubscriptionsAvailable":["True","False"]},"VersionCode":2}
    Stale series id from calibre web sync?
  - GET /v1/user/recommendations
    Returns 200 {"Items":[],"ItemCount":0,"TotalPageCount":0,"TotalItemCount":0,"CurrentPageIndex":0,"ItemsPerPage":50,"Filters":{"SubscriptionsAvailable":["True","False"]},"VersionCode":2}
  - POST /v1/analytics/event
    body: a bunch of json data about the device and library
    Returns 200 {"Result":"Success","AcceptedEvents":["8a6fb224-f461-45d7-9cbb-34a52e8b27f0","76f0c39a-5faf-49e2-9ed2-0050fba7fe63"],"RejectedEvents":{}}
  - GET /v1/products/:uuid/nextread
    Returns 200 with a bunch of json data. Includes download to EPUB3_SAMPLE books
    Sends a few of these requests out
