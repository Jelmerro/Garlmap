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
import {append, currentAndNext} from "./playlist.js"
import {formatTime, isElement} from "../util.js"
import {songById} from "./songs.js"

/** @typedef {"playlist"
 *   |"search"
 *   |"searchbox"
 *   |"fullscreen"
 *   |"events"
 *   |"infopanel"
 *   |"lyrics"
 *   |"lyricssearch"
 *   |"lyricseditor"
 *   |"settingseditor"
 * } Section */

/** @type {Section[]} */
const sections = [
    "playlist",
    "search",
    "searchbox",
    "fullscreen",
    "events",
    "infopanel",
    "lyrics",
    "lyricssearch",
    "lyricseditor",
    "settingseditor"
]

/**
 * Check if a string is a valid section name.
 * @param {any} section
 * @returns {section is Section}
 */
export const isValidSection = section => sections.includes(section)

/**
 * Generate a new song element to be shown in the list based on a song.
 * @param {import("./songs.js").Song} song
 */
export const generateSongElement = song => {
    const songContainer = document.createElement("div")
    songContainer.setAttribute("song-id", song.id)
    songContainer.className = "song"
    const mainInfo = document.createElement("span")
    mainInfo.className = "main-info"
    if (!song.title || !song.artist) {
        mainInfo.textContent = song.id
        mainInfo.classList.add("id-only")
        songContainer.appendChild(mainInfo)
        return songContainer
    }
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
    bundledInfo.textContent = formatTime(song.duration)
    if (song.track || song.disc) {
        bundledInfo.textContent += ` ${song.track || "?"}/${song.tracktotal
            || "?"} on CD ${song.disc || "?"}/${song.disctotal || "?"}`
    }
    if (song.date) {
        bundledInfo.textContent += ` from ${song.date}`
    }
    otherInfo.appendChild(bundledInfo)
    songContainer.appendChild(otherInfo)
    return songContainer
}

/** Update the button label to add a single song or all results as a rule. */
const updateAddSongsButton = () => {
    const addSongsEl = document.getElementById("add-songs")
    if (!addSongsEl) {
        return
    }
    if (document.querySelector("#search-results .selected")) {
        addSongsEl.textContent = "Add song"
    } else {
        addSongsEl.textContent = "Add rule"
    }
}

/**
 * Switch the main focus of the app to another section by name.
 * @param {Section} newFocus
 */
export const switchFocus = async newFocus => {
    // Valid focus points for the entire app are:
    // - playlist (playlist section to highlight songs/rules to play or remove)
    // - search (search section results, not the search box itself)
    // - searchbox (search box for looking up new songs to play)
    // - fullscreen (only for the fullscreen layout, not the browser fullscreen)
    // - events (event history dialog, not the status bar in the main view)
    // - infopanel (read-only view of all the info of a single song)
    // - lyrics (lyrics editor dialog, not the lyrics pane in the main view)
    //   - Also the focus when inside the dialog but not searching or editing
    //   - Also the focus when selecting search results after searching Genius
    // - lyricssearch (lyrics search box in the dialog for searching Genius api)
    // - lyricseditor (manual lyrics edit box inside the lyrics dialog)
    // - settingseditor (simple editor for advanced/startup settings)
    const currentFocus = document.body.getAttribute("focus-el")
    document.body.setAttribute("focus-el", newFocus.replace("box", ""))
    if (newFocus === "playlist") {
        document.body.setAttribute("last-main-focus", "playlist")
        document.getElementById("playlist-container")?.focus()
    }
    const eventsEL = document.getElementById("events")
    if (eventsEL) {
        if (newFocus === "events") {
            eventsEL.style.display = "flex"
        } else {
            eventsEL.style.display = "none"
        }
    }
    const infopanelEL = document.getElementById("infopanel")
    if (infopanelEL) {
        if (newFocus === "infopanel") {
            infopanelEL.style.display = "flex"
        } else {
            infopanelEL.style.display = "none"
        }
    }
    const settingsEditorEl = document.getElementById("settings-editor")
    if (settingsEditorEl) {
        if (newFocus === "settingseditor") {
            settingsEditorEl.style.display = "flex"
        } else {
            settingsEditorEl.style.display = "none"
        }
    }
    const lyricseditorEl = document.getElementById("lyrics-editor")
    if (lyricseditorEl) {
        if (newFocus.startsWith("lyrics")) {
            lyricseditorEl.style.display = "flex"
            const selected = document.querySelector("#lyrics-results .selected")
            if (newFocus === "lyricseditor") {
                document.getElementById("lyrics-edit-field")?.focus()
            } else if (!selected || newFocus.endsWith("search")) {
                selected?.classList.remove("selected")
                document.body.setAttribute("focus-el", "lyricssearch")
                document.getElementById("lyrics-search")?.focus()
            } else {
                selected.scrollIntoView({"block": "nearest"})
                document.getElementById("lyrics-edit-field")?.blur()
                document.getElementById("lyrics-search")?.blur()
            }
        } else {
            lyricseditorEl.style.display = "none"
        }
    }
    const fullscreenEl = document.getElementById("fullscreen")
    if (fullscreenEl) {
        if (newFocus === "fullscreen") {
            fullscreenEl.style.display = "flex"
            if (document.fullscreenElement) {
                await document.exitFullscreen()
                fullscreenEl.requestFullscreen()
            }
        } else if (currentFocus === "fullscreen") {
            fullscreenEl.style.display = "none"
            if (document.fullscreenElement) {
                await document.exitFullscreen()
                document.body.requestFullscreen()
            }
        }
    }
    if (newFocus.startsWith("search")) {
        document.body.setAttribute("last-main-focus", "search")
        const selected = document.querySelector("#search-results .selected")
        if (!selected || newFocus.endsWith("box")) {
            selected?.classList.remove("selected")
            document.body.setAttribute("focus-el", "search")
            document.getElementById("rule-search")?.focus()
        } else {
            selected.scrollIntoView({"block": "nearest"})
        }
    } else {
        document.getElementById("rule-search")?.blur()
    }
    updateAddSongsButton()
}

/** Closes any "special" mode, like fullscreen or the modal/dialog ones. */
export const closeSpecialMode = async() => {
    const lastFocus = document.body.getAttribute("last-main-focus")
    if (isValidSection(lastFocus)) {
        await switchFocus(lastFocus)
    } else {
        await switchFocus("search")
    }
}

/**
 * Switch to a new fullscreen layout, could be browser, layout or both.
 * @param {boolean} browserFS
 * @param {boolean} layoutFS
 */
export const setFullscreenLayout = async(browserFS, layoutFS) => {
    const currentFocus = document.body.getAttribute("focus-el")
    if (document.fullscreenElement) {
        await document.exitFullscreen()
    }
    if (layoutFS) {
        await switchFocus("fullscreen")
        if (browserFS) {
            document.getElementById("fullscreen")?.requestFullscreen()
        }
        return
    }
    if (currentFocus === "fullscreen") {
        await closeSpecialMode()
    }
    if (browserFS) {
        document.body.requestFullscreen()
    }
}

/**
 * Show the infopanel with current song information.
 * @param {"playlist"|"search"|"current"} position
 */
export const showSongInfo = position => {
    let song = null
    if (position === "playlist") {
        const id = document.querySelector("#playlist-container .selected")
            ?.getAttribute("song-id")
        if (id) {
            song = songById(id)
        }
    }
    if (position === "search") {
        const id = document.querySelector("#search-results .selected.song")
            ?.getAttribute("song-id")
        if (id) {
            song = songById(id)
        }
    }
    if (position === "current") {
        const {current} = currentAndNext()
        song = songById(current?.id)
    }
    const infopanelDetailsEl = document.getElementById("infopanel-details")
    if (infopanelDetailsEl && song) {
        infopanelDetailsEl.textContent = JSON.stringify(song, null, 4)
        switchFocus("infopanel")
    }
}

/** Move to the previous result in the search result list. */
export const decrementSelectedSearch = () => {
    const selected = document.querySelector("#search-results .selected.song")
    if (selected) {
        if (isElement(selected.previousSibling)) {
            selected.previousSibling.classList.add("selected")
        } else {
            document.getElementById("rule-search")?.focus()
        }
        selected.classList.remove("selected")
    }
    document.querySelector("#search-results .selected")
        ?.scrollIntoView({"block": "nearest"})
    updateAddSongsButton()
}

/** Move to the next result in the search result list, or the first if none. */
export const incrementSelectedSearch = () => {
    const selected = document.querySelector("#search-results .selected.song")
    if (selected) {
        if (isElement(selected.nextSibling)) {
            selected.nextSibling.classList.add("selected")
            selected.classList.remove("selected")
        }
    } else {
        const song = document.querySelector("#search-results .song")
        if (song) {
            song.classList.add("selected")
            document.getElementById("rule-search")?.blur()
        }
    }
    document.querySelector("#search-results .selected")
        ?.scrollIntoView({"block": "nearest"})
    updateAddSongsButton()
}

/**
 * Append the selected song to the playlist, either up next or at the end.
 * @param {boolean} upNext
 */
export const appendSelectedSong = (upNext = false) => {
    const id = document.querySelector("#search-results .selected.song")
        ?.getAttribute("song-id")
    if (id) {
        append({"songs": [songById(id)]}, upNext)
    }
}
