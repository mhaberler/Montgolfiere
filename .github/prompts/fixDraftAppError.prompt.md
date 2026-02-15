---
name: fixDraftAppError
description: Fix Google Play draft app status errors in fastlane configuration
argument-hint: The fastlane file path or lane name (optional)
---

When encountering a Google Play API error stating "Only releases with status draft may be created on draft app", update the fastlane configuration to resolve the issue.

## Steps:

1. Locate all `upload_to_play_store` actions in the Fastfile
2. Change `release_status: "completed"` to `release_status: "draft"`
3. Add a comment explaining this is required for apps not yet approved by Google Play
4. Verify the change is applied to all relevant lanes (beta, beta_auto, etc.)

## Context:

Apps in draft status on Google Play Console can only create draft releases until Google approves the app for publishing. Once the app is approved and live on the store, the status can be changed back to "completed" for auto-publishing.

## Expected outcome:

The fastlane upload should succeed, creating a draft release in the internal testing track that can be manually promoted in the Google Play Console.
