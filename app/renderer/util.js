/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2021 Jelmer van Arnhem
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict"

const queryMatch = (e, query) => e.composedPath().find(el => {
    try {
        return el.matches(query)
    } catch {
        return false
    }
})

const keyMatch = (e, opts) => e.key === opts.key && e.ctrlKey === !!opts.ctrl
    && e.shiftKey === !!opts.shift && e.altKey === !!opts.alt
    && e.metaKey === !!opts.meta

const formatTime = totalSeconds => {
    let hours = Math.floor(totalSeconds / 3600)
    let minutes = Math.floor((totalSeconds - hours * 3600) / 60)
    let seconds = Math.floor(totalSeconds - hours * 3600 - minutes * 60)
    if (hours < 10) {
        hours = `0${hours}`
    }
    if (minutes < 10) {
        minutes = `0${minutes}`
    }
    if (seconds < 10) {
        seconds = `0${seconds}`
    }
    if (hours === "00") {
        return `&nbsp;${minutes}:${seconds}&nbsp;`
    }
    return `&nbsp;${hours}:${minutes}:${seconds}&nbsp;`
}

const resetWelcome = () => {
    document.getElementById("song-info").textContent = `Welcome to Garlmap

You can jump focus between the search section and playlist with F2 and F3.
No other sections are focusable in the traditional sense,
but they can be controlled with other shortcuts.
This section can be scrolled with F9 and F10, for example.
You can also display song lyrics here, by pressing F4,
which will happen automatically if they are available offline,
or you can bring back this help at any time with F1.
F5 and F6 are for play/pause and for stopping after the current track.
F7 and F8 are for moving to the previous and next track.
F11 will show the cover art in a large window.
F12 will open the development tools where you can find any runtime errors.

It's required to load a folder for Garlmap to play songs.
It will index and cache the info of them, so you can search it easily.
You can load a folder with Ctrl-O, by passing it on startup,
or by setting it using ENV vars as "GARLMAP_FOLDER".
If you just have a single music folder, I would recommend a GARLMAP_FOLDER env.
You can also set "GARLMAP_AUTO_LYRICS=true" to automatically download lyrics,
just as there are startup arguments for it (see --help) for details.

You can search for songs using the search section on the left.
These can be queued in the playlist individually, or as what is called a rule.
Rules are filters with a specific order and/or count that can queue in bulk.
For example, "album:Pinkerton artist:Weezer" can be added to the playlist,
this rule which will play the entire Pinkerton album by Weezer.
You can also open the rule and view the individual tracks.
The rules can be added at the end or immediately after the current.
The list of rules in the center can also consist of simple individual tracks,
but rules are the core of what gives Garlmap superpowers in the playlist.
There is one special rule at the bottom displayed in purple,
which will automatically be used if the playlist is done.
Songs will automatically be added to the playlist based on the fallback rule.

TODO explain how rules work

All song data and lyrics are cached for the next startup in a "cache" file,
either in ~/.config/Garlmap or %APPDATA%/Garlmap depending on your OS.
You can control if the cached should be read with --cache on startup,
or the GARLMAP_CACHE ENV var to one of: all, songs, lyrics, none.
Obviously you are free to delete the cache at any time if you want to,
just know that cache greatly speeds up parsing of large folders,
and greatly reduces the amount of requests to Genius if you want auto lyrics.
`.split("\n").map(l => l || "\n\n").join(" ")
}

module.exports = {queryMatch, keyMatch, formatTime, resetWelcome}
