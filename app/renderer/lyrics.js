/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2022-2024 Jelmer van Arnhem
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
    basePath, dirName, joinPath, notify, readFile, resetWelcome
} from "../util.js"
import {songById, songByIdOrPath, updateLyricsOfSong} from "./songs.js"
import {compareStrings} from "./compare-strings.js"
import {currentAndNext} from "./playlist.js"
import geniusLyrics from "genius-lyrics"
import {isAlive} from "./player.js"
import {switchFocus} from "./dom.js"

let shiftLyricsTimeout = null
let showingLyrics = false
let lyricsSearchCache = []

const low = s => s.toLowerCase()

export const sanitizeLyrics = lyrics => lyrics?.trim()
    .replace(/\n\[/g, "\n\n[").replace(/\n\n\n/g, "\n\n") || ""

export const fetchLyrics = async(req, force = false, originalReq = false) => {
    // Use cache
    const cachedLyrics = songByIdOrPath(req.id, req.path).lyrics
    if (cachedLyrics && !force) {
        document.getElementById("song-info").textContent = cachedLyrics
        document.getElementById("fs-lyrics").textContent = cachedLyrics
        document.getElementById("lyrics-edit-field").textContent = cachedLyrics
        showingLyrics = true
        return
    }
    if (!req.artist || !req.title) {
        return
    }
    // Find it in a local file
    const txtPath = req.path.replace(/\.[^ .]+$/g, ".txt")
    const txtId = req.id.replace(/\.[^ .]+$/g, ".txt")
    const files = [
        txtPath,
        joinPath(dirName(txtPath), "Lyrics", basePath(txtPath)),
        joinPath(dirName(txtPath), "Tracklists", basePath(txtPath)),
        joinPath(req.path.replace(req.id, ""), "Lyrics", txtId),
        joinPath(req.path.replace(req.id, ""), "Tracklists", txtId)
    ]
    for (const file of files) {
        const lyrics = sanitizeLyrics(readFile(file))
        if (lyrics) {
            if (currentAndNext().current?.id === req.id) {
                document.getElementById("song-info").textContent = lyrics
                document.getElementById("fs-lyrics").textContent = lyrics
                document.getElementById("lyrics-edit-field").value = lyrics
                showingLyrics = true
            }
            updateLyricsOfSong(req.id, req.path, lyrics)
            return
        }
    }
    // Fetch it from Genius
    if (!document.getElementById("toggle-genius").checked) {
        return
    }
    const apiKey = document.getElementById("setting-apikey").value || undefined
    const genius = new geniusLyrics.Client(apiKey)
    try {
        notify(`Searching Genius for the song lyrics of: ${
            req.title} ${req.artist}`, "info")
        const results = await genius.songs.search(`${req.title} ${req.artist}`)
        results.forEach(s => {
            s.score = compareStrings(low(s.title), low(req.title))
                + compareStrings(low(s.artist.name), low(req.artist))
            if (originalReq) {
                const originalScore = compareStrings(
                    low(s.title), low(originalReq.title))
                + compareStrings(low(s.artist.name), low(originalReq.artist))
                if (originalScore > s.score) {
                    s.score = originalScore
                }
                const originalNameScore = compareStrings(
                    low(s.title), low(originalReq.title))
                + compareStrings(low(s.artist.name), low(req.artist))
                if (originalNameScore > s.score) {
                    s.score = originalNameScore
                }
                const originalArtistScore = compareStrings(
                    low(s.title), low(req.title))
                + compareStrings(low(s.artist.name), low(originalReq.artist))
                if (originalArtistScore > s.score) {
                    s.score = originalArtistScore
                }
            }
        })
        results.sort((a, b) => b.score - a.score)
        const [song] = results
        if (song && song.score > 1.6) {
            let lyrics = "[Instrumental]"
            if (!song.instrumental) {
                lyrics = sanitizeLyrics(await song.lyrics())
            }
            if (currentAndNext().current?.id === req.id) {
                document.getElementById("song-info").textContent = lyrics
                document.getElementById("fs-lyrics").textContent = lyrics
                document.getElementById("lyrics-edit-field").value = lyrics
                showingLyrics = true
            }
            updateLyricsOfSong(req.id, req.path, lyrics)
            notify(`Found matching lyrics for: ${req.title} ${
                req.artist}`, "success", false)
            return
        }
        notify(`Failed to find matching song lyrics in Genius results for: ${
            req.title} ${req.artist}`)
    } catch (e) {
        notify(`Failed to fetch lyrics from Genius for: ${
            req.title} ${req.artist}`)
        console.warn(e)
    }
    // Retry without text between brackets in song title and single artist
    if (originalReq) {
        return
    }
    if (currentAndNext().current?.id === req.id) {
        const reqWithoutExtraText = JSON.parse(JSON.stringify(req))
        reqWithoutExtraText.artist = req.artist.replace(/\(.*\)/g, "")
            .split(" featuring ")[0].split(" feat. ")[0]
            .split(" ft. ")[0].split(" & ")[0].trim()
        reqWithoutExtraText.title = req.title.replace(/\(.*\)/g, "").trim()
        if (reqWithoutExtraText.artist !== req.artist) {
            fetchLyrics(reqWithoutExtraText, force, req)
        } else if (reqWithoutExtraText.title !== req.title) {
            fetchLyrics(reqWithoutExtraText, force, req)
        }
    }
}

export const shiftLyricsByPercentage = current => {
    const lyricsContainers = [document.getElementById("fs-lyrics")]
    if (showingLyrics) {
        lyricsContainers.push(document.getElementById("song-info"))
    }
    const lineheight = parseFloat(getComputedStyle(document.body).lineHeight)
    for (const el of lyricsContainers.filter(e => e.scrollHeight)) {
        const scrollableHeight = el.scrollHeight - el.clientHeight
        const pad = Math.max(0, Math.min(
            el.clientHeight / el.scrollHeight * 50, 30))
        const percentage = (
            Math.min(Math.max(current, pad), 100 - pad) - pad
        ) / (100 - pad - pad)
        let newHeight = percentage * scrollableHeight
        if (lineheight) {
            newHeight -= newHeight % lineheight
            if (scrollableHeight - newHeight < lineheight) {
                newHeight = scrollableHeight
            }
            if (lineheight >= scrollableHeight) {
                newHeight = 0
                if (percentage > 0.5) {
                    newHeight = scrollableHeight
                }
            }
        }
        newHeight = Math.floor(newHeight)
        if (el.scrollTop !== newHeight) {
            el.scrollTo(0, newHeight)
        }
    }
}

export const stunShiftLyrics = () => {
    if (!showingLyrics) {
        if (document.body.getAttribute("focus-el") !== "fullscreen") {
            return
        }
    }
    if (shiftLyricsTimeout) {
        clearTimeout(shiftLyricsTimeout)
    }
    document.getElementById("toggle-shift-lyrics").checked = false
    if (Number(document.getElementById("setting-shift-timer").value) > 0) {
        shiftLyricsTimeout = setTimeout(() => {
            document.getElementById("toggle-shift-lyrics").checked = true
        }, Number(document.getElementById("setting-shift-timer").value) * 1000)
    }
}

export const searchLyrics = async searchString => {
    if (!searchString.trim()) {
        return
    }
    const resultsContainer = document.getElementById("lyrics-results")
    resultsContainer.textContent = "Searching Genius..."
    const apiKey = document.getElementById("setting-apikey").value || undefined
    const genius = new geniusLyrics.Client(apiKey)
    const results = await genius.songs.search(searchString.trim()).catch(e => {
        notify(`Failed to fetch lyrics from Genius for: ${searchString.trim()}`)
        console.warn(e)
    })
    lyricsSearchCache = results || []
    resultsContainer.textContent = ""
    results?.forEach(result => {
        const el = document.createElement("div")
        el.textContent = `${result.title} - ${result.artist.name}`
        resultsContainer.appendChild(el)
        el.addEventListener("click", () => {
            resultsContainer.querySelector(".selected")
                ?.classList.remove("selected")
            el.classList.add("selected")
            switchFocus("lyrics")
        })
        el.addEventListener("dblclick", () => selectLyricsFromResults())
    })
}

export const saveLyrics = async() => {
    const {current} = currentAndNext()
    if (!current) {
        return
    }
    const editor = document.getElementById("lyrics-edit-field")
    await updateLyricsOfSong(current.id, current.path, editor.value)
    showLyrics(current.id)
}

export const selectLyricsFromResults = async() => {
    const resultsContainer = document.getElementById("lyrics-results")
    const selected = resultsContainer.querySelector(".selected")
    const index = [...resultsContainer.children].indexOf(selected)
    if (lyricsSearchCache[index]) {
        const editor = document.getElementById("lyrics-edit-field")
        const previousLyrics = editor.value
        editor.value = "Fetching lyrics..."
        const cacheEntry = lyricsSearchCache[index]
        try {
            if (cacheEntry.instrumental) {
                editor.value = "[Instrumental]"
            } else {
                editor.value = sanitizeLyrics(await cacheEntry.lyrics())
            }
        } catch (e) {
            notify(`Failed to fetch lyrics from Genius for: ${
                cacheEntry.title} ${cacheEntry.artist.name}`)
            editor.value = previousLyrics
            console.warn(e)
        }
        editor.scrollTo(0, 0)
    }
}

export const resetShowingLyrics = () => {
    resetWelcome()
    document.getElementById("song-info").scrollTo(0, 0)
    showingLyrics = false
}

export const showLyrics = async p => {
    if (showingLyrics) {
        resetShowingLyrics()
    }
    if (!document.getElementById("toggle-autolyrics").checked) {
        return
    }
    document.getElementById("fs-lyrics").scrollTo(0, 0)
    document.getElementById("lyrics-edit-field").scrollTo(0, 0)
    const song = songById(p)
    document.getElementById("fs-lyrics").textContent = song.lyrics || ""
    document.getElementById("lyrics-edit-field").value = song.lyrics || ""
    if (song.lyrics) {
        showingLyrics = true
        document.getElementById("song-info").textContent = song.lyrics
    } else {
        await fetchLyrics(song)
    }
}

export const switchToLyrics = async(forceFetch = false) => {
    if (isAlive()) {
        const {current} = currentAndNext()
        if (current) {
            await fetchLyrics(current, forceFetch)
            document.getElementById("song-info").scrollTo(0, 0)
        }
    }
}

export const decrementSelectedLyrics = () => {
    const selected = document.querySelector("#lyrics-results .selected")
    if (!selected) {
        switchFocus("lyricssearch")
    }
    if (selected.previousSibling) {
        selected.classList.remove("selected")
        selected.previousSibling.classList.add("selected")
    } else {
        switchFocus("lyricssearch")
    }
}

export const incrementSelectedLyrics = () => {
    const selected = document.querySelector("#lyrics-results .selected")
    if (selected) {
        if (selected.nextSibling) {
            selected.classList.remove("selected")
            selected.nextSibling.classList.add("selected")
        }
    } else {
        document.querySelector("#lyrics-results > *")
            ?.classList.add("selected")
    }
    switchFocus("lyrics")
}
