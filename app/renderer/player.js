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

const mpvAPI = require("mpv")
const {ipcRenderer} = require("electron")
const {formatTime} = require("../util")

let mpv = null
let volume = 100
let hasAnySong = false
let stoppedAfterTrack = false

const init = path => {
    mpv = new mpvAPI({"args": ["--no-video", "--no-audio-display"], path})
        .on("error", e => ipcRenderer.send("destroy-window", e))
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
            navigator.mediaSession.setPositionState({
                // #bug Position not recognized by Electron
                duration, "playbackRate": 1, position
            })
            const played = `&nbsp;${formatTime(position)}/${
                formatTime(duration)}&nbsp;`
            const perc = `${position / duration * 100}%`
            document.getElementById("progress-played").innerHTML = played
            document.getElementById("progress-played").style.width = perc
            document.getElementById("progress-string").innerHTML = played
            document.getElementById("fs-progress-played").innerHTML = played
            document.getElementById("fs-progress-played").style.width = perc
            document.getElementById("fs-progress-string").innerHTML = played
            return
        }
        if (info.name === "playlist-pos" && info.data === 1) {
            const {increment} = require("./playlist")
            await increment(false)
            const {showLyrics} = require("./songs")
            const {currentAndNext, autoPlayOpts} = require("./playlist")
            const {current} = currentAndNext()
            showLyrics(current.id)
            autoPlayOpts()
        }
        if (info.name === "playlist-pos" && info.data === -1) {
            const {currentAndNext, playFromPlaylist} = require("./playlist")
            const {current} = currentAndNext()
            current.stopAfter = false
            stoppedAfterTrack = true
            playFromPlaylist(false)
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
    ipcRenderer.on("window-close", async() => {
        await mpv.command("quit").catch(() => null)
        ipcRenderer.send("destroy-window")
    })
    navigator.mediaSession.setActionHandler("play", pause)
    navigator.mediaSession.setActionHandler("pause", pause)
    navigator.mediaSession.setActionHandler("stop", () => {
        // #bug Workaround for Electron stopping audio element playback
        const {
            displayCurrentSong, currentAndNext, stopAfterTrack
        } = require("./playlist")
        const {current} = currentAndNext()
        displayCurrentSong(current)
        stopAfterTrack()
    })
    navigator.mediaSession.setActionHandler("seekbackward", () => null)
    navigator.mediaSession.setActionHandler("seekforward", () => null)
    navigator.mediaSession.setActionHandler(
        "seekto", details => mpv.command("seek", details.seekTime, "absolute"))
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        const {decrement} = require("./playlist")
        decrement()
    })
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        const {increment} = require("./playlist")
        increment()
    })
}

const isAlive = () => hasAnySong && mpv

const updatePlayButton = async() => {
    if (!isAlive() || await mpv.get("pause")) {
        document.getElementById("pause").querySelector("img").src
            = "../img/play.png"
        document.getElementById("fs-pause").querySelector("img").src
            = "../img/play.png"
        navigator.mediaSession.playbackState = "paused"
        // #bug Workaround for (you guessed it) another Electron bug
        try {
            document.querySelector("audio").pause().catch(() => null)
        } catch {
            // There is no fallback for workarounds
        }
    } else {
        document.getElementById("pause").querySelector("img").src
            = "../img/pause.png"
        document.getElementById("fs-pause").querySelector("img").src
            = "../img/pause.png"
        navigator.mediaSession.playbackState = "playing"
        // #bug Workaround for (you guessed it) another Electron bug
        try {
            document.querySelector("audio").play().catch(() => null)
        } catch {
            // There is no fallback for workarounds
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

module.exports = {
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
