CHANGELOG
=========

This document aims to represent all notable changes to Garlmap.
See the README.md or LICENSE file for more info and details about Garlmap and it's license.
Links in the changelog are part of [github.com/Jelmerro/Garlmap](https://github.com/Jelmerro/Garlmap).
The [releases page](https://github.com/Jelmerro/Garlmap/releases) also contains the most important changes per release,
but the list below contains much more technical details.
The releases of Garlmap aim to follow [semantic versioning](https://semver.org).

## Unreleased

### Added

- Lyrics editor dialog with manual Genius search and textarea to edit the text
- Buttons for switching between help and various lyrics options and the editor
- Toggle for enabling or disabling Genius API requests (if disabled, folder and cache only)

### Changed

- Fullscreen layout styling related to the "up next" notice and general margins
- Layout of the status line and selection colors

### Fixed

- Broken fullscreen layout after switching directly to focus elements from within fullscreen (e.g. with Tab)

### Versions

- Electron 18.2.0 (was 18.1.0)
- Chromium 100.0.4896.143 (was 100.0.4896.127)

## [0.4.0](https://github.com/Jelmerro/Garlmap/compare/0.3.0...0.4.0) - 2022-04-27

[code diff](https://github.com/Jelmerro/Garlmap/compare/0.3.0...0.4.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/0.4.0)

### Added

- Home/End to scroll to the start or end quickly in the playlist
- PageUp/PageDown keys in both the playlist and the search, optionally moving the selection if Ctrl is held
- Scanner for local files and folders to find lyrics there before fetching from Genius if not in cache
- Fullscreen layouts (one to hide system frames/menus and one using a minimal layout)
- Relative seeking using Ctrl-[ and Ctrl-] as well as longer seeking with Ctrl-{ and Ctrl-}
- Option to dump/export the lyrics in a "Lyrics" folder relative to the base folder, which is read by Garlmap
- Events panel that shows all previous events/notifications

### Changed

- Playlist is now also scrolled after appending if enabled
- Selecting different songs in the playlist with keys no longer requires a re-render
- Refactor keyboard input handling, which is more stable and robust as well as more readable
- Searchbox input keys now work similar to other focus elements, which makes inputs faster
- Notifications/events below now appear in order and are readable for a fixed amount of time

### Fixed

- Using = in the fallback rule not working
- Map file errors in the console by applying default devtool settings
- Stop after current not working when called from system menu

### Versions

- Electron 18.1.0 (was 17.0.0)
- Chromium 100.0.4896.127 (was 98.0.4758.82)

## [0.3.0](https://github.com/Jelmerro/Garlmap/compare/0.2.0...0.3.0) - 2022-02-10

[code diff](https://github.com/Jelmerro/Garlmap/compare/0.2.0...0.3.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/0.3.0)

### Changed

- Always append single songs as a song instead of a rule with just one song
- Display the clean welcome text more often in the header instead of an empty song title
- Check if cached files are still available on disk before using them in the library
- Make cache=none work again

### Fixed

- Broken AppImage build

### Versions

- Electron 17.0.0 (unchanged)
- Chromium 98.0.4758.82 (unchanged)

## [0.2.0](https://github.com/Jelmerro/Garlmap/compare/0.1.0...0.2.0) - 2022-02-03

[code diff](https://github.com/Jelmerro/Garlmap/compare/0.1.0...0.2.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/0.2.0)

### Added

- Startup option for custom mpv location
- Mac support for releases
- Buttons for auto lyrics, open folder, import, export and save settings
- Mouse hover styling to know better what can be clicked and where you are

### Changed

- Column layout on small windows to be more responsive
- Mouse highlighting and playing no longer requires a re-render
- Caching to be more consistent with different base folders
- Lyrics searching to work for remixes and such (by stripping parts between brackets on 2nd search)
- Mpv wrapper package to a more lightweight package that's just a json ipc wrapper
- App no longer attempts to listen for actions during folder scan (it's frozen and busy anyway)

### Fixed

- Auto close hiding individual songs in the playlist
- Lyrics of the previous song being shown if they are fetch too late
- Second folder open after starting not working

### Versions

- Electron 17.0.0 (was 17.0.0-beta.8)
- Chromium 98.0.4758.82 (was 98.0.4758.11)

## [0.1.0](https://github.com/Jelmerro/Garlmap/compare/2e0aac2de225d53009023a413690ed3d8a992822...0.1.0) - 2022-01-28

[code diff](https://github.com/Jelmerro/Garlmap/compare/2e0aac2de225d53009023a413690ed3d8a992822...0.1.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/0.1.0)

### Added

- Initial project structure and files
- Auto lyrics and cover art display
- Basic shortcuts and query searchbox
- Caching of song data
- Stop after current track
- Basic playlist features with auto-options

### Versions

- Electron 17.0.0-beta.8
- Chromium 98.0.4758.11
