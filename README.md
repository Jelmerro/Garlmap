Garlmap
======

Garlmap is the Gapless Almighty Rule-based Logical Mpv Audio Player.

- Gapless playback for a wide range of formats
  - No clicks or stops between different tracks, even for mp3
- Almighty knowledge of your library and it's tags
  - It knows a lot, so it rarely needs internet to find answers
- Rule-based playlist management and auto queueing
  - Search with filters, custom queries and build a dynamic playlist
- Logical in form and function, no hidden magic
  - A base folder, your own queries and a playlist, that's all
- Mpv is used as the underlying technology to play the files themselves
  - Requires [mpv](https://mpv.io) to be installed and in the path.
- Audio only playback, no video support or other second-grade features
- Player that plays music >.>

## Why

- Listening to music locally should allow you to define rules for automatic playback
- Queuing that one album from a specific artist after the current song should be easy
- Lyrics and gapless playback are essential features for active listening to music
- Completely offline, unless told to fetch stuff, which should be cached until you tell it not to
- Re-ordering songs to play should be configurable for that specific set of songs
- Removing multiple songs from your queue should not require you to remove each song individually

## Building

- Install MPV from [mpv.io](https://mpv.io) or your package manager
- Clone this repo and run `npm ci` then `npm run build`
- Run or install the executables/packages from the `dist` folder

## License

Garlmap is created by [Jelmer van Arnhem](https://github.com/Jelmerro).

You can copy or modify the code under the terms of the GPL3.0 or later versions.
For more information and legal terms, see the LICENSE file.
