Questions for ABS maintainers

- Mixed typescript transition suitable, or develop with TS and convert back to JS+JSDOC
- Is a single permanent access token suitable for auth?
- Do we want the api to be almost entirely read-only? (Potentially have reading status update, but ignore the "archive" requests from kobo devices)
- Do we want selective sync like the shelves sync in calibre-web? My opinion is no, sync the entire library. Kobo devices already only download the requested books.
