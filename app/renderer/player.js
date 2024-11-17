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
import {
    deleteFolder, formatTime, isHTMLImageElement, isHTMLInputElement, joinPath
} from "../util.js"
import {shiftLyricsByPercentage, showLyrics} from "./lyrics.js"
import {coverArt} from "./songs.js"
import {ipcRenderer} from "electron"
import mpvAPI from "./mpv.js"

/** @type {ReturnType<typeof mpvAPI>|null} */
let mpv = null
let hasAnySong = false
let stoppedAfterTrack = false
const audioEl = document.createElement("audio")
document.addEventListener("DOMContentLoaded", () => {
    document.body.append(audioEl)
})

/** Checks if there are songs queued and mpv is defined. */
export const isAlive = () => hasAnySong && mpv

/** Update the play button based on the current play/pause state. */
const updatePlayButton = async() => {
    const pauseImg = document.getElementById("pause")?.querySelector("img")
    const pauseFsImg = document.getElementById("fs-pause")?.querySelector("img")
    if (!isAlive() || await mpv?.get("pause")) {
        if (pauseImg) {
            pauseImg.src = "../img/play.png"
        }
        if (pauseFsImg) {
            pauseFsImg.src = "../img/play.png"
        }
        navigator.mediaSession.playbackState = "paused"
        audioEl.pause()
    } else {
        if (pauseImg) {
            pauseImg.src = "../img/pause.png"
        }
        if (pauseFsImg) {
            pauseFsImg.src = "../img/pause.png"
        }
        navigator.mediaSession.playbackState = "playing"
        audioEl.play().catch(() => null)
    }
}

/** Pause the player. */
export const pause = async() => {
    if (isAlive() && !stoppedAfterTrack) {
        await mpv?.set("pause", !await mpv.get("pause"))
    } else {
        playFromPlaylist()
        stoppedAfterTrack = false
    }
    updatePlayButton()
}

/**
 * Seek with a relative amount of seconds.
 * @param {number} seconds
 */
export const relativeSeek = async seconds => {
    if (isAlive() && !stoppedAfterTrack) {
        await mpv?.command("seek", seconds, "relative")
    }
}

/**
 * Seek to a percentage of the song between 0 and 100.
 * @param {number} percent
 */
export const seek = async percent => {
    if (isAlive() && !stoppedAfterTrack) {
        const {current} = currentAndNext()
        const {duration} = current
        await mpv?.command("seek", percent * duration / 100, "absolute")
    }
}

/**
 * Load a new file into mpv and play it.
 * @param {string} file
 */
export const load = async file => {
    hasAnySong = true
    stoppedAfterTrack = false
    document.getElementById("volume-slider").disabled = null
    document.getElementById("fs-volume-slider").disabled = null
    await mpv?.command("loadfile", file)
    await mpv?.set("pause", false)
}

/**
 * Queue a new song into mpv to play after this one.
 * @param {string} file
 */
export const queue = async file => {
    await mpv?.command("playlist-clear")
    if (file) {
        await mpv?.command("loadfile", file, "append")
    }
}

/** Return the current volume based on the slider. */
const getCurrentVolume = () => {
    let volume = 100
    const volumeEl = document.getElementById("volume-slider")
    if (isHTMLInputElement(volumeEl)) {
        volume = Number(volumeEl.value)
    }
    return volume
}

/**
 * Update the player volume and other slider states based on volume/mute state.
 * @param {number} volume
 */
const updateVolume = async volume => {
    if (isAlive()) {
        await mpv?.set("volume", volume)
    }
    const volumeEl = document.getElementById("volume-slider")
    const volumeFsEl = document.getElementById("fs-volume-slider")
    if (!isHTMLInputElement(volumeEl) || !isHTMLInputElement(volumeFsEl)) {
        return
    }
    if (isAlive()) {
        volumeEl.value = String(volume)
        volumeFsEl.value = String(volume)
    } else {
        volumeEl.value = "100"
        volumeFsEl.value = "100"
    }
    if (isAlive() && await mpv?.get("mute")) {
        volumeEl.className = "muted"
        volumeFsEl.className = "muted"
    } else {
        volumeEl.className = ""
        volumeFsEl.className = ""
    }
}

/**
 * Set the volume to a new level.
 * @param {number} vol
 */
export const volumeSet = async vol => {
    await updateVolume(Math.min(130, Math.max(0, vol)))
}

/** Jump up the volume by 10 steps. */
export const volumeUp = async() => {
    await updateVolume(Math.min(130, getCurrentVolume() + 10))
}

/** Jump down the volume by 10 steps. */
export const volumeDown = async() => {
    await updateVolume(Math.max(0, getCurrentVolume() - 10))
}

/** Toggle the mute state. */
export const toggleMute = async() => {
    if (isAlive()) {
        await mpv?.set("mute", !await mpv.get("mute"))
    }
    await updateVolume(getCurrentVolume())
}

/** Stop playback of mpv if alive. */
export const stopPlayback = async() => {
    if (isAlive()) {
        await mpv?.command("stop")?.catch(() => null)
    }
}

/**
 * Display the current song in the info bars.
 * @param {import("./songs.js").Song} song
 */
export const displayCurrentSong = async song => {
    const els = [
        document.getElementById("current-song"),
        document.getElementById("fs-current-song")
    ].flatMap(e => e ?? [])
    for (const songContainer of els) {
        if (!song) {
            songContainer.textContent = "Welcome to Garlmap"
            continue
        }
        songContainer.textContent = ""
        const titleEl = document.createElement("span")
        titleEl.className = "title"
        titleEl.textContent = song.title
        songContainer.append(titleEl)
        if (!song.title || !song.artist) {
            titleEl.textContent = song.id
            continue
        }
        const artistEl = document.createElement("span")
        artistEl.className = "artist"
        artistEl.textContent = song.artist
        songContainer.append(artistEl)
        const otherInfo = document.createElement("span")
        otherInfo.className = "other-info"
        const albumEl = document.createElement("span")
        albumEl.className = "album"
        albumEl.textContent = song.album
        otherInfo.append(albumEl)
        const bundledInfo = document.createElement("span")
        if (song.track || song.disc) {
            bundledInfo.textContent = ` ${song.track || "?"}/${song.tracktotal
                || "?"} on CD ${song.disc || "?"}/${song.disctotal || "?"}`
        }
        if (song.date) {
            bundledInfo.textContent += ` from ${song.date}`
        }
        otherInfo.append(bundledInfo)
        songContainer.append(otherInfo)
    }
    if (!song) {
        return
    }
    // MediaSession details
    const cover = await coverArt(song.path)
    const songCoverEl = document.getElementById("song-cover")
    const songCoverFsEl = document.getElementById("fs-song-cover")
    if (cover) {
        if (isHTMLImageElement(songCoverEl)) {
            songCoverEl.src = cover
            songCoverEl.style.display = "initial"
        }
        if (isHTMLImageElement(songCoverFsEl)) {
            songCoverFsEl.src = cover
            songCoverFsEl.style.display = "initial"
        }
        navigator.mediaSession.metadata = new window.MediaMetadata({
            ...song, "artwork": [{"src": cover}]
        })
    } else {
        if (songCoverEl) {
            songCoverEl.removeAttribute("src")
            songCoverEl.style.display = "none"
        }
        if (songCoverFsEl) {
            songCoverFsEl.removeAttribute("src")
            songCoverFsEl.style.display = "none"
        }
        navigator.mediaSession.metadata = new window.MediaMetadata({...song})
    }
    audioEl.src = "./empty.mp3"
    audioEl.loop = true
    audioEl.pause()
    await audioEl.play().catch(() => null)
    updatePlayButton()
}

/**
 * Initialize the player based on the mpv executable location and config dir.
 * @param {string} path
 * @param {string} configDir
 */
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
            if (document.getElementById("toggle-shift-lyrics")?.checked) {
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
            await mpv?.set("pause",
                !document.getElementById("toggle-autoplay")?.checked)
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
        mpv?.command("quit")?.catch(() => null)
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
        details => mpv?.command("seek", details.seekTime, "absolute"))
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        decrementSong()
    })
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        incrementSong()
    })
    navigator.mediaSession.playbackState = "paused"
}
