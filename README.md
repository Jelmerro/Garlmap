Garlmap
======

![icon](app/img/icon/128x128.png)

Garlmap is the Gapless Almighty Rule-based Logical Mpv Audio Player.

- Gapless playback for a wide range of formats
  - No clicks or stops between different tracks, even for mp3
- Almighty knowledge of your library and its tags
  - It knows a lot, so it rarely needs internet to find answers
- Rule-based playlist management and auto queueing
  - Search with filters, custom queries and build a dynamic playlist
- Logical in form and function, no hidden magic
  - A base folder, your own queries and a playlist, that's all
- [Mpv](https://mpv.io) is used as the underlying technology to play the files
- Audio only playback, no video support or other second-grade features
- Player that plays music >.>

## Features

- Listening to music locally should allow you to define rules for automatic playback
- Queuing that one album from a specific artist after the current song should be easy
- Lyrics and gapless playback are essential features for active listening to music
- Completely offline, unless told to fetch stuff, which should be cached until you tell it not to
- Re-ordering songs to play should be configurable for that specific set of songs
- There should be options to clear or hide irrelevant info in the playlist automatically
- Adding a group of songs to your queue in bulk should allow you to remove them in one go

See what's changed recently by viewing the [changelog](CHANGELOG.md).

## Install

### [Github](https://github.com/Jelmerro/Garlmap/releases)

Download a stable installer or executable for your platform from Github.

You should install mpv from [mpv.io](https://mpv.io) or your package manager,
then add mpv to your path, or use the `--mpv` option.

### [Fedora](https://jelmerro.nl/fedora)

I host a custom Fedora repository that you can use for automatic updates.

```bash
sudo dnf config-manager addrepo --from-repofile=https://jelmerro.nl/fedora/jelmerro.repo
sudo dnf install garlmap
```

## Contribute

You can support my work on [ko-fi](https://ko-fi.com/Jelmerro) or [Github sponsors](https://github.com/sponsors/Jelmerro).
Another way to help is to report issues or suggest new features.
Please try to follow the linter styling when developing, see `npm run lint`.
For an example vimrc that can auto-format based on the included linters,
you can check out my personal [vimrc](https://github.com/Jelmerro/vimrc).

## Building

To create your own builds or run from source, you need to install [Node.js](https://nodejs.org).
Please clone or download this repo and run `npm ci` then `npm start`.
You can make your own executable builds using `node build`.
See `node build --help` for other options, the builds will be stored in `dist`.
If you plan to contribute, please follow the included linter, see `npm run lint`.
