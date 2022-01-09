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

const queryMatch = (e, query) => e?.composedPath?.().find(el => {
    try {
        return el.matches(query)
    } catch {
        return false
    }
})

const keyMatch = (e, opts) => e.key === opts.key && e.ctrlKey === !!opts.ctrl
    && e.shiftKey === !!opts.shift && e.altKey === !!opts.alt
    && e.metaKey === !!opts.meta

const formatTime = total => {
    if ([null, undefined].includes(total) || isNaN(Number(total))) {
        return ""
    }
    let hours = Math.floor(total / 3600)
    let minutes = Math.floor((total - hours * 3600) / 60)
    let seconds = Math.floor(total - hours * 3600 - minutes * 60)
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
        return `${minutes}:${seconds}`
    }
    return `${hours}:${minutes}:${seconds}`
}

const resetWelcome = () => {
    document.getElementById("song-info").textContent = `Welcome to Garlmap

You can jump focus between the search section and playlist with F2 and F3.
Alternatively you can use Ctrl-f or Ctrl-l for the search and playlist sections.
No other sections are focusable in the traditional sense,
but they can be controlled with other shortcuts.
This section can be scrolled with F9 and F10, for example.
You can also display song lyrics here, by pressing F4,
which will happen automatically if they are available offline,
or you can bring back this help at any time with F1.
F5 is for play/pause, and F6 for stopping after the current track.
F7 and F8 are for moving to the previous and next track.
F12 will open the development tools where you can find any runtime errors.
There are many more shortcuts, which are listed in most of the sections below.
When in doubt, the mouse can also be used to do most actions.

Startup options

It's required to load a folder for Garlmap to play songs.
It will index and cache the info of them, so you can search it easily.
You can load a folder by pressing Ctrl-o, or you can customize your settings.
There are many ways to do so, with env vars, a config file, or with arguments,
all of which are explained if you start Garlmap with the "--help" argument.

Syntax for queueing and searching

You can search for songs using the search section on the left.
These can be queued in the playlist individually, or as what is called a rule.
Rules are filters with a specific order and/or limit that can queue in bulk.
For example, "album:pinkerton artist:weezer" can be added to the playlist,
this rule which will play the entire Pinkerton album by Weezer.
You could also just search for "weezer pinker" or something and find it,
but the above is much more accurate if you have a large library.
There are many fields that can be used to search for songs based on their tags,
while others are specific to Garlmap for ordering or counting the query.
The full list is: "title", "artist", "album", "disc", "disc_total", "track",
"track_total", "lyrics", "duration", "date", "order" and "limit".
Feel free to add a lot more to Garlmap with a PR or make an issue for it.
You can search for anything inside a field based on regex, separated with ":".
Even spaces are allowed: "album:dark side of the moon" is an album name search.
Any text that is listed before any of these fields, will search in all fields:
"dark side" will match any song that has any field with "dark" and "side" in it,
even the lyrics are searched, if they are cached for a specific song.
For the number fields, such as "date", "duration" or "track",
it's also possible to specify a range like so: "date:1960-1975".
You can also use upercase letters in a field name to make it case sensitive,
as all searches are by default case insensitive: "Album:Dark Side" for example.
For the general search, if there are capital letters in it, it's case sensitive.
The default sort order "disk", which means it's sorted on path alphabetically,
is used for all queries, unless a custom "order" field is provided.
For example, you can change to order to "shuffle", to play the tracks randomly.
Another valid order is "alpha" which will sort by song title alphabetically.
Finally there is "albumshuffle", which will play albums shuffled,
while keeping the disc and track order intact for each album.
The "limit" field can be set to any number and will limit the amount of songs.

Search usage

You can focus the search section with either F3 or Ctrl-f,
and then type in any query as described in the paragraph above.
You can always jump to the search box with "Tab", regardless of current focus.
F3/Ctrl-f merely switch to this section, which might still have a song selected,
instead of immediately bringing the focus to the search box.
After entering a search, you can add the rule to the playlist in 3 ways:
- At the end of the playlist with "Enter"
- Immediately after the current rule/song with "Shift-Enter"
- As a fallback rule (if it has shuffle or albumshuffle order) with "Ctrl-Enter"
The entire query can be added as a rule to the playlist with these shortcuts,
which will automatically queue all matching tracks based on the rule.
Alternatively, you can scroll through the results with Ctrl-n and Ctrl-p,
or simply with the Arrow up and down keys to select individual songs.
While in the list, you can also use PageUp, PageDown, Home and End to navigate.
Once you have found the right track, you can add this single song with "Enter".
With "Shift-Enter" you can queue it immediately after the current rule.
You can also select tracks with the left mouse button,
middle-click it to add it to the playlist immediately after the current rule,
and finally right-click to add it at the end of the playlist.

Playlist usage

In the playlist view, you can see what is playing and based on which rule.
You can also open the rule in the playlist and view the individual tracks.
The rules can be added at the end or immediately after the current track.
The playlist can also include simple individual tracks with no specific rule,
but rules are the core of what gives Garlmap superpowers in the playlist.
There is one special rule at the bottom displayed in green: the fallback rule.
Songs will automatically be added to the playlist based on this fallback rule.
An upcoming song will have a temporary place in the playlist in a shade of gray,
and this upcoming song will be removed when a new rule or song is added.
If nothing is added, it will automatically become part of the playlist on play.
You can navigate the playlist view with the Arrow keys or hjkl,
or select a rule or track directly by clicking with the left mouse button on it.
On hover, a play icon will appear, which can be used to play a song right away.
Right-clicking will open/close a rule, or toggle stop after track on a song.
Stop after selected song can be toggled with "s", for which an icon will appear.
Middle-clicking on a song or rule will remove it from the playlist.
While in the playlist, you can also use PageUp, PageDown, Home and End.
You can also play the selected track right away with "Enter".
Using "c" you can move the selection to the song that is currently playing.
Finally, with "p" you can switch the position of the list between two places,
one for the current song, and the other for the currently selected song.

Caching

All song data and lyrics are cached for the next startup in a "cache" file,
either in ~/.config/Garlmap or %APPDATA%/Garlmap depending on your OS.
You can control if the cache should be read on startup using --cache,
or with the GARLMAP_CACHE ENV var set to one of: all, songs, lyrics, none.
Obviously you are free to delete the cache at any time if you want to,
just know that cache greatly speeds up parsing of large folders,
and greatly reduces the amount of requests to Genius if you want auto lyrics.
Don't expect miracles, it will still take multiple seconds to parse 10k+ songs,
but after startup there shouldn't be too many moments that freeze the app.

Volume control

The volume of the app is by default set to 100% on startup,
and can be seen on the top left below the player controls.
It's worth noting that the maximum volume is 130%, which is why it's not maxed.
You can use the mouse to interact with the slider as you would expect,
but there are more options to change the volume.
You may right-click the volume slider to reset the volume to 100% at all times.
Alternatively, you can middle-click it, to toggle the mute state,
which will change the bar color and keep the volume stored for when you unmute.
The keyboard shortcuts for this are Ctrl-minus and Ctrl-plus for volume change,
and you can do Ctrl-m to toggle mute, all of which is reflected in the bar.
Finally you can reset the volume by pressing Ctrl-0 on the keyboard.
`.split("\n").map(l => l || "\n\n").join(" ")
    document.getElementById("song-info").scrollTo(0, 0)
}

const isDirectory = loc => {
    const {statSync} = require("fs")
    try {
        return statSync(loc).isDirectory()
    } catch {
        return false
    }
}

const joinPath = (...args) => {
    const {join, resolve} = require("path")
    return resolve(join(...args))
}

const basePath = (...args) => {
    const {basename} = require("path")
    return basename(...args)
}

const readJSON = loc => {
    const {readFileSync} = require("fs")
    try {
        return JSON.parse(readFileSync(loc).toString())
    } catch {
        return null
    }
}

const readFile = loc => {
    const {readFileSync} = require("fs")
    try {
        return readFileSync(loc).toString()
    } catch {
        return null
    }
}

const writeJSON = (loc, data) => {
    const {writeFileSync} = require("fs")
    try {
        writeFileSync(loc, JSON.stringify(data))
        return true
    } catch {
        return false
    }
}

module.exports = {
    basePath,
    formatTime,
    isDirectory,
    joinPath,
    keyMatch,
    queryMatch,
    readFile,
    readJSON,
    resetWelcome,
    writeJSON
}
