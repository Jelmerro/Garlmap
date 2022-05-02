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

const {formatTime} = require("../util")

const generateSongElement = song => {
    const songContainer = document.createElement("div")
    songContainer.setAttribute("song-id", song.id)
    songContainer.className = "song"
    const mainInfo = document.createElement("span")
    mainInfo.className = "main-info"
    const titleEl = document.createElement("span")
    titleEl.textContent = song.title
    mainInfo.appendChild(titleEl)
    const artistEl = document.createElement("span")
    artistEl.textContent = song.artist
    artistEl.className = "artist"
    mainInfo.appendChild(artistEl)
    songContainer.appendChild(mainInfo)
    const otherInfo = document.createElement("span")
    otherInfo.className = "other-info"
    const albumEl = document.createElement("span")
    albumEl.textContent = song.album
    otherInfo.appendChild(albumEl)
    const bundledInfo = document.createElement("span")
    bundledInfo.className = "bundled-info"
    bundledInfo.textContent = formatTime(song.duration)
    if (song.track || song.disc) {
        bundledInfo.textContent += ` ${song.track || "?"}/${song.track_total
            || "?"} on CD ${song.disc || "?"}/${song.disc_total || "?"}`
    }
    if (song.date) {
        bundledInfo.textContent += ` from ${song.date}`
    }
    otherInfo.appendChild(bundledInfo)
    songContainer.appendChild(otherInfo)
    return songContainer
}

const displayCurrentSong = async song => {
    const els = [
        document.getElementById("current-song"),
        document.getElementById("fs-current-song")
    ]
    for (const songContainer of els) {
        if (!song) {
            songContainer.textContent = "Welcome to Garlmap"
            return
        }
        songContainer.textContent = ""
        const titleEl = document.createElement("span")
        titleEl.className = "title"
        titleEl.textContent = song.title
        songContainer.appendChild(titleEl)
        if (songContainer === document.getElementById("current-song")) {
            songContainer.appendChild(document.createTextNode(" - "))
        }
        const artistEl = document.createElement("span")
        artistEl.className = "artist"
        artistEl.textContent = song.artist
        songContainer.appendChild(artistEl)
        const otherInfo = document.createElement("span")
        otherInfo.className = "other-info"
        const albumEl = document.createElement("span")
        albumEl.className = "album"
        albumEl.textContent = song.album
        otherInfo.appendChild(albumEl)
        const bundledInfo = document.createElement("span")
        if (song.track || song.disc) {
            bundledInfo.textContent = ` ${song.track || "?"}/${song.track_total
                || "?"} on CD ${song.disc || "?"}/${song.disc_total || "?"}`
        }
        if (song.date) {
            bundledInfo.textContent += ` from ${song.date}`
        }
        otherInfo.appendChild(bundledInfo)
        songContainer.appendChild(otherInfo)
    }
    // #bug Workaround to allow mediaSession to work with Electron, sigh
    try {
        document.body.removeChild(document.querySelector("audio"))
    } catch {
        // There is no fallback for workarounds
    }
    const audio = document.createElement("audio")
    audio.src = "../static/empty.mp3"
    document.body.appendChild(audio)
    audio.loop = true
    await audio.play().catch(() => null)
    const {updatePlayButton} = require("./player")
    updatePlayButton()
    // MediaSession details
    navigator.mediaSession.metadata = new window.MediaMetadata({...song})
    const {coverArt} = require("./songs")
    const cover = await coverArt(song.path)
    if (cover) {
        document.getElementById("song-cover").src = cover
        document.getElementById("song-cover").style.display = "initial"
        document.getElementById("fs-song-cover").src = cover
        document.getElementById("fs-song-cover").style.display = "initial"
        // #bug Cover does not work due to Electron bug
        const resp = await fetch(cover)
        const blob = await resp.blob()
        navigator.mediaSession.metadata.artwork = [
            {"src": URL.createObjectURL(blob)}
        ]
    } else {
        document.getElementById("song-cover").src = null
        document.getElementById("song-cover").style.display = "none"
        document.getElementById("fs-song-cover").src = null
        document.getElementById("fs-song-cover").style.display = "none"
    }
}

const setFullscreenLayout = async(browserFS, layoutFS) => {
    const currentFocus = document.body.getAttribute("focus-el")
    if (document.fullscreenElement) {
        await document.exitFullscreen()
    }
    if (layoutFS) {
        await switchFocus("fullscreen")
        if (browserFS) {
            document.getElementById("fullscreen").requestFullscreen()
        }
        return
    }
    if (currentFocus === "fullscreen") {
        await switchFocus("search")
    }
    if (browserFS) {
        document.body.requestFullscreen()
    }
}

const switchFocus = async newFocus => {
    // Valid focus points for the entire app are:
    // - playlist (playlist section to highlight songs/rules to play or remove)
    // - search (search section results, not the search box itself)
    // - searchbox (search box for looking up new songs to play)
    // - fullscreen (only for the fullscreen layout, not the browser fullscreen)
    // - events (event history dialog, not the status bar in the main view)
    // - lyrics (lyrics editor dialog, not the lyrics pane in the main view)
    //   - Also the focus when inside the dialog but not searching or editing
    //   - Also the focus when selecting search results after searching Genius
    // - lyricssearch (lyrics search box in the dialog for searching Genius api)
    // - lyricsseditor (manual lyrics edit box inside the lyrics dialog)
    const currentFocus = document.body.getAttribute("focus-el")
    document.body.setAttribute("focus-el", newFocus.replace("box", ""))
    if (newFocus === "playlist") {
        document.getElementById("playlist-container").focus()
    }
    if (newFocus === "events") {
        document.getElementById("events").style.display = "flex"
    } else {
        document.getElementById("events").style.display = "none"
    }
    if (newFocus.startsWith("lyrics")) {
        document.getElementById("lyrics-editor").style.display = "flex"
        const selected = document.querySelector("#lyrics-results .selected")
        if (newFocus === "lyricseditor") {
            document.getElementById("lyrics-edit-field").focus()
        } else if (!selected || newFocus.endsWith("search")) {
            selected?.classList.remove("selected")
            document.body.setAttribute("focus-el", "lyricssearch")
            document.getElementById("lyrics-search").focus()
        } else {
            selected.scrollIntoView({"block": "nearest"})
            document.getElementById("lyrics-edit-field").blur()
            document.getElementById("lyrics-search").blur()
        }
    } else {
        document.getElementById("lyrics-editor").style.display = "none"
    }
    if (newFocus === "fullscreen") {
        document.getElementById("fullscreen").style.display = "flex"
        if (document.fullscreenElement) {
            await document.exitFullscreen()
            document.getElementById("fullscreen").requestFullscreen()
        }
    } else if (currentFocus === "fullscreen") {
        document.getElementById("fullscreen").style.display = "none"
        if (document.fullscreenElement) {
            await document.exitFullscreen()
            document.body.requestFullscreen()
        }
    }
    if (newFocus.startsWith("search")) {
        const selected = document.querySelector("#search-results .selected")
        if (!selected || newFocus.endsWith("box")) {
            selected?.classList.remove("selected")
            document.body.setAttribute("focus-el", "search")
            document.getElementById("rule-search").focus()
        } else {
            selected.scrollIntoView({"block": "nearest"})
        }
    } else {
        document.getElementById("rule-search").blur()
    }
}

const decrementSelected = () => {
    const selected = document.querySelector("#search-results .selected.song")
    if (selected) {
        if (selected.previousSibling) {
            selected.previousSibling.classList.add("selected")
        } else {
            document.getElementById("rule-search").focus()
        }
        selected.classList.remove("selected")
    }
    document.querySelector("#search-results .selected")
        ?.scrollIntoView({"block": "nearest"})
}

const incrementSelected = () => {
    const selected = document.querySelector("#search-results .selected.song")
    if (selected) {
        if (selected.nextSibling) {
            selected.nextSibling.classList.add("selected")
            selected.classList.remove("selected")
        }
    } else {
        const song = document.querySelector("#search-results .song")
        if (song) {
            song.classList.add("selected")
            document.getElementById("rule-search").blur()
        }
    }
    document.querySelector("#search-results .selected")
        ?.scrollIntoView({"block": "nearest"})
}

const appendSelectedSong = (upNext = false) => {
    const song = document.querySelector("#search-results .selected.song")
    if (song) {
        const {append} = require("./playlist")
        const {songById} = require("./songs")
        append({"songs": [songById(song.getAttribute("song-id"))]}, upNext)
    }
}

module.exports = {
    appendSelectedSong,
    decrementSelected,
    displayCurrentSong,
    generateSongElement,
    incrementSelected,
    setFullscreenLayout,
    switchFocus
}
