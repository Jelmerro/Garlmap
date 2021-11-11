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
const fallbackRule = null // TODO
let fallbackSong = null

const currentAndNext = () => {
    const {randomSong, songForPath} = require("./songs")
    let current = songForPath(playlist[playlistIndex]?.paths[pathIndex])
    if (!current) {
        current = fallbackSong || randomSong()
        if (!current) {
            return {}
        }
        playlist.push({"paths": [current.path], "source": "auto"})
        playlistIndex = playlist.length - 1
        pathIndex = 0
    }
    let next = songForPath(playlist[playlistIndex]?.paths[pathIndex + 1]
        || playlist[playlistIndex + 1]?.paths[0])
    if (!next) {
        next = randomSong()
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
    playFromPlaylist()
}

const increment = async(user = false) => {
    if (playlist[playlistIndex]?.paths.length > pathIndex + 1) {
        pathIndex += 1
    } else if (playlist.length > playlistIndex + 1 || fallbackSong) {
        playlistIndex += 1
        pathIndex = 0
    } else {
        return
    }
    playFromPlaylist(user)
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
    const {coverArt} = require("./songs")
    const cover = await coverArt(song.path)
    if (cover) {
        document.getElementById("song-cover").src = cover
        document.getElementById("song-cover").style.filter = "none"
    } else {
        document.getElementById("song-cover").src = "../img/disc.png"
        document.getElementById("song-cover").style.filter = null
    }
    // #bug Cover does not work due to Electron bug
    const resp = await fetch(cover)
    const blob = await resp.blob()
    navigator.mediaSession.metadata = new MediaMetadata({
        ...song, "artwork": [{"src": URL.createObjectURL(blob)}]
    })
}

const playFromPlaylist = async(switchNow = true) => {
    const {current, next} = currentAndNext()
    const {load, queue} = require("./player")
    if (current) {
        if (switchNow) {
            await load(current.path)
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
