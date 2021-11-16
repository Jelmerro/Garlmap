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

const {resetWelcome, formatTime} = require("../util")

const generateSongElement = (song, current) => {
    const songContainer = document.createElement("div")
    songContainer.className = "song"
    if (current) {
        songContainer.className = "current song"
        const currentImg = document.createElement("img")
        currentImg.src = "../img/play.png"
        songContainer.appendChild(currentImg)
    }
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
    return songContainer
}

const generatePlaylistView = () => {
    document.getElementById("main-playlist").textContent = ""
    playlist.forEach((item, index) => {
        // Main playlist row
        const mainContainer = document.createElement("div")
        mainContainer.className = "rule"
        if (index === playlistIndex) {
            mainContainer.className = "rule current"
        }
        const title = document.createElement("span")
        title.textContent = item.rule || "Automatic based on fallback"
        mainContainer.appendChild(title)
        const info = document.createElement("span")
        info.textContent = `${item.songs.length} songs - ${
            formatTime(item.duration)}`
        mainContainer.appendChild(info)
        document.getElementById("main-playlist").appendChild(mainContainer)
        // Song dropdown
        const songContainer = document.createElement("div")
        item.songs.forEach((song, songIdx) => {
            const songInfo = generateSongElement(song, songIdx === pathIndex)
            songContainer.appendChild(songInfo)
        })
        document.getElementById("main-playlist").appendChild(songContainer)
    })
    document.getElementById("fallback-rule").textContent = fallbackRule
}

const currentAndNext = () => {
    const {query} = require("./songs")
    let current = playlist[playlistIndex]?.songs[pathIndex]
    if (!current) {
        const songs = query(fallbackRule)
        current = fallbackSong || songs.find(s => s.path === fallbackSong?.path)
            || songs[0]
        if (!current) {
            return {}
        }
        append({
            "songs": songs.slice(songs.indexOf(current),
                songs.indexOf(current) + 2),
            "rule": fallbackRule
        })
        playlistIndex = playlist.length - 1
        pathIndex = 0
    }
    let next = playlist[playlistIndex]?.songs[pathIndex + 1]
        || playlist[playlistIndex + 1]?.songs[0]
    if (!next) {
        const songs = query(fallbackRule)
        next = songs[songs.indexOf(current) + 1] || songs[0]
        if (playlist[playlistIndex]?.rule === fallbackRule) {
            playlist[playlistIndex].duration = playlist[playlistIndex].songs
                .map(s => s.duration).reduce((p, n) => (p || 0) + (n || 0))
            playlist[playlistIndex].songs.push(next)
            playFromPlaylist(false)
        } else {
            append({"songs": songs.slice(0, 2), "rule": fallbackRule})
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
        pathIndex = Math.max(playlist[playlistIndex]?.songs.length - 1, 0)
    } else {
        return
    }
    await playFromPlaylist()
}

const increment = async(user = true) => {
    if (playlist[playlistIndex]?.songs.length > pathIndex + 1) {
        pathIndex += 1
    } else if (playlist.length > playlistIndex + 1 || fallbackSong) {
        playlistIndex += 1
        pathIndex = 0
    } else {
        return
    }
    await playFromPlaylist(user)
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

const playFromPlaylist = async(switchNow = true) => {
    const {current, next} = currentAndNext()
    const {load, queue} = require("./player")
    if (current) {
        if (switchNow) {
            await load(current.path)
            document.getElementById("status-scan").textContent = ""
        }
        await queue(next.path)
        await displayCurrentSong(current)
        generatePlaylistView()
    }
}

const append = item => {
    if (!item.songs) {
        const {query} = require("./songs")
        item.songs = query(item.rule)
    }
    item.duration = item.songs.map(s => s.duration)
        .reduce((p, n) => (p || 0) + (n || 0))
    playlist.push(item)
    playFromPlaylist(false)
}

module.exports = {
    playFromPlaylist,
    increment,
    decrement,
    displayCurrentSong,
    currentAndNext,
    append,
    generateSongElement
}
