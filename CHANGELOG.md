# Changelog

All notable changes to the Povery framework will be documented in this file.

## [Unreleased]

### Fixed
- Fixed an issue with stage name removal in API paths where paths containing the stage name as part of a resource path (e.g., `/dev/devices` when stage is `dev`) were incorrectly processed, resulting in invalid paths (e.g., `ices`).
- Improved stage name removal logic to only remove the stage prefix when it's followed by a slash and when the stage name is defined.

## [0.0.40] - Current Version

Initial documented version. 