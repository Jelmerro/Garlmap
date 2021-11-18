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

const {formatTime, resetWelcome} = require("../util")

let selectedSearchIdx = null

const generateSongElement = song => {
    const songContainer = document.createElement("div")
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
    if (song.duration) {
        bundledInfo.textContent = formatTime(song.duration)
    }
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
    document.getElementById("current-song").textContent = ""
    const songContainer = document.getElementById("current-song")
    const titleEl = document.createElement("span")
    titleEl.className = "title"
    titleEl.textContent = song.title
    songContainer.appendChild(titleEl)
    songContainer.appendChild(document.createTextNode(" - "))
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
    if (song.duration) {
        bundledInfo.textContent = formatTime(song.duration)
    }
    if (song.track || song.disc) {
        bundledInfo.textContent += ` ${song.track || "?"}/${song.track_total
            || "?"} on CD ${song.disc || "?"}/${song.disc_total || "?"}`
    }
    if (song.date) {
        bundledInfo.textContent += ` from ${song.date}`
    }
    otherInfo.appendChild(bundledInfo)
    songContainer.appendChild(otherInfo)
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
    await audio.play()
    const {updatePlayButton} = require("./player")
    updatePlayButton()
    // MediaSession details
    navigator.mediaSession.metadata = new window.MediaMetadata({...song})
    const {coverArt} = require("./songs")
    const cover = await coverArt(song.path)
    if (cover) {
        document.getElementById("song-cover").src = cover
        document.getElementById("song-cover").style.display = "initial"
        // #bug Cover does not work due to Electron bug
        const resp = await fetch(cover)
        const blob = await resp.blob()
        navigator.mediaSession.metadata.artwork = [
            {"src": URL.createObjectURL(blob)}
        ]
    } else {
        document.getElementById("song-cover").src = null
        document.getElementById("song-cover").style.display = "none"
    }
    // Display lyrics if cached or configured to always show
    const {shouldAutoFetchLyrics} = require("./settings")
    if (song.lyrics) {
        document.getElementById("song-info").textContent = song.lyrics
    } else if (shouldAutoFetchLyrics()) {
        const {fetchLyrics} = require("./songs")
        fetchLyrics(song)
    } else {
        resetWelcome()
    }
}

const switchFocus = newFocus => {
    document.body.setAttribute("focus-el", newFocus)
    if (newFocus === "playlist") {
        document.getElementById("rule-search").blur()
        document.getElementById("playlist-container").focus()
    } else {
        if (selectedSearchIdx === null) {
            const search = document.getElementById("rule-search")
            search.scrollIntoView({"block": "center"})
            search.focus({"preventScroll": true})
            document.body.setAttribute("focus-el", "search")
        } else {
            // TODO scroll to current song idx
        }
        document.getElementById("rule-search").focus()
    }
}

module.exports = {generateSongElement, displayCurrentSong, switchFocus}