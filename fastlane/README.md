fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### show_version

```sh
[bundle exec] fastlane show_version
```



### bump

```sh
[bundle exec] fastlane bump
```

Bump versions for both platforms

----


## iOS

### ios sync_certificates

```sh
[bundle exec] fastlane ios sync_certificates
```

Sync certificates and profiles

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and deploy to TestFlight

----


## Android

### android test_api

```sh
[bundle exec] fastlane android test_api
```



### android release_aab

```sh
[bundle exec] fastlane android release_aab
```

Build Android AAB locally with release signing

### android beta

```sh
[bundle exec] fastlane android beta
```

Deploy a new beta build to Google Play

### android beta_auto

```sh
[bundle exec] fastlane android beta_auto
```

Build and auto-publish to internal testing

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
