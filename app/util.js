/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2021-2022 Jelmer van Arnhem
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

const displayNotificationStack = []
let notificationReady = true

const notify = (msg, type = "err", linger = true) => {
    let color = "var(--tertiary)"
    if (type.startsWith("info")) {
        color = "var(--primary)"
    }
    if (type.startsWith("success")) {
        color = "var(--secondary)"
    }
    const event = {color, msg, "time": new Date(), type}
    appendEventToHistory(event)
    if (linger) {
        displayNotificationStack.push(event)
        displayNotificationTimer()
    }
}

const displayNotificationTimer = () => {
    if (notificationReady) {
        notificationReady = false
    } else {
        return
    }
    const currentNotify = displayNotificationStack.shift()
    if (!currentNotify) {
        document.getElementById("status-notify").style.color = ""
        document.getElementById("status-notify").textContent
            = "No current events"
        notificationReady = true
        return
    }
    document.getElementById("status-notify").style.color = currentNotify.color
    document.getElementById("status-notify").textContent = currentNotify.msg
    setTimeout(() => {
        notificationReady = true
        displayNotificationTimer()
    }, 4000)
}

const appendEventToHistory = ev => {
    const event = document.createElement("div")
    event.classList.add("event")
    const eventDate = document.createElement("span")
    eventDate.classList.add("date")
    eventDate.textContent = formatDate(ev.time)
    event.appendChild(eventDate)
    const eventTitle = document.createElement("span")
    eventTitle.classList.add("title")
    eventTitle.style.color = ev.color
    eventTitle.textContent = ev.msg
    event.appendChild(eventTitle)
    document.getElementById("events-list").appendChild(event)
}

const padZero = num => {
    if (num < 10) {
        return `0${num}`
    }
    return num
}

const formatDate = d => `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${
    padZero(d.getDate())} ${padZero(d.getHours())}:${padZero(d.getMinutes())}:${
    padZero(d.getSeconds())}`

const isDirectory = loc => {
    const {statSync} = require("fs")
    try {
        return statSync(loc).isDirectory()
    } catch {
        return false
    }
}

const isFile = loc => {
    const {statSync} = require("fs")
    try {
        return statSync(loc).isFile()
    } catch {
        return false
    }
}

const joinPath = (...args) => {
    const {join, resolve} = require("path")
    if (process.platform === "win32") {
        return resolve(join(...args)).replace(/\\/g, "/")
    }
    return resolve(join(...args))
}

const dirName = (...args) => {
    const {dirname} = require("path")
    return dirname(...args)
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

const writeJSON = (loc, data, indent = null) => {
    const {writeFileSync} = require("fs")
    try {
        writeFileSync(loc, JSON.stringify(data, null, indent))
        return true
    } catch {
        return false
    }
}

const writeFile = (loc, data) => {
    const {writeFileSync} = require("fs")
    try {
        writeFileSync(loc, data)
        return true
    } catch {
        return false
    }
}

const makeDir = loc => {
    try {
        const {mkdirSync} = require("fs")
        mkdirSync(loc, {"recursive": true})
        return true
    } catch {
        // Will return false as it was unsuccessful
    }
    return false
}

const deleteFolder = loc => {
    try {
        const {rmSync} = require("fs")
        rmSync(loc, {"force": true, "recursive": true})
        return true
    } catch {
        // Will return false as it was unsuccessful
    }
    return false
}

const deleteFile = loc => {
    try {
        const {unlinkSync} = require("fs")
        unlinkSync(loc)
        return true
    } catch {
        // Will return false as it was unsuccessful
    }
    return false
}

const resetWelcome = () => {
    document.getElementById("song-info").textContent = `Welcome to Garlmap

You can jump focus between the search section and playlist with F2 and F3.
Alternatively you can use Ctrl-f or Ctrl-l for the search and playlist sections.
No other sections are focusable in the traditional sense,
but they can be controlled with other shortcuts.
Toggling between the two sections can also be done using Ctrl-Tab.
The lyrics section can be scrolled with F9 and F10, without needing focus.
You can also display song lyrics here, by pressing F4,
which will happen automatically if they are available offline,
or you can bring back this help at any time with F1.
With Shift-F4 you can refetch the lyrics in case the cached ones are outdated.
For more lyrics options, see the dedicated paragraph or the buttons below it.
You can toggle automatic fetching with t in the playlist or with the checkbox.
F5 is for play/pause, and F6 for stopping after the current track.
F7 and F8 are for moving to the previous and next track.
You can seek by clicking the progress bar with any mouse button,
use Ctrl-[ and Ctrl-] to seek 6 seconds, or Ctrl-{ and Ctrl-} to seek 1 minute.
F12 will open the development tools where you can find any runtime errors.
There are many more shortcuts, which are listed in most of the sections below.
When in doubt, the mouse can also be used to do most actions.

Settings

It's required to load a folder for Garlmap to play songs.
It will index and cache the info of them, so you can search it easily.
You can load a folder with Ctrl-o, the button, or by changing your settings.
There are many ways to do so, with env vars, a config file, or with arguments,
all of which are explained if you start Garlmap with the "--help" argument.
It's recommended to read both this help and the startup help at least once.
You can save all your settings with the button or using Ctrl-s at any time,
a list of custom settings currently in use is always logged on startup.
Your playlist is not part of the settings, but you can import/export it instead.
Importing and exporting can also be done using Ctrl-r and Ctrl-t respectively.
You can choose a Garlmap specific format which keeps the rules and everything,
or import/export as M3U to exchange it with other music programs more easily.
You can view the list of events (such as lyrics fetching) with Ctrl-Shift-E,
or by clicking the current event in the status bar at the bottom.
If you don't want lyrics to be fetched from Genius at all, you can disable it:
at runtime with the checkbox right below the lyrics, using Ctrl-g to toggle it,
or otherwise using env vars, the config file or the startup arguments.
You can optionally automatically shift/scroll the lyrics based on song progress:
toggle this at runtime with the "Shift" checkbox, using Ctrl-h to toggle it,
or otherwise using env vars, the config file or the startup arguments.
Setting that are not by default visible can be changed in the settings editor,
you can open that with the settings gear on the bottom right or with Ctrl-/.

Syntax for queueing and searching

You can search for songs using the search section on the left.
These can be queued in the playlist individually, or as what is called a rule.
Rules are filters with a specific order and/or limit that can queue in bulk.
For example, "album:pinkerton artist:weezer" can be added to the playlist,
this rule which will play the entire Pinkerton album by artist Weezer.
You could also just search for "weezer pinker" or something and find it,
but the above is much more accurate if you have a large library.
There are many fields that can be used to search for songs based on their tags,
while others are specific to Garlmap for ordering or counting the query.
These properties are always present, though sometimes empty:
"title", "artist", "album", "disc", "disctotal", "track", "tracktotal",
"lyrics", "duration", "date", "order" and "limit".
On some files that support them, you can also search for the following fields:
"genre", "composer", "lyricist", "writer", "conductor", "remixer", "arranger",
"engineer", "producer", "technician", "djmixer", "mixer", "label", "grouping",
"subtitle", "rating", "bpm", "mood", "releasetype", "originalalbum",
"originalartist" and "originaldate".
The original year and regular year are used as fallbacks for the date fields.
Feel free to expand this list via PRs if you need more.
Even spaces are allowed: "album=dark side of the moon" is an album name search.
Any text that is listed before any of these fields, will search in all fields:
"dark side" will match any song that has any field with "dark" and "side" in it,
even the lyrics are searched, if they are cached for a specific song.
For the number fields, such as "date", "duration", "originaldate" or "track",
it's also possible to specify a number range like so: "date:1960-1975".
You can also use upercase letters in a field name to make it case sensitive,
as all searches are by default case insensitive: "Album=Dark Side" for example.
For the general search, if there are capital letters in it, it's case sensitive.
For fields that support multiple values, each value is searched to find a match,
for example: "genre=rock" will look for any song with the rock genre,
but not necessarily songs for which it's the only genre of the entire song.
Excluding values from appearing is a bit more involved due to the Regex syntax,
but to exclude electronic music add "genre=^(?!.*electro)" to your search.
If in your search you use optional fields such as genre, mood or composer,
songs that do not have them will be filtered from the results entirely.
The default sort order "disk", which means it's sorted on path alphabetically,
and it's used for all queries, unless a custom "order" field is provided.
For example, you can change to order to "shuffle", to play the tracks randomly.
Another valid order is "alpha" which will sort by song title alphabetically.
You can also order on release date with "order=date".
Finally there is "albumshuffle", which will play albums shuffled,
while keeping the disc and track order intact for each album.
When ordering, you might want to reverse the order,
which can be done by setting "asc=false" (or with "asc=0" and "asc=no").
By default, ascending order is always used and the default is true (or yes/1).
Songs without a valid date are always ordered at the end of the list,
you can exclude them entirely by setting an empty filter on date with "date=".
The "limit" field can be set to any number and will limit the amount of songs.

Search usage

You can focus the search section with either F3 or Ctrl-f,
and then type in any query as described in the paragraph above.
You can always jump to the search box with Tab, regardless of current focus.
F3/Ctrl-f merely switch to this section, which might still have a song selected,
instead of immediately bringing the focus to the search box.
After entering a search, you can add the rule to the playlist in 3 ways:
1. At the end of the playlist with Enter.
2. Immediately after the current rule/song with Shift-Enter.
3. As a fallback rule with Ctrl-Enter, see playlist for more info.
The entire query can be added as a rule to the playlist with these shortcuts,
which will automatically queue all matching tracks based on the rule.
Alternatively, you can scroll through the results with Ctrl-n and Ctrl-p,
or simply with the Arrow up and down keys to select individual songs.
While in the list, you can also use PageUp, PageDown, Home and End to navigate.
You can view the internal song info of the selected song using i,
or show the song info for the current song with Ctrl-i.
Once you have found the right track, you can add this single song with Enter.
With Shift-Enter you can queue it immediately after the current rule.
You can also select tracks with the left mouse button,
double-click or right-click to add them to the playlist at the end,
or middle-click it to add it to the playlist immediately after the current rule.

Playlist usage

In the playlist view, you can see what is playing and based on which rule.
You can also open the rule in the playlist and view the individual tracks.
The rules can be added at the end or immediately after the current track.
The playlist can also include simple individual tracks with no specific rule,
but rules are the core of what gives Garlmap superpowers in the playlist.
There is one special highlighted rule at the bottom: the fallback rule.
Songs will automatically be added to the playlist based on this fallback rule,
unless you have added a rule that specifically mentions to not append new songs.
You can do so by adding a custom playback order to play the existing playlist,
by adding "playback=shuffle" or "playback=list" to the fallback rule.
Playback "list" will play every entry of the list in order and then stop,
while "shuffle" will play random entries from the existing playlist at random.
Both will prevent new upcoming songs from being added to the list at the end.
By default, the fallback rule is set to "order=shuffle",
which will append new songs in shuffled order at the end playlist.
An upcoming song will have a temporary place in the playlist,
which will automatically become part of the playlist on play.
This upcoming song will be removed when a new rule or song is added before that.
You can navigate the playlist view with the Arrow keys or hjkl,
or select a rule or track directly by clicking with the left mouse button on it.
On hover, a play icon will appear, which can be used to play a song right away.
Right-clicking will open/close a rule, or toggle stop after track on a song.
Stop after selected song can be toggled with s, for which an icon will appear.
Stop after the last song of the current rule can be toggled with Shift-s,
or globally using the app shortcut for it: Shift-F6.
Middle-clicking on a song or rule will remove it from the playlist,
you can do the same for songs inside existing rules, also using Delete or d.
While in the playlist, you can also use PageUp, PageDown, Home and End,
which scrolls the view, or use the same keys with Ctrl to move the selection.
Ctrl-up and Ctrl-down are the same as Ctrl-PageUp and Ctrl-PageDown,
but without control the arrows move the selection, while Page keys move a page.
You can also play the selected track right away with Enter.
With a you can toggle auto scrolling the playlist to the current song,
though it will not move the selection, similar to scrolling with Ctrl-e/Ctrl-y.
You can also toggle automatic opening and closing of the rules with c,
or toggle automatic removal of old rules and songs using r.
You can view the internal song info of the selected song using i,
or show the song info for the current song with Ctrl-i.

Caching

All song data and lyrics are cached for the next startup in a "cache.json" file,
either in ~/.config/Garlmap or %APPDATA%/Garlmap depending on your OS.
You can control if the cache should be read on startup using --cache,
or with the GARLMAP_CACHE ENV var set to one of: all, songs, lyrics, none.
Obviously you are free to delete the "cache.json" at any time if you want to,
just know that the cache file greatly speeds up parsing of large folders,
and greatly reduces the amount of requests to Genius if you want auto lyrics.
Don't expect miracles, it will still take multiple seconds to parse 10k+ songs,
but after startup there shouldn't be too many moments that freeze the app.
You can use local lyrics, by making a ".txt" that has the same path as a song,
or do so in a "Lyrics" folder at the base music folder and then the same path.
For example: "Lyrics/Weezer/Blue/Undone.txt" for "Weezer/Blue/Undone.mp3".
These will always work regardless of whether Genius is enabled via the checkbox,
as is the case for the built-in lyrics editor (including the manual searching).
You can generate these files based on the cache file using "--dump-lyrics".

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

Fullscreen layouts

There are many ways to enter fullscreen in Garlmap and two separate types of it.
First there is a type of fullscreen that removes window borders and menu bars.
Second there is a minimal layout that removes the search and playlist sections.
You can toggle them at the same time with F11 or left-clicking on the cover art.
To specifically toggle the window border removal, use Ctrl-F11 or right-click.
To toggle only minimal layout, use Shift-F11 or middle-click on the covert art.
You may also click with any mouse button on empty space in the minimal layout,
which will exit one stage of fullscreen per click, similar to pressing Escape.
While inside the fullscreen minimal layout, you also have more keybindings.
First you can use the arrow keys for seeking in the track,
or Ctrl-Left and Ctrl-Right to move between tracks themselves.
Also, not only do F9 and F10 scroll the lyrics, but PageDown and PageUp as well.
You don't have to hold control for muting, changing or resetting the volume,
just m, -, = and 0 will work fine (= is the unshifted key for +).
You can also use s to toggle stopping after the current track.
Finally, you can use Space to toggle pause and q to exit fullscreen completely.

Lyrics editor

Besides automatically showing the lyrics using the Autolyrics option,
you can also edit them yourself and save them to the cache.
To open the editor, either press Ctrl-F4 or use the buttons below the help.
These buttons can also be used to switch between the help and showing lyrics,
optionally by fetching the lyrics fresh by pressing the download icon.
There are also checkboxes for toggling the Genius API and auto shifting lyrics.
Once in the editor, you can focus mainly on two sections, the search and editor.
To toggle between the sections, use Ctrl-Tab, or just Tab to jump to searching.
Like the event dialog, you can close it by clicking outside or using Escape,
as well as by pressing the same shortcut you used to open it: Ctrl-F4.
In the search section, you can type a query, and search on Genius for songs.
This will continue to work, even if you have disabled the automatic fetching.
You can do so with the search button or Enter, it will NOT search while typing.
The last query is always remembered for ease of use even after typing again.
The other section is the lyrics editor itself, where you can edit the lyrics.
Your changes are not saved automatically, and you can safely close the dialog,
if you reopen it without changing the song, your changes are still there.
If you do not save your changes before a song change, they will be removed.
You can save with Ctrl-s, the save button or with Ctrl-Enter in the text editor.
The search results can also be used to fill the lyrics editor with its text.
After a search, highlight the right song with the arrow keys or the mouse,
then press Enter or double-click on the song to use its lyrics in the editor.
You can then edit them further, or save them with the button or Ctrl-Enter,
You must save your changes manually for them to be stored to the cache.

More info

If you want more information, or still have questions,
even after reading this entire section and the startup help using "--help",
you are more than welcome to reach out on Github.
Please visit Jelmerro/Garlmap and make an issue with your question or request.
`.split("\n").map(l => l || "\n\n").join(" ")
}

module.exports = {
    basePath,
    deleteFile,
    deleteFolder,
    dirName,
    formatTime,
    isDirectory,
    isFile,
    joinPath,
    makeDir,
    notify,
    queryMatch,
    readFile,
    readJSON,
    resetWelcome,
    writeFile,
    writeJSON
}
