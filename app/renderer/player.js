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
const {formatTime} = require("./util")
const {ipcRenderer} = require("electron")

const mpv = new mpvAPI({"audio_only": true})
let hasAnySong = false

const init = () => {
    mpv.start().then(() => {
        mpv.on("status", async info => {
            console.log(`${info.property}: ${info.value}`)
            if (info.property === "playlist-pos" && info.value === 1) {
                const {increment} = require("./playlist")
                await increment(false)
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
                    duration, "position": seconds, "playbackRate": 1
                })
                document.getElementById("progress-played").innerHTML
                    = `${formatTime(seconds)}/${formatTime(duration)}`
                document.getElementById("progress-played").style.width
                    = `${seconds / duration * 100}%`
                document.getElementById("progress-string").innerHTML
                    = `${formatTime(seconds)}/${formatTime(duration)}`
            } catch {
                // No duration yet
            }
        }, 100)
        // TODO
        // ACTIONS:
        // mute(set) - if not set, toggle
        // volume(vol)
        // INFO:
        // isMuted()
        // FINALLY:
        // mpv.quit()
    }).catch(e => {
        console.log(e)
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
        // TODO Toggle stop after this track
    })
    navigator.mediaSession.setActionHandler("play", pause)
    navigator.mediaSession.setActionHandler("pause", pause)
    navigator.mediaSession.setActionHandler("stop", () => {
        // #bug Workaround for Electron stopping audio element playback
        const {displaySong, currentAndNext} = require("./playlist")
        const {current} = currentAndNext()
        displaySong(current)
        // TODO Toggle stop after this track
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
        } catch {}
    } else {
        document.getElementById("pause").querySelector("img").src
            = "../img/pause.png"
        navigator.mediaSession.playbackState = "playing"
        // #bug Workaround for (you guessed it) another Electron bug
        try {
            document.querySelector("audio").play()
        } catch {}
    }
}

const pause = async() => {
    if (isAlive()) {
        await mpv.togglePause()
    } else {
        const {playFromPlaylist} = require("./playlist")
        playFromPlaylist()
    }
}

const seek = async percent => {
    if (isAlive()) {
        const duration = await mpv.getDuration()
        await mpv.seek(percent * duration, "absolute")
    }
}

const load = async file => {
    hasAnySong = true
    await mpv.load(file)
    await mpv.play()
}

const queue = async file => {
    await mpv.clearPlaylist()
    await mpv.append(file)
}

module.exports = {isAlive, init, seek, pause, load, queue, updatePlayButton}
