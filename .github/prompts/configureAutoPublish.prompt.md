---
name: configureAutoPublish
description: Configure automatic app store release publishing in CI/CD pipelines
argument-hint: The app store platform (e.g., Google Play, TestFlight) and configuration file
---

Configure automatic release publishing for app stores in CI/CD automation tools (fastlane, etc.), accounting for platform-specific requirements and approval workflows.

## Analysis Steps:

1. **Identify the current app status** on the app store platform:
   - New/draft apps not yet approved by the platform
   - Apps already approved and published (even to testing tracks)

2. **Review the deployment configuration** to determine:
   - Current release status setting (draft, completed, etc.)
   - Target distribution track (internal, alpha, beta, production)
   - Auto-publishing vs manual promotion requirements

3. **Explain platform-specific constraints**:
   - Initial submission requirements (manual approval, review process)
   - Post-approval automation capabilities
   - Staged rollout options if available

4. **Provide actionable guidance**:
   - What to do immediately (manual steps required)
   - How to enable full automation after approval
   - Configuration changes needed for auto-publishing
   - Optional advanced features (staged rollouts, conditional releases)

## Expected Output:

- Clear explanation of current status and why automation may be limited
- Step-by-step instructions for manual promotion (if required)
- Configuration changes for enabling auto-publishing post-approval
- Code examples showing before/after configuration
- Links to relevant platform documentation

## Common Scenarios:

- **Google Play**: Draft apps require `release_status: "draft"` → switch to `"completed"` after approval
- **TestFlight**: Automatic approval possible for internal testers, external requires review
- **Staged rollouts**: Percentage-based gradual deployment options
