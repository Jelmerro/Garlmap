/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2021-2023 Jelmer van Arnhem
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

const mpvAPI = require("./mpv")
const {ipcRenderer} = require("electron")
const {joinPath, formatTime, deleteFolder} = require("../util")

let mpv = null
let customMediaSesion = null
let volume = 100
let lastPos = 0
let hasAnySong = false
let stoppedAfterTrack = false

const init = (path, configDir) => {
    mpv = mpvAPI({
        "args": [
            "--no-video", "--no-audio-display", "--no-config", "--idle=yes"
        ],
        path
    })
        .on("error", e => ipcRenderer.send("destroy-window", e))
    try {
        // This package takes care of connecting to the MPRIS D-Bus interface,
        // if provided by the OS, else the regular MediaSession API is used.
        const MPRIS = require("mpris-service")
        customMediaSesion = MPRIS({
            "desktopEntry": "garlmap", "identity": "Garlmap", "name": "garlmap"
        })
    } catch (e) {
        console.warn("Using Chromium's broken MediaSession API, be warned:")
        console.warn(e)
    }
    mpv.command("observe_property", 1, "playlist-pos")
    mpv.command("observe_property", 2, "playback-time")
    mpv.command("observe_property", 3, "playback-count")
    mpv.on("error", console.warn)
    mpv.on("property-change", async info => {
        if (!isAlive()) {
            return
        }
        if (info.name === "playback-time" && info.data >= 0) {
            const position = info.data
            const {currentAndNext} = require("./playlist")
            const {current} = currentAndNext()
            const {duration} = current
            lastPos = Math.floor(position * 1000000)
            if (!customMediaSesion) {
                navigator.mediaSession.setPositionState({
                    duration, "playbackRate": 1, position
                })
            }
            const played = `\u00a0${formatTime(position)}/${
                formatTime(duration)}\u00a0`
            const perc = `${position / duration * 100}%`
            document.getElementById("progress-played").textContent = played
            document.getElementById("progress-played").style.width = perc
            document.getElementById("progress-string").textContent = played
            document.getElementById("fs-progress-played").textContent = played
            document.getElementById("fs-progress-played").style.width = perc
            document.getElementById("fs-progress-string").textContent = played
            if (document.getElementById("toggle-shift-lyrics").checked) {
                const {shiftLyricsByPercentage} = require("./lyrics")
                shiftLyricsByPercentage(parseFloat(perc))
            }
            return
        }
        if (info.name === "playlist-pos" && info.data === 1) {
            const {increment} = require("./playlist")
            await increment(false)
            const {showLyrics} = require("./lyrics")
            const {currentAndNext, autoPlayOpts} = require("./playlist")
            const {current} = currentAndNext()
            await showLyrics(current.id)
            autoPlayOpts()
        }
        if (info.name === "playlist-pos" && info.data === -1) {
            const {currentAndNext, playFromPlaylist} = require("./playlist")
            const {current} = currentAndNext()
            current.stopAfter = false
            stoppedAfterTrack = true
            await playFromPlaylist(false)
            await mpv.set("pause", true)
            updatePlayButton()
        }
    })
    mpv.on("unpause", updatePlayButton)
    mpv.on("stop", updatePlayButton)
    mpv.on("pause", updatePlayButton)
    // Listen for media and such
    ipcRenderer.on("media-pause", pause)
    ipcRenderer.on("media-prev", () => {
        const {decrement} = require("./playlist")
        decrement()
    })
    ipcRenderer.on("media-next", () => {
        const {increment} = require("./playlist")
        increment()
    })
    ipcRenderer.on("media-stop", () => {
        const {stopAfterTrack} = require("./playlist")
        stopAfterTrack()
    })
    ipcRenderer.on("window-close", () => {
        deleteFolder(joinPath(configDir, "Crashpad"))
        mpv.command("quit").catch(() => null)
        ipcRenderer.send("destroy-window")
    })
    if (customMediaSesion) {
        customMediaSesion.canEditTracks = false
        customMediaSesion.getPosition = () => lastPos
        customMediaSesion.on("raise", () => ipcRenderer.send("show-window"))
        customMediaSesion.on("quit", () => {
            mpv.command("quit").catch(() => null)
            ipcRenderer.send("destroy-window")
        })
        customMediaSesion.on("play", () => pause())
        customMediaSesion.on("pause", () => pause())
        customMediaSesion.on("playpause", () => pause())
        customMediaSesion.on("stop", () => {
            const {stopAfterTrack} = require("./playlist")
            stopAfterTrack()
        })
        customMediaSesion.on("position", details => {
            mpv.command("seek", details.position / 1000000, "absolute")
            customMediaSesion.seeked(details.position)
        })
        customMediaSesion.on("previous", () => {
            const {decrement} = require("./playlist")
            decrement()
        })
        customMediaSesion.on("next", () => {
            const {increment} = require("./playlist")
            increment()
        })
        customMediaSesion.playbackStatus = "Paused"
    } else {
        navigator.mediaSession.setActionHandler("play", pause)
        navigator.mediaSession.setActionHandler("pause", pause)
        navigator.mediaSession.setActionHandler("stop", () => {
            const {stopAfterTrack} = require("./playlist")
            stopAfterTrack()
        })
        navigator.mediaSession.setActionHandler("seekbackward", () => null)
        navigator.mediaSession.setActionHandler("seekforward", () => null)
        navigator.mediaSession.setActionHandler("seekto",
            details => mpv.command("seek", details.seekTime, "absolute"))
        navigator.mediaSession.setActionHandler("previoustrack", () => {
            const {decrement} = require("./playlist")
            decrement()
        })
        navigator.mediaSession.setActionHandler("nexttrack", () => {
            const {increment} = require("./playlist")
            increment()
        })
    }
}

const isAlive = () => hasAnySong && mpv

const updatePlayButton = async() => {
    if (!isAlive() || await mpv.get("pause")) {
        document.getElementById("pause").querySelector("img").src
            = "../img/play.png"
        document.getElementById("fs-pause").querySelector("img").src
            = "../img/play.png"
        if (customMediaSesion) {
            customMediaSesion.playbackStatus = "Paused"
        } else {
            navigator.mediaSession.playbackState = "paused"
            // #bug Workaround for playback state, using a fake audio element
            try {
                document.querySelector("audio").pause().catch(() => null)
            } catch {
                // There is no fallback for workarounds
            }
        }
    } else {
        document.getElementById("pause").querySelector("img").src
            = "../img/pause.png"
        document.getElementById("fs-pause").querySelector("img").src
            = "../img/pause.png"
        if (customMediaSesion) {
            customMediaSesion.playbackStatus = "Playing"
        } else {
            navigator.mediaSession.playbackState = "playing"
            // #bug Workaround for playback state, using a fake audio element
            try {
                document.querySelector("audio").play().catch(() => null)
            } catch {
                // There is no fallback for workarounds
            }
        }
    }
}

const pause = async() => {
    if (isAlive() && !stoppedAfterTrack) {
        await mpv.set("pause", !await mpv.get("pause"))
    } else {
        const {playFromPlaylist} = require("./playlist")
        playFromPlaylist()
        stoppedAfterTrack = false
    }
    updatePlayButton()
}

const relativeSeek = async seconds => {
    if (isAlive() && !stoppedAfterTrack) {
        await mpv.command("seek", seconds, "relative")
    }
}

const seek = async percent => {
    if (isAlive() && !stoppedAfterTrack) {
        const {currentAndNext} = require("./playlist")
        const {current} = currentAndNext()
        const {duration} = current
        await mpv.command("seek", percent * duration, "absolute")
        if (customMediaSesion) {
            customMediaSesion.seeked(percent * duration * 1000000)
        }
    }
}

const load = async file => {
    hasAnySong = true
    stoppedAfterTrack = false
    document.getElementById("volume-slider").disabled = null
    document.getElementById("fs-volume-slider").disabled = null
    await mpv.command("loadfile", file)
    await mpv.set("pause", false)
}

const queue = async file => {
    await mpv.command("playlist-clear")
    if (file) {
        await mpv.command("loadfile", file, "append")
    }
}

const volumeSet = async vol => {
    volume = Math.min(130, Math.max(0, vol))
    await updateVolume()
}

const volumeUp = async() => {
    volume = Math.min(130, volume + 10)
    await updateVolume()
}

const volumeDown = async() => {
    volume = Math.max(0, volume - 10)
    await updateVolume()
}

const updateVolume = async() => {
    if (isAlive()) {
        await mpv.set("volume", volume)
    } else {
        volume = 100
    }
    document.getElementById("volume-slider").value = volume
    document.getElementById("fs-volume-slider").value = volume
    if (isAlive() && await mpv.get("mute")) {
        document.getElementById("volume-slider").className = "muted"
        document.getElementById("fs-volume-slider").className = "muted"
    } else {
        document.getElementById("volume-slider").className = ""
        document.getElementById("fs-volume-slider").className = ""
    }
}

const toggleMute = async() => {
    if (isAlive()) {
        await mpv.set("mute", !await mpv.get("mute"))
    }
    await updateVolume()
}

const stopPlayback = async() => {
    if (isAlive()) {
        await mpv.command("stop").catch(() => null)
    }
}

const displayCurrentSong = async song => {
    const els = [
        document.getElementById("current-song"),
        document.getElementById("fs-current-song")
    ]
    for (const songContainer of els) {
        if (!song) {
            songContainer.textContent = "Welcome to Garlmap"
            continue
        }
        songContainer.textContent = ""
        const titleEl = document.createElement("span")
        titleEl.className = "title"
        titleEl.textContent = song.title
        songContainer.appendChild(titleEl)
        if (!song.title || !song.artist) {
            titleEl.textContent = song.id
            continue
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
            bundledInfo.textContent = ` ${song.track || "?"}/${song.tracktotal
                || "?"} on CD ${song.disc || "?"}/${song.disctotal || "?"}`
        }
        if (song.date) {
            bundledInfo.textContent += ` from ${song.date}`
        }
        otherInfo.appendChild(bundledInfo)
        songContainer.appendChild(otherInfo)
    }
    if (!song) {
        return
    }
    if (!customMediaSesion) {
        // #bug Workaround for playback state, using a fake audio element
        try {
            document.body.removeChild(document.querySelector("audio"))
        } catch {
            // There is no fallback for workarounds
        }
        const audio = document.createElement("audio")
        audio.src = "./empty.mp3"
        document.body.appendChild(audio)
        audio.loop = true
        await audio.play().catch(() => null)
    }
    updatePlayButton()
    // MediaSession details
    const {coverArt} = require("./songs")
    const cover = await coverArt(song.path)
    if (cover) {
        document.getElementById("song-cover").src = cover
        document.getElementById("song-cover").style.display = "initial"
        document.getElementById("fs-song-cover").src = cover
        document.getElementById("fs-song-cover").style.display = "initial"
        if (customMediaSesion) {
            customMediaSesion.metadata = {
                "mpris:artUrl": cover,
                "mpris:length": Math.floor(song.duration * 1000000),
                "mpris:trackid": customMediaSesion.objectPath("track/0"),
                "xesam:album": song.album,
                "xesam:artist": [song.artist],
                "xesam:title": song.title
            }
        } else {
            // #bug Cover art does not work due to Chromium bug
            navigator.mediaSession.metadata = new window.MediaMetadata(
                {...song, "artwork": [{"src": cover}]})
        }
    } else {
        document.getElementById("song-cover").removeAttribute("src")
        document.getElementById("song-cover").style.display = "none"
        document.getElementById("fs-song-cover").removeAttribute("src")
        document.getElementById("fs-song-cover").style.display = "none"
        if (customMediaSesion) {
            customMediaSesion.metadata = {
                "mpris:artUrl": cover,
                "mpris:length": Math.floor(song.duration * 1000000),
                "mpris:trackid": customMediaSesion.objectPath("track/0"),
                "xesam:album": song.album,
                "xesam:artist": [song.artist],
                "xesam:title": song.title
            }
        } else {
            navigator.mediaSession.metadata = new window.MediaMetadata(
                {...song})
        }
    }
}

module.exports = {
    displayCurrentSong,
    init,
    isAlive,
    load,
    pause,
    queue,
    relativeSeek,
    seek,
    stopPlayback,
    toggleMute,
    updatePlayButton,
    volumeDown,
    volumeSet,
    volumeUp
}
