---
"@wc-toolkit/jsx-types": minor
---

Append `| undefined` to all optional property types for `exactOptionalPropertyTypes` compatibility

Generated types now always append `| undefined` to optional props, event
handlers, CSS custom properties, and global props/events so they accept
explicit `undefined` values under TypeScript's `exactOptionalPropertyTypes`
flag. This is a no-op when the flag is off. Multi-line `globalEvents`
entries are now handled correctly via brace-depth tracking.
