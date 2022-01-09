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

const mpvAPI = require("node-mpv")
const {formatTime} = require("../util")
const {ipcRenderer} = require("electron")

const mpv = new mpvAPI({"audio_only": true})
let volume = 100
let hasAnySong = false
let stoppedAfterTrack = false

const init = () => {
    mpv.start().then(() => {
        mpv.on("status", async info => {
            console.info(`${info.property}: ${info.value}`)
            if (!isAlive()) {
                return
            }
            if (info.property === "playlist-pos" && info.value === 1) {
                const {increment} = require("./playlist")
                await increment(false)
                document.getElementById("status-scan").textContent = ""
                const {showLyrics} = require("./songs")
                const {currentAndNext} = require("./playlist")
                const {current} = currentAndNext()
                showLyrics(current.path)
            }
            if (info.property === "playlist-pos" && info.value === -1) {
                const {currentAndNext, playFromPlaylist} = require("./playlist")
                const {current} = currentAndNext()
                current.stopAfter = false
                stoppedAfterTrack = true
                playFromPlaylist(false)
                await mpv.pause()
                updatePlayButton()
            }
        })
        mpv.on("started", updatePlayButton)
        mpv.on("resumed", updatePlayButton)
        mpv.on("stopped", updatePlayButton)
        mpv.on("paused", updatePlayButton)
        setInterval(async() => {
            try {
                const seconds = Math.max(await mpv.getTimePosition(), 0)
                const duration = await mpv.getDuration() || 0
                navigator.mediaSession.setPositionState({
                    // #bug Position not recognized by Electron
                    duration, "playbackRate": 1, "position": seconds
                })
                document.getElementById("progress-played").innerHTML = `&nbsp;${
                    formatTime(seconds)}/${formatTime(duration)}&nbsp;`
                document.getElementById("progress-played").style.width
                    = `${seconds / duration * 100}%`
                document.getElementById("progress-string").innerHTML = `&nbsp;${
                    formatTime(seconds)}/${formatTime(duration)}&nbsp;`
            } catch {
                // No duration yet
            }
        }, 100)
    }).catch(e => {
        ipcRenderer.send("destroy-window", JSON.stringify(e, null, 3))
    })
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
        try {
            await mpv.quit()
        } catch {
            // Never started in the first place, or was killed separately
        }
        try {
            await mpv.command("quit")
        } catch {
            // Probably not running anymore, maybe it was killed separately
        }
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
        "seekto", details => mpv.seek(details.seekTime, "absolute"))
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        const {decrement} = require("./playlist")
        decrement()
    })
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        const {increment} = require("./playlist")
        increment()
    })
}

const isAlive = () => hasAnySong

const updatePlayButton = async() => {
    if (!isAlive() || await mpv.isPaused()) {
        document.getElementById("pause").querySelector("img").src
            = "../img/play.png"
        navigator.mediaSession.playbackState = "paused"
        // #bug Workaround for (you guessed it) another Electron bug
        try {
            document.querySelector("audio").pause()
        } catch {
            // There is no fallback for workarounds
        }
    } else {
        document.getElementById("pause").querySelector("img").src
            = "../img/pause.png"
        navigator.mediaSession.playbackState = "playing"
        // #bug Workaround for (you guessed it) another Electron bug
        try {
            document.querySelector("audio").play()
        } catch {
            // There is no fallback for workarounds
        }
    }
}

const pause = async() => {
    if (isAlive() && !stoppedAfterTrack) {
        await mpv.togglePause()
    } else {
        const {playFromPlaylist} = require("./playlist")
        playFromPlaylist()
        stoppedAfterTrack = false
    }
}

const seek = async percent => {
    if (isAlive() && !stoppedAfterTrack) {
        const duration = await mpv.getDuration()
        await mpv.seek(percent * duration, "absolute")
    }
}

const load = async file => {
    hasAnySong = true
    stoppedAfterTrack = false
    document.querySelector("input[type='range']").disabled = null
    await mpv.load(file)
    await mpv.play()
}

const queue = async file => {
    await mpv.clearPlaylist()
    if (file) {
        await mpv.append(file)
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
        await mpv.volume(volume)
    } else {
        volume = 100
    }
    document.querySelector("input[type='range']").value = volume
    if (isAlive() && await mpv.isMuted()) {
        document.querySelector("input[type='range']").className = "muted"
    } else {
        document.querySelector("input[type='range']").className = ""
    }
}

const toggleMute = async() => {
    if (isAlive()) {
        await mpv.mute()
    }
    await updateVolume()
}

module.exports = {
    init,
    isAlive,
    load,
    pause,
    queue,
    seek,
    toggleMute,
    updatePlayButton,
    volumeDown,
    volumeSet,
    volumeUp
}
