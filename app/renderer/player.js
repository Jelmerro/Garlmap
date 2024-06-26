/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2021-2024 Jelmer van Arnhem
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
import {
    autoPlayOpts,
    currentAndNext,
    decrementSong,
    incrementSong,
    playFromPlaylist,
    stopAfterTrack
} from "./playlist.js"
import {deleteFolder, formatTime, joinPath} from "../util.js"
import {shiftLyricsByPercentage, showLyrics} from "./lyrics.js"
import {coverArt} from "./songs.js"
import {ipcRenderer} from "electron"
import mpvAPI from "./mpv.js"

let mpv = null
let volume = 100
let hasAnySong = false
let stoppedAfterTrack = false
const audioEl = document.createElement("audio")
document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(audioEl)
})

export const init = (path, configDir) => {
    mpv = mpvAPI({
        "args": [
            "--no-video", "--no-audio-display", "--no-config", "--idle=yes"
        ],
        "options": {"detached": true, "shell": false},
        path
    }).on("error", e => ipcRenderer.send("destroy-window", e))
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
            const {current} = currentAndNext()
            const {duration} = current
            navigator.mediaSession.setPositionState({
                duration, "playbackRate": 1, position
            })
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
                shiftLyricsByPercentage(parseFloat(perc))
            }
            return
        }
        if (info.name === "playlist-pos" && info.data === 1) {
            await incrementSong(false)
            const {current} = currentAndNext()
            await showLyrics(current.id)
            autoPlayOpts()
        }
        if (info.name === "playlist-pos" && info.data === -1) {
            const {current} = currentAndNext()
            current.stopAfter = false
            stoppedAfterTrack = true
            await playFromPlaylist(false)
            await mpv.set("pause",
                !document.getElementById("toggle-autoplay").checked)
            updatePlayButton()
        }
    })
    mpv.on("unpause", updatePlayButton)
    mpv.on("stop", updatePlayButton)
    mpv.on("pause", updatePlayButton)
    // Listen for media and such
    ipcRenderer.on("media-pause", pause)
    ipcRenderer.on("media-prev", () => {
        decrementSong()
    })
    ipcRenderer.on("media-next", () => {
        incrementSong()
    })
    ipcRenderer.on("media-stop", () => {
        stopAfterTrack()
    })
    ipcRenderer.on("window-close", () => {
        deleteFolder(joinPath(configDir, "Crashpad"))
        mpv.command("quit").catch(() => null)
        ipcRenderer.send("destroy-window")
    })
    navigator.mediaSession.setActionHandler("play", pause)
    navigator.mediaSession.setActionHandler("pause", pause)
    navigator.mediaSession.setActionHandler("stop", () => {
        stopAfterTrack()
    })
    navigator.mediaSession.setActionHandler("seekbackward", () => null)
    navigator.mediaSession.setActionHandler("seekforward", () => null)
    navigator.mediaSession.setActionHandler("seekto",
        details => mpv.command("seek", details.seekTime, "absolute"))
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        decrementSong()
    })
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        incrementSong()
    })
    navigator.mediaSession.playbackState = "paused"
}

export const isAlive = () => hasAnySong && mpv

const updatePlayButton = async() => {
    if (!isAlive() || await mpv.get("pause")) {
        document.getElementById("pause").querySelector("img").src
            = "../img/play.png"
        document.getElementById("fs-pause").querySelector("img").src
            = "../img/play.png"
        navigator.mediaSession.playbackState = "paused"
        audioEl.pause()
    } else {
        document.getElementById("pause").querySelector("img").src
            = "../img/pause.png"
        document.getElementById("fs-pause").querySelector("img").src
            = "../img/pause.png"
        navigator.mediaSession.playbackState = "playing"
        audioEl.play().catch(() => null)
    }
}

export const pause = async() => {
    if (isAlive() && !stoppedAfterTrack) {
        await mpv.set("pause", !await mpv.get("pause"))
    } else {
        playFromPlaylist()
        stoppedAfterTrack = false
    }
    updatePlayButton()
}

export const relativeSeek = async seconds => {
    if (isAlive() && !stoppedAfterTrack) {
        await mpv.command("seek", seconds, "relative")
    }
}

export const seek = async percent => {
    if (isAlive() && !stoppedAfterTrack) {
        const {current} = currentAndNext()
        const {duration} = current
        await mpv.command("seek", percent * duration / 100, "absolute")
    }
}

export const load = async file => {
    hasAnySong = true
    stoppedAfterTrack = false
    document.getElementById("volume-slider").disabled = null
    document.getElementById("fs-volume-slider").disabled = null
    await mpv.command("loadfile", file)
    await mpv.set("pause", false)
}

export const queue = async file => {
    await mpv.command("playlist-clear")
    if (file) {
        await mpv.command("loadfile", file, "append")
    }
}

export const volumeSet = async vol => {
    volume = Math.min(130, Math.max(0, vol))
    await updateVolume()
}

export const volumeUp = async() => {
    volume = Math.min(130, volume + 10)
    await updateVolume()
}

export const volumeDown = async() => {
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

export const toggleMute = async() => {
    if (isAlive()) {
        await mpv.set("mute", !await mpv.get("mute"))
    }
    await updateVolume()
}

export const stopPlayback = async() => {
    if (isAlive()) {
        await mpv.command("stop").catch(() => null)
    }
}

export const displayCurrentSong = async song => {
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
    // MediaSession details
    const cover = await coverArt(song.path)
    if (cover) {
        document.getElementById("song-cover").src = cover
        document.getElementById("song-cover").style.display = "initial"
        document.getElementById("fs-song-cover").src = cover
        document.getElementById("fs-song-cover").style.display = "initial"
        navigator.mediaSession.metadata = new window.MediaMetadata({
            ...song, "artwork": [{"src": cover}]
        })
    } else {
        document.getElementById("song-cover").removeAttribute("src")
        document.getElementById("song-cover").style.display = "none"
        document.getElementById("fs-song-cover").removeAttribute("src")
        document.getElementById("fs-song-cover").style.display = "none"
        navigator.mediaSession.metadata = new window.MediaMetadata({...song})
    }
    audioEl.src = "./empty.mp3"
    audioEl.loop = true
    audioEl.pause()
    await audioEl.play().catch(() => null)
    updatePlayButton()
}
