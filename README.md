Garlmap
======

![icon](app/img/icon/128x128.png)

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
- There should be options to clear or hide irrelevant info in the playlist automatically
- Adding a group of songs to your queue in bulk should allow you to remove them in one go

## Getting started

You NEED to install MPV from [mpv.io](https://mpv.io) or your package manager,
otherwise Garlmap WON'T be able to play anything at all.
Now download a [release from here](https://github.com/Jelmerro/Garlmap/releases).

There is a ton of help included on the most right-hand pane of the application,
which you can always show the help in with `F1` regardless of current focus.
You can also find a lot of info by using the `--help` startup argument.

## Building

Please clone this repo and run `npm ci` then `npm start`.
You should now have Garlmap up and running from source,
next you can make your own executable builds using `npm run build`.
See `npm run` for other (build) options, the executables will be stored in `dist`.

## License

Garlmap is created by [Jelmer van Arnhem](https://github.com/Jelmerro).

You can copy or modify the code under the terms of the GPL3.0 or later versions.
For more information and legal terms, see the LICENSE file.
