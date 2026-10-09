---
name: fixDraftAppError
description: Fix Google Play draft app status errors in the release workflow
argument-hint: The workflow file path (optional, default .github/workflows/app-release.yml)
---

When encountering a Google Play API error stating "Only releases with status draft may be created on draft app", update the release workflow to resolve the issue.

## Steps:

1. Locate the `r0adkll/upload-google-play` step (`play` job) in `.github/workflows/app-release.yml`
2. Set `status: draft` (not `completed`)
3. Keep `tracks: internal` (comma-separated; the deprecated `track:` must not be set alongside it)

## Expected Result:

The upload succeeds, creating a draft release in the internal testing track that can be manually promoted in the Google Play Console.
