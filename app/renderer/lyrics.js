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
    basePath,
    dirName,
    getInputNumber,
    getInputValue,
    isElement,
    isHTMLInputElement,
    isHTMLTextAreaElement,
    isInputChecked,
    joinPath,
    notify,
    readFile,
    resetWelcome
} from "../util.js"
import {getSong, updateLyricsOfSong} from "./songs.js"
import {compareStrings} from "./compare-strings.js"
import {currentAndNext} from "./playlist.js"
import geniusLyrics from "genius-lyrics"
import {isAlive} from "./player.js"
import {switchFocus} from "./dom.js"

/** @type {number|null} */
let shiftLyricsTimeout = null
let showingLyrics = false
/** @type {import("genius-lyrics").Song[]} */
let lyricsSearchCache = []

/**
 * Short alias for lowercasing a string.
 * @param {string} s
 */
const low = s => s.toLowerCase()

/**
 * Sanitize the lyrics (if found) by resetting the newlines.
 * @param {string|null} lyrics
 */
export const sanitizeLyrics = lyrics => lyrics?.trim()
    .replace(/\n\[/g, "\n\n[").replace(/\n\n\n/g, "\n\n") || ""

/**
 * Fetch lyrics for a given song TODO.
 * @param {import("./songs.js").Song} req
 * @param {boolean} force
 * @param {import("./songs.js").Song|null} originalReq
 */
export const fetchLyrics = async(req, force = false, originalReq = null) => {
    const songInfoEl = document.getElementById("song-info")
    const fsLyricsEl = document.getElementById("fs-lyrics")
    const lyricsEditEl = document.getElementById("lyrics-edit-field")
    if (!songInfoEl || !fsLyricsEl || !isHTMLTextAreaElement(lyricsEditEl)) {
        return
    }
    // Use cache
    const cachedLyrics = getSong(req.id, req.path)?.lyrics
    if (cachedLyrics && !force) {
        songInfoEl.textContent = cachedLyrics
        fsLyricsEl.textContent = cachedLyrics
        lyricsEditEl.textContent = cachedLyrics
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
                songInfoEl.textContent = lyrics
                fsLyricsEl.textContent = lyrics
                lyricsEditEl.value = lyrics
                showingLyrics = true
            }
            updateLyricsOfSong(req.id, req.path, lyrics)
            return
        }
    }
    // Fetch it from Genius
    if (!isInputChecked("toggle-genius")) {
        return
    }
    const apiKey = getInputValue("setting-apikey") || undefined
    const genius = new geniusLyrics.Client(apiKey)
    try {
        notify(`Searching Genius for the song lyrics of: ${
            req.title} ${req.artist}`, "info")
        /** @type {(import("genius-lyrics").Song & {score?: number})[]} */
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
        results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        const [song] = results
        if (song && (song.score ?? 0) > 1.6) {
            let lyrics = "[Instrumental]"
            if (!song.instrumental) {
                lyrics = sanitizeLyrics(await song.lyrics())
            }
            if (currentAndNext().current?.id === req.id) {
                songInfoEl.textContent = lyrics
                fsLyricsEl.textContent = lyrics
                lyricsEditEl.value = lyrics
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

/**
 * Shift the lyrics pane by a certain percentage.
 * @param {number} current
 */
export const shiftLyricsByPercentage = current => {
    const lyricsContainers = [document.getElementById("fs-lyrics")]
    if (showingLyrics) {
        lyricsContainers.push(document.getElementById("song-info"))
    }
    const lineheight = parseFloat(getComputedStyle(document.body).lineHeight)
    for (const el of lyricsContainers) {
        if (!el?.scrollHeight) {
            return
        }
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

/** Stun the automatic shifting of lyrics based on the shifttimer delay. */
export const stunShiftLyrics = () => {
    if (!showingLyrics) {
        if (document.body.getAttribute("focus-el") !== "fullscreen") {
            return
        }
    }
    if (shiftLyricsTimeout) {
        clearTimeout(shiftLyricsTimeout)
    }
    const shiftLyricsToggle = document.getElementById("toggle-shift-lyrics")
    if (!isHTMLInputElement(shiftLyricsToggle)) {
        return
    }
    shiftLyricsToggle.checked = false
    if (getInputNumber("setting-shift-timer") > 0) {
        shiftLyricsTimeout = window.setTimeout(() => {
            shiftLyricsToggle.checked = true
        }, getInputNumber("setting-shift-timer") * 1000)
    }
}

/** Find a list of songs by search query and show it. */
export const searchLyrics = async() => {
    const searchString = getInputValue("lyrics-search").trim()
    const resultsContainer = document.getElementById("lyrics-results")
    if (!searchString || !resultsContainer) {
        return
    }
    resultsContainer.textContent = "Searching Genius..."
    const apiKey = getInputValue("setting-apikey") || undefined
    const genius = new geniusLyrics.Client(apiKey)
    const results = await genius.songs.search(searchString).catch(e => {
        notify(`Failed to fetch lyrics from Genius for: ${searchString}`)
        console.warn(e)
    })
    lyricsSearchCache = results || []
    resultsContainer.textContent = ""
    results?.forEach(result => {
        const el = document.createElement("div")
        el.textContent = `${result.title} - ${result.artist.name}`
        resultsContainer.append(el)
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
    await updateLyricsOfSong(
        current.id, current.path, getInputValue("lyrics-edit-field"))
    showLyrics(current.id)
}

export const selectLyricsFromResults = async() => {
    const resultsContainer = document.getElementById("lyrics-results")
    const selected = resultsContainer?.querySelector(".selected")
    if (!resultsContainer || !selected) {
        return
    }
    const index = [...resultsContainer.children].indexOf(selected)
    if (lyricsSearchCache[index]) {
        const editor = document.getElementById("lyrics-edit-field")
        if (!isHTMLTextAreaElement(editor)) {
            return
        }
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
    document.getElementById("song-info")?.scrollTo(0, 0)
    showingLyrics = false
}

/** Reset help, then show updated lyrics in the sidebar, editor and fullscreen.
 * @param {string} id
 */
export const showLyrics = async id => {
    if (showingLyrics) {
        resetShowingLyrics()
    }
    if (!isInputChecked("toggle-autolyrics")) {
        return
    }
    const fsLyricsEl = document.getElementById("fs-lyrics")
    const lyricsEditEl = document.getElementById("lyrics-edit-field")
    const songInfoEl = document.getElementById("song-info")
    fsLyricsEl?.scrollTo(0, 0)
    lyricsEditEl?.scrollTo(0, 0)
    const song = getSong(id)
    if (song?.lyrics) {
        showingLyrics = true
        if (fsLyricsEl) {
            fsLyricsEl.textContent = song.lyrics
        }
        if (isHTMLTextAreaElement(lyricsEditEl)) {
            lyricsEditEl.value = song.lyrics ?? ""
        }
        if (songInfoEl) {
            songInfoEl.textContent = song.lyrics
        }
    } else if (song) {
        if (fsLyricsEl) {
            fsLyricsEl.textContent = ""
        }
        if (isHTMLTextAreaElement(lyricsEditEl)) {
            lyricsEditEl.value = ""
        }
        await fetchLyrics(song)
    }
}

export const switchToLyrics = async(forceFetch = false) => {
    if (isAlive()) {
        const {current} = currentAndNext()
        if (current) {
            await fetchLyrics(current, forceFetch)
            document.getElementById("song-info")?.scrollTo(0, 0)
        }
    }
}

export const decrementSelectedLyrics = () => {
    const selected = document.querySelector("#lyrics-results .selected")
    if (!selected) {
        switchFocus("lyricssearch")
    }
    if (isElement(selected?.previousSibling)) {
        selected.classList.remove("selected")
        selected.previousSibling.classList.add("selected")
    } else {
        switchFocus("lyricssearch")
    }
}

export const incrementSelectedLyrics = () => {
    const selected = document.querySelector("#lyrics-results .selected")
    if (selected) {
        if (isElement(selected.nextSibling)) {
            selected.classList.remove("selected")
            selected.nextSibling.classList.add("selected")
        }
    } else {
        document.querySelector("#lyrics-results > *")
            ?.classList.add("selected")
    }
    switchFocus("lyrics")
}
