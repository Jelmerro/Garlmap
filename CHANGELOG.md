CHANGELOG
=========

This document aims to represent all notable changes to Garlmap.
See the README.md or LICENSE file for more info and details about Garlmap and its license.
Links in the changelog are part of [github.com/Jelmerro/Garlmap](https://github.com/Jelmerro/Garlmap).
The [releases page](https://github.com/Jelmerro/Garlmap/releases) also contains the most important changes per release,
but the list below contains much more technical details.
The releases of Garlmap aim to follow [semantic versioning](https://semver.org).

## Unreleased

### Changed

- Switch back to Chromium's MediaSession API instead of dedicated MPRIS D-bus API as issues are fixed

### Versions

- Electron 30.0.2 (was 28.1.3)
- Chromium 124.0.6367.91 (was 120.0.6099.199)

## [2.1.0](https://github.com/Jelmerro/Garlmap/compare/2.0.1...2.1.0) - 2024-01-11

[code diff](https://github.com/Jelmerro/Garlmap/compare/2.0.1...2.1.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/2.1.0)

### Added

- Month and day support for dates in mp3 files

### Fixed

- Shell and occasional video being shown next to the program since mpv rework

### Versions

- Electron 28.1.3 (was 25.2.0)
- Chromium 120.0.6099.199 (was 114.0.5735.134)

## [2.0.1](https://github.com/Jelmerro/Garlmap/compare/2.0.0...2.0.1) - 2023-07-03

[code diff](https://github.com/Jelmerro/Garlmap/compare/2.0.0...2.0.1) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/2.0.1)

### Fixed

- New songs not being added to the cache correctly since 2.0.0

### Versions

- Electron 25.2.0 (was 25.1.1)
- Chromium 114.0.5735.134 (was 114.0.5735.106)

## [2.0.0](https://github.com/Jelmerro/Garlmap/compare/1.5.0...2.0.0) - 2023-06-15

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.5.0...2.0.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/2.0.0)

### Added

- Setting "autoplay" to automatically start playing audio on folder load and playlist open
- Setting "fallback" to use a custom fallback rule on startup
- Setting "apiKey" to optionally use the official Genius API if set (default remains to scrape)

### Changed

- Failed lyrics requests are now logged in the console so they can be inspected
- Only valid fields are now used to split strings in a query, making it possible search for : and = in fields
- Casing in field value now also makes it case sensitive

### Fixed

- Raise and Quit options not working in MPRIS menu
- Character "q" being used as a shortcut in settings panel preventing it from being used in setting values
- Genius API issues when using IPV6 by first trying to use IPV4 as the Genius API prefers that
- Lyrics selection not being able to be cleared by clicking on it when in fullscreen
- Autolyrics option always being on in last release

### Versions

- Electron 25.1.1 (was 24.1.1)
- Chromium 114.0.5735.106 (was 112.0.5615.50)

## [1.5.0](https://github.com/Jelmerro/Garlmap/compare/1.4.0...1.5.0) - 2023-04-14

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.4.0...1.5.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.5.0)

### Added

- Shortcuts to jump to a percentage or the start of the current song

### Changed

- Module glob in favor of built-in implementation
- Module string-similarity in favor of built-in implementation
- Module mpv in favor of built-in implementation
- Outdated MPRIS module in favor of own fork including dbus module fork

### Versions

- Electron 24.1.1 (was 23.1.1)
- Chromium 112.0.5615.50 (was 110.0.5481.104)

## [1.4.0](https://github.com/Jelmerro/Garlmap/compare/1.3.1...1.4.0) - 2023-02-23

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.3.1...1.4.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.4.0)

### Changed

- File watcher will now reload the cache file if it changes, meaning you can share the cache between instances in a synced folder

### Versions

- Electron 23.1.1 (was 22.0.0)
- Chromium 110.0.5481.104 (was 108.0.5359.62)

## [1.3.1](https://github.com/Jelmerro/Garlmap/compare/1.3.0...1.3.1) - 2022-12-10

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.3.0...1.3.1) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.3.1)

### Changed

- Add "mpv" as a dependency for pacman, deb and rpm releases
- Rpm and deb releases are now symlinked in /usr/bin/ correctly on updates after this one
- Time display no longer relies on innerHTML, making the app completely free of HTML modifications
- CSP no longer allows inline styling in the html

### Fixed

- Incorrect message for fallback rule
- Play/pause not toggling the icon when manually triggered
- Undefined being shown as title and artist in the "next up" fullscreen layout when track has no artist or title

### Versions

- Electron 22.0.0 (was 21.0.1)
- Chromium 108.0.5359.62 (was 106.0.5249.61)

## [1.3.0](https://github.com/Jelmerro/Garlmap/compare/1.2.1...1.3.0) - 2022-09-28

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.2.1...1.3.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.3.0)

### Added

- Import and export options for m3u/m3u8
- Fallback rule options "playback=list" and "playback=shuffle" to skip auto queueing and only play the existing list

### Changed

- Playlist importing is now much faster for large playlists
- Garlmap playlist format now only stores song paths and ids instead of entire info

### Fixed

- Fallback rule not working correctly with "order=albumshuffle"

### Versions

- Electron 21.0.1 (was 20.0.2)
- Chromium 106.0.5249.61 (was 104.0.5112.81)

## [1.2.1](https://github.com/Jelmerro/Garlmap/compare/1.2.0...1.2.1) - 2022-08-14

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.2.0...1.2.1) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.2.1)

### Fixed

- Released build issue that did not include html resources

### Versions

- Electron 20.0.2 (unnchanged)
- Chromium 104.0.5112.81 (unchanged)

## [1.2.0](https://github.com/Jelmerro/Garlmap/compare/1.1.0...1.2.0) - 2022-08-14

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.1.0...1.2.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.2.0)

### Added

- Support for setting the "lyrics" for instrumental songs to "[Instrumental]" automatically

### Changed

- Only include required assets in released builds

### Versions

- Electron 20.0.2 (was 20.0.0)
- Chromium 104.0.5112.81 (was 104.0.5112.65)

## [1.1.0](https://github.com/Jelmerro/Garlmap/compare/1.0.0...1.1.0) - 2022-08-02

[code diff](https://github.com/Jelmerro/Garlmap/compare/1.0.0...1.1.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.1.0)

### Added

- Separate temp data folder for cache and browser files in the system's temp dir

### Changed

- Devtools are now always undocked to prevent window size issues

### Fixed

- Cursor and hover styling of the fullscreen progress bar

### Versions

- Electron 20.0.0 (was 19.0.7)
- Chromium 104.0.5112.65 (was 102.0.5005.134)

## [1.0.0](https://github.com/Jelmerro/Garlmap/compare/0.4.0...1.0.0) - 2022-07-04

[code diff](https://github.com/Jelmerro/Garlmap/compare/0.4.0...1.0.0) - [releases](https://github.com/Jelmerro/Garlmap/releases/tag/1.0.0)

### Added

- Lyrics editor dialog with manual Genius search and textarea to edit the text
- Buttons for switching between help and various lyrics options and the editor
- Toggle for enabling or disabling Genius API requests (if disabled, folder and cache only)
- Support for other files besides mp3, most audio files and media containers are now supported
- Many additional fields to search for and filter on when queueing songs
- Silent success event for fetching the lyrics from Genius (only in event panel, start and failures still in bar)
- Shortcut to stop after the last song of the current rule, either with "S" in the playlist or "Shift-F6" globally
- Two column layout option for small screens with buttons to switch between sections
- Button to append selected song or the query as a rule and a button to make a query the fallback
- Date ordering to the query syntax using "order=date", which will sort songs on release date
- Ascending toggle to the query syntax using "asc=true" or "asc=no" etc., to enable/disable ascending order
- Date field now reads the song date and uses the song year as the fallback for it
- Originaldate field to parse and query, also uses a similar fallback on the originalyear
- Song info panel that shows all technical details about the current (with "Ctrl-i") or selected song (with "i")
- Devtools startup option to open the developments tools on startup (previously only manually with F12)
- Automatic scrolling/shifting of the lyrics based on the current track time (default off)
- Setting "shiftTimer" to enable the shifting of lyrics automatically on a delay after scrolling manually
- Settings editor to configure startup-only settings and more advanced settings

### Changed

- Fullscreen layout styling related to the "up next" notice and general margins
- Layout of the status line and selection colors
- Log an event for each failed file so you know that to do about it (only in the event panel, summary in the bar)
- Use dedicated MPRIS D-bus API when available instead of Chromium's MediaSession API
- Cache file is now named "cache.json" instead of just "cache" to prevent case insensitive file clash on Windows
- Files without title or artist will now use the song id (last part of the path) as display value
- Show a dialog before quitting for failed mpv startup
- Second try of lyrics fetching now also removes featuring/additional artists (as well as extras between brackets as before)
- Events are now directly visible in the event viewer, even if they are shown in the status bar later
- Shortcut for exporting the playlist is now Ctrl-t instead of the weird Ctrl-x that prevented "cut"
- Shortcut for importing the playlist is now Ctrl-r instead of Ctrl-i to make room for song info panel
- Fields "disc_total" and "track_total" are now named "disctotal" and "tracktotal"
- Minimum window size is now 320 instead of 700, because window resizing is improved
- Rule input field is now resizable and handles pasted newlines correctly
- Previous mode (search/playlist) is now restored when closing a panel, modal or the fullscreen layout
- Redundant caching folders generated by Electron are now deleted on quit to save storage space
- Icon color can now be styled with CSS variables like all other colors, either uses "--icons" or the "--primary" fallback

### Fixed

- Broken fullscreen layout after switching directly to focus elements from within fullscreen (e.g. with Tab)
- File load error file songs without cover art, src attribute is now removed instead of set to "null"
- Close button of the app not working on Windows
- Glob search for music files not resolving on Windows
- Directories ending in a valid file extension being moved to parsing stage instead of being filtered
- Sporadic newline issues in lyrics due to Genius response changes (by auto updating them)
- Incorrect middle mouse paste on fullscreen leave with the middle mouse
- Modals not being closed when clicking on the song lyrics in the background
- Lyrics disappearing in editor and fullscreen layout when switching to help in main layout

### Versions

- Electron 19.0.7 (was 18.1.0)
- Chromium 102.0.5005.134 (was 100.0.4896.127)

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
