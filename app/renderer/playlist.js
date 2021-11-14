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

const playlist = []
let playlistIndex = 0
let pathIndex = 0
const fallbackRule = "order:shuffle"
let fallbackSong = null

const currentAndNext = () => {
    const {query, songForPath} = require("./songs")
    let current = songForPath(playlist[playlistIndex]?.paths[pathIndex])
    if (!current) {
        const {paths} = query(fallbackRule)
        current = fallbackSong || songForPath(paths[0])
        if (!current) {
            return {}
        }
        playlist.push({paths, "source": "auto"})
        playlistIndex = playlist.length - 1
        pathIndex = 0
    }
    let next = songForPath(playlist[playlistIndex]?.paths[pathIndex + 1]
        || playlist[playlistIndex + 1]?.paths[0])
    if (!next) {
        const {paths, requiresNewRule} = query(fallbackRule)
        next = songForPath(paths[0])
        if (requiresNewRule) {
            playlist.push({paths, "source": "auto"})
        }
        fallbackSong = next
    }
    return {current, next}
}

const decrement = async() => {
    if (pathIndex > 0) {
        pathIndex -= 1
    } else if (playlistIndex > 0) {
        playlistIndex -= 1
        pathIndex = Math.max(playlist[playlistIndex]?.paths.length - 1, 0)
    } else {
        return
    }
    await playFromPlaylist()
}

const increment = async(user = true) => {
    if (playlist[playlistIndex]?.paths.length > pathIndex + 1) {
        pathIndex += 1
    } else if (playlist.length > playlistIndex + 1 || fallbackSong) {
        playlistIndex += 1
        pathIndex = 0
    } else {
        return
    }
    await playFromPlaylist(user)
}

const displaySong = async song => {
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
    if (song.track || song.disc) {
        bundledInfo.textContent = `${song.track || "?"}/${song.track_total
            || "?"} on CD ${song.disc || "?"}/${song.disc_total || "?"}`
        if (song.date) {
            bundledInfo.textContent += ` from ${song.date}`
        }
    } else if (song.date) {
        bundledInfo.textContent = song.date
    }
    otherInfo.appendChild(bundledInfo)
    songContainer.appendChild(otherInfo)
    // #bug Workaround to allow mediaSession to work with Electron, sigh
    try {
        document.body.removeChild(document.querySelector("audio"))
    } catch {}
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
        navigator.mediaSession.metadata.artwork = [{"src": URL.createObjectURL(blob)}]
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
        const {resetWelcome} = require("../util")
        resetWelcome()
    }
}

const playFromPlaylist = async(switchNow = true) => {
    const {current, next} = currentAndNext()
    const {load, queue} = require("./player")
    if (current) {
        if (switchNow) {
            await load(current.path)
            document.getElementById("status-scan").textContent = ""
        }
        await queue(next.path)
        await displaySong(current)
    }
}

const append = rule => {
    playlist.push(rule)
    playFromPlaylist(false)
}

module.exports = {
    playFromPlaylist, increment, decrement, displaySong, currentAndNext, append
}
