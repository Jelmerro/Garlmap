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
    append,
    bottomScroll,
    bottomSelectedPlaylist,
    closeSelectedRule,
    decrementSelectedPlaylist,
    decrementSong,
    deleteSelectedPlaylist,
    exportList,
    importList,
    incrementSelectedPlaylist,
    incrementSong,
    openSelectedRule,
    playFromPlaylist,
    playSelectedSong,
    setFallbackRule,
    stopAfterLastTrackOfRule,
    stopAfterTrack,
    toggleAutoClose,
    toggleAutoRemove,
    toggleAutoScroll,
    topScroll,
    topSelectedPlaylist
} from "./playlist.js"
import {
    appendSelectedSong,
    closeSpecialMode,
    decrementSelectedSearch,
    generateSongElement,
    incrementSelectedSearch,
    setFullscreenLayout,
    showSongInfo,
    switchFocus
} from "./dom.js"
import {clipboard, ipcRenderer} from "electron"
import {
    decrementSelectedLyrics,
    incrementSelectedLyrics,
    resetShowingLyrics,
    saveLyrics,
    searchLyrics,
    selectLyricsFromResults,
    stunShiftLyrics,
    switchToLyrics
} from "./lyrics.js"
import {
    pause,
    relativeSeek,
    seek,
    toggleMute,
    volumeDown,
    volumeSet,
    volumeUp
} from "./player.js"
import {query, scanner} from "./songs.js"
import {
    saveSettings, toggleAutoLyrics, toggleGenius, toggleShiftLyrics
} from "./settings.js"
import {
    isHTMLElement, isHTMLInputElement, isHTMLTextAreaElement, queryMatch
} from "../util.js"

const isReady = () => document.getElementById(
    "status-current").textContent === "Ready"

const openFolder = () => {
    ipcRenderer.invoke("dialog-open", {
        "properties": ["openDirectory"], "title": "Open a folder"
    }).then(async info => {
        if (!info.canceled) {
            await scanner(info.filePaths[0])
            if (document.getElementById("toggle-autoplay").checked) {
                playFromPlaylist(true)
                pause()
            }
        }
    })
}

const toIdentifier = e => {
    let keyCode = e.key
    if (e.key === "\u0000") {
        keyCode = "Delete"
    }
    // If the shift status can be detected by casing, don't add the 'S-' prefix
    const needsShift = keyCode.length > 1
    if (e.shiftKey && needsShift && keyCode !== "Shift") {
        keyCode = `S-${keyCode}`
    }
    if (e.altKey && keyCode !== "Alt") {
        keyCode = `A-${keyCode}`
    }
    if (e.metaKey && keyCode !== "Meta") {
        keyCode = `M-${keyCode}`
    }
    if (e.ctrlKey && keyCode !== "Ctrl") {
        keyCode = `C-${keyCode}`
    }
    if (keyCode.length > 1) {
        keyCode = `<${keyCode}>`
    }
    return keyCode
}

const mappings = {
    "events": {
        "<ArrowDown>": () => {
            document.getElementById("events-list")?.scrollBy(0, 100)
        },
        "<ArrowUp>": () => {
            document.getElementById("events-list")?.scrollBy(0, -100)
        },
        "<C-E>": () => closeSpecialMode(),
        "<End>": () => {
            document.getElementById("events-list")?.scrollTo(
                0, Number.MAX_SAFE_INTEGER)
        },
        "<Escape>": () => closeSpecialMode(),
        "<Home>": () => {
            document.getElementById("events-list")?.scrollTo(0, 0)
        },
        "<PageDown>": () => {
            document.getElementById("events-list")?.scrollBy(0, 500)
        },
        "<PageUp>": () => {
            document.getElementById("events-list")?.scrollBy(0, -500)
        },
        "j": () => {
            document.getElementById("events-list")?.scrollBy(0, 100)
        },
        "k": () => {
            document.getElementById("events-list")?.scrollBy(0, -100)
        },
        "q": () => closeSpecialMode()
    },
    "fullscreen": {
        " ": () => {
            pause()
        },
        "<ArrowDown>": () => {
            relativeSeek(-60)
        },
        "<ArrowLeft>": () => {
            relativeSeek(-6)
        },
        "<ArrowRight>": () => {
            relativeSeek(6)
        },
        "<ArrowUp>": () => {
            relativeSeek(60)
        },
        "<C-ArrowLeft>": () => {
            decrementSong()
        },
        "<C-ArrowRight>": () => {
            incrementSong()
        },
        "<F9>": () => {
            document.getElementById("fs-lyrics")?.scrollBy(0, 100)
            stunShiftLyrics()
        },
        "<F10>": () => {
            document.getElementById("fs-lyrics")?.scrollBy(0, -100)
            stunShiftLyrics()
        },
        "<PageDown>": () => {
            document.getElementById("fs-lyrics")?.scrollBy(0, 100)
            stunShiftLyrics()
        },
        "<PageUp>": () => {
            document.getElementById("fs-lyrics")?.scrollBy(0, -100)
            stunShiftLyrics()
        },
        "<S-F9>": () => {
            document.getElementById("fs-lyrics")?.scrollBy(0, 1000)
            stunShiftLyrics()
        },
        "<S-F10>": () => {
            document.getElementById("fs-lyrics")?.scrollBy(0, -1000)
            stunShiftLyrics()
        },
        "=": () => {
            volumeUp()
        },
        "-": () => {
            volumeDown()
        },
        "0": () => {
            volumeSet(100)
        },
        "m": () => {
            toggleMute()
        },
        "q": () => setFullscreenLayout(false, false),
        "s": () => {
            stopAfterTrack()
        }
    },
    "global": {
        "<C-+>": () => {
            volumeUp()
        },
        "<C-/>": () => switchFocus("settingseditor"),
        "<C-=>": () => {
            volumeUp()
        },
        "<C-[>": () => {
            relativeSeek(-6)
        },
        "<C-]>": () => {
            relativeSeek(6)
        },
        "<C-_>": () => {
            volumeDown()
        },
        "<C-`>": () => {
            seek(0)
        },
        "<C-{>": () => {
            relativeSeek(-60)
        },
        "<C-}>": () => {
            relativeSeek(60)
        },
        "<C-->": () => {
            volumeDown()
        },
        "<C-0>": () => {
            volumeSet(100)
        },
        "<C-1>": () => {
            seek(10)
        },
        "<C-2>": () => {
            seek(20)
        },
        "<C-3>": () => {
            seek(30)
        },
        "<C-4>": () => {
            seek(40)
        },
        "<C-5>": () => {
            seek(50)
        },
        "<C-6>": () => {
            seek(60)
        },
        "<C-7>": () => {
            seek(70)
        },
        "<C-8>": () => {
            seek(80)
        },
        "<C-9>": () => {
            seek(90)
        },
        "<C-E>": () => switchFocus("events"),
        "<C-F4>": () => switchFocus("lyricseditor"),
        "<C-F11>": () => setFullscreenLayout(!document.fullscreenElement,
            document.body.getAttribute("focus-el") === "fullscreen"),
        "<C-c>": () => {
            const text = window.getSelection().toString()
            if (text) {
                clipboard.writeText(text)
            }
        },
        "<C-f>": () => switchFocus("search"),
        "<C-g>": () => {
            toggleGenius()
        },
        "<C-h>": () => {
            toggleShiftLyrics()
        },
        "<C-i>": () => {
            showSongInfo("current")
        },
        "<C-l>": () => switchFocus("playlist"),
        "<C-m>": () => {
            toggleMute()
        },
        "<C-o>": () => openFolder(),
        "<C-r>": () => {
            importList()
        },
        "<C-s>": () => {
            saveSettings()
        },
        "<C-t>": () => {
            exportList()
        },
        "<Escape>": () => setFullscreenLayout(false, false),
        "<F1>": () => {
            resetShowingLyrics()
        },
        "<F2>": () => switchFocus("search"),
        "<F3>": () => switchFocus("playlist"),
        "<F4>": () => {
            switchToLyrics()
        },
        "<F5>": () => {
            pause()
        },
        "<F6>": () => {
            stopAfterTrack()
        },
        "<F7>": () => {
            decrementSong()
        },
        "<F8>": () => {
            incrementSong()
        },
        "<F9>": () => {
            document.getElementById("song-info")?.scrollBy(0, 100)
            stunShiftLyrics()
        },
        "<F10>": () => {
            document.getElementById("song-info")?.scrollBy(0, -100)
            stunShiftLyrics()
        },
        "<F11>": () => {
            const isFullscreened = document.fullscreenElement
                || document.body.getAttribute("focus-el") === "fullscreen"
            setFullscreenLayout(!isFullscreened, !isFullscreened)
        },
        "<F12>": () => ipcRenderer.invoke("toggle-devtools"),
        "<S-F4>": () => {
            switchToLyrics(true)
        },
        "<S-F6>": () => {
            stopAfterLastTrackOfRule()
        },
        "<S-F9>": () => {
            document.getElementById("song-info")?.scrollBy(0, 1000)
            stunShiftLyrics()
        },
        "<S-F10>": () => {
            document.getElementById("song-info")?.scrollBy(0, -1000)
            stunShiftLyrics()
        },
        "<S-F11>": () => setFullscreenLayout(document.fullscreenElement,
            document.body.getAttribute("focus-el") !== "fullscreen"),
        "<Tab>": () => switchFocus("searchbox")
    },
    "infopanel": {
        "<ArrowDown>": () => {
            document.getElementById("infopanel-details")?.scrollBy(0, 100)
        },
        "<ArrowUp>": () => {
            document.getElementById("infopanel-details")?.scrollBy(0, -100)
        },
        "<C-i>": () => closeSpecialMode(),
        "<End>": () => {
            document.getElementById("infopanel-details")?.scrollTo(
                0, Number.MAX_SAFE_INTEGER)
        },
        "<Escape>": () => closeSpecialMode(),
        "<Home>": () => {
            document.getElementById("infopanel-details")?.scrollTo(0, 0)
        },
        "<PageDown>": () => {
            document.getElementById("infopanel-details")?.scrollBy(0, 500)
        },
        "<PageUp>": () => {
            document.getElementById("infopanel-details")?.scrollBy(0, -500)
        },
        "i": () => closeSpecialMode(),
        "j": () => {
            document.getElementById("infopanel-details")?.scrollBy(0, 100)
        },
        "k": () => {
            document.getElementById("infopanel-details")?.scrollBy(0, -100)
        },
        "q": () => closeSpecialMode()
    },
    "lyrics": {
        "<ArrowDown>": () => {
            incrementSelectedLyrics()
        },
        "<ArrowUp>": () => {
            decrementSelectedLyrics()
        },
        "<C-F4>": () => closeSpecialMode(),
        "<C-Tab>": () => switchFocus("lyricseditor"),
        "<C-n>": () => {
            incrementSelectedLyrics()
        },
        "<C-p>": () => {
            decrementSelectedLyrics()
        },
        "<C-s>": () => {
            saveLyrics()
        },
        "<Enter>": () => {
            selectLyricsFromResults()
        },
        "<Escape>": () => closeSpecialMode(),
        "<Tab>": () => switchFocus("lyricssearch")
    },
    "lyricseditor": {
        "<C-Enter>": () => {
            saveLyrics()
        },
        "<C-F4>": () => closeSpecialMode(),
        "<C-Tab>": () => switchFocus("lyrics"),
        "<C-s>": () => {
            saveLyrics()
        },
        "<Escape>": () => closeSpecialMode(),
        "<Tab>": () => switchFocus("lyricssearch")
    },
    "lyricssearch": {
        "<ArrowDown>": () => {
            document.querySelector("#lyrics-results > *")
                ?.classList.add("selected")
            switchFocus("lyrics")
        },
        "<C-F4>": () => closeSpecialMode(),
        "<C-Tab>": () => switchFocus("lyricseditor"),
        "<C-n>": () => {
            document.querySelector("#lyrics-results > *")
                ?.classList.add("selected")
            switchFocus("lyrics")
        },
        "<C-s>": () => {
            saveLyrics()
        },
        "<Enter>": () => {
            searchLyrics(document.getElementById("lyrics-search").value)
        },
        "<Escape>": () => closeSpecialMode(),
        "<Tab>": () => null
    },
    "playlist": {
        "<ArrowDown>": () => {
            incrementSelectedPlaylist()
        },
        "<ArrowLeft>": () => {
            closeSelectedRule()
        },
        "<ArrowRight>": () => {
            openSelectedRule()
        },
        "<ArrowUp>": () => {
            decrementSelectedPlaylist()
        },
        "<C-ArrowDown>": () => {
            let i = 0
            while (i < 10) {
                incrementSelectedPlaylist()
                i += 1
            }
        },
        "<C-ArrowUp>": () => {
            let i = 0
            while (i < 10) {
                decrementSelectedPlaylist()
                i += 1
            }
        },
        "<C-End>": () => {
            bottomSelectedPlaylist()
        },
        "<C-Home>": () => {
            topSelectedPlaylist()
        },
        "<C-PageDown>": () => {
            let i = 0
            while (i < 10) {
                incrementSelectedPlaylist()
                i += 1
            }
        },
        "<C-PageUp>": () => {
            let i = 0
            while (i < 10) {
                decrementSelectedPlaylist()
                i += 1
            }
        },
        "<C-Tab>": () => switchFocus("search"),
        "<C-e>": () => {
            document.getElementById("main-playlist")?.scrollBy(0, 50)
        },
        "<C-n>": () => {
            incrementSelectedPlaylist()
        },
        "<C-p>": () => {
            decrementSelectedPlaylist()
        },
        "<C-y>": () => {
            document.getElementById("main-playlist")?.scrollBy(0, -50)
        },
        "<Delete>": () => {
            deleteSelectedPlaylist()
        },
        "<End>": () => {
            bottomScroll()
        },
        "<Enter>": async() => {
            await playSelectedSong()
        },
        "<Home>": () => {
            topScroll()
        },
        "<PageDown>": () => {
            document.getElementById("main-playlist")?.scrollBy(0, 300)
        },
        "<PageUp>": () => {
            document.getElementById("main-playlist")?.scrollBy(0, -300)
        },
        "S": () => {
            stopAfterLastTrackOfRule()
        },
        "a": () => {
            toggleAutoScroll()
        },
        "c": () => {
            toggleAutoClose()
        },
        "d": () => {
            deleteSelectedPlaylist()
        },
        "h": () => {
            closeSelectedRule()
        },
        "i": () => {
            showSongInfo("playlist")
        },
        "j": () => {
            incrementSelectedPlaylist()
        },
        "k": () => {
            decrementSelectedPlaylist()
        },
        "l": () => {
            openSelectedRule()
        },
        "r": () => {
            toggleAutoRemove()
        },
        "s": () => {
            stopAfterTrack("selected")
        },
        "t": () => {
            toggleAutoLyrics()
        }
    },
    "search": {
        "<ArrowDown>": () => {
            incrementSelectedSearch()
        },
        "<ArrowUp>": () => {
            decrementSelectedSearch()
        },
        "<C-PageDown>": () => {
            let i = 0
            while (i < 10) {
                incrementSelectedSearch()
                i += 1
            }
        },
        "<C-PageUp>": () => {
            let i = 0
            while (i < 10) {
                decrementSelectedSearch()
                i += 1
            }
        },
        "<C-Tab>": () => switchFocus("playlist"),
        "<C-n>": () => {
            incrementSelectedSearch()
        },
        "<C-p>": () => {
            decrementSelectedSearch()
        },
        "<Enter>": () => {
            appendSelectedSong()
        },
        "<PageDown>": () => {
            document.getElementById("search-results")?.scrollBy(0, 300)
        },
        "<PageUp>": () => {
            document.getElementById("search-results")?.scrollBy(0, -300)
        },
        "<S-Enter>": () => {
            appendSelectedSong(true)
        },
        "i": () => {
            showSongInfo("search")
        }
    },
    "searchbox": {
        "<ArrowDown>": () => {
            incrementSelectedSearch()
        },
        "<C-Enter>": () => {
            const search = document.getElementById("rule-search").value
            setFallbackRule(search)
        },
        "<C-PageDown>": () => {
            let i = 0
            while (i < 10) {
                incrementSelectedSearch()
                i += 1
            }
        },
        "<C-Tab>": () => switchFocus("playlist"),
        "<C-n>": () => {
            incrementSelectedSearch()
        },
        "<Enter>": () => {
            const search = document.getElementById("rule-search").value
            append({"rule": search})
        },
        "<PageDown>": () => {
            document.getElementById("search-results")?.scrollBy(0, 300)
        },
        "<PageUp>": () => {
            document.getElementById("search-results")?.scrollBy(0, -300)
        },
        "<S-Enter>": () => {
            const search = document.getElementById("rule-search").value
            append({"rule": search}, true)
        }
    },
    "settingseditor": {
        "<C-/>": () => closeSpecialMode(),
        "<C-ArrowDown>": () => {
            const els = [...document.querySelectorAll("#settings-editor label")]
            const focusEl = els.find(el => el === document.activeElement
                || el === document.activeElement?.parentNode)
            const index = els.indexOf(focusEl)
            if (index === -1 || index >= els.length - 1) {
                els[0].focus()
            } else {
                els[index + 1].focus()
            }
        },
        "<C-ArrowUp>": () => {
            const els = [...document.querySelectorAll("#settings-editor label")]
            const focusEl = els.find(el => el === document.activeElement
                || el === document.activeElement?.parentNode)
            const index = els.indexOf(focusEl)
            if (!index || index <= 0) {
                els[els.length - 1].focus()
            } else {
                els[index - 1].focus()
            }
        },
        "<C-Enter>": () => {
            saveSettings()
            closeSpecialMode()
        },
        "<C-s>": () => {
            saveSettings()
            closeSpecialMode()
        },
        "<Enter>": () => {
            const els = [...document.querySelectorAll("#settings-editor label")]
            const focusEl = els.find(el => el === document.activeElement
                || el === document.activeElement?.parentNode)
            let checkbox = focusEl.querySelector("input[type='checkbox']")
            if (!checkbox && focusEl.matches("input[type='checkbox']")) {
                checkbox = focusEl
            }
            if (checkbox) {
                checkbox.checked = !checkbox.checked
            }
        },
        "<Escape>": () => closeSpecialMode(),
        "<PageDown>": () => {
            document.getElementById("settings-container")?.scrollBy(0, 300)
        },
        "<PageUp>": () => {
            document.getElementById("settings-container")?.scrollBy(0, -300)
        }
    }
}

/**
 * Handle all keyboard presses based on event key and mode.
 * @param {KeyboardEvent} e
 */
const handleKeyboard = async e => {
    if (e.key === "Tab" || !queryMatch(e, "textarea, input, select")) {
        e.preventDefault()
    }
    if (!isReady()) {
        return
    }
    const id = toIdentifier(e)
    if (id === "<Enter>" && queryMatch(e, "select")) {
        return
    }
    let mode = document.body.getAttribute("focus-el")
    const searchbox = document.getElementById("rule-search")
    if (mode === "search" && document.activeElement === searchbox) {
        mode = "searchbox"
    }
    if (mappings[mode][id]) {
        e.preventDefault()
        await mappings[mode][id](e)
    } else if (mappings.global[id]) {
        e.preventDefault()
        await mappings.global[id](e)
    }
}

/**
 * Handle all mouse movements based on event position and mode.
 * @param {MouseEvent} e
 */
const handleMouse = e => {
    if (!isReady()) {
        return
    }
    const ok = ".song, #song-info, textarea, input, select, "
        + "#fs-lyrics, #events-list, #infopanel-details"
    if (!queryMatch(e, ok)) {
        e.preventDefault()
    }
    if (queryMatch(e, "#song-info, #fs-lyrics")) {
        stunShiftLyrics()
    }
    let mode = document.body.getAttribute("focus-el")
    const searchbox = document.getElementById("rule-search")
    if (mode === "search" && document.activeElement === searchbox) {
        mode = "searchbox"
    }
    if (mode === "infopanel") {
        if (!queryMatch(e, "#infopanel")) {
            closeSpecialMode()
        }
    }
    if (mode === "settingseditor") {
        if (!queryMatch(e, "#settings-editor, #edit-settings")) {
            closeSpecialMode()
        }
    }
    if (mode === "events") {
        if (!queryMatch(e, "#events, #status-notify")) {
            closeSpecialMode()
        }
    }
    if (mode?.startsWith("lyrics")) {
        if (!queryMatch(e, "#lyrics-editor, #edit-lyrics")) {
            closeSpecialMode()
        }
    }
    if (queryMatch(e, "#switch-to-playlist")) {
        switchFocus("playlist")
        return
    }
    if (queryMatch(e, "#switch-to-search")) {
        switchFocus("search")
        return
    }
    if (queryMatch(e, "#make-fallback") && isHTMLTextAreaElement(searchbox)) {
        const search = searchbox.value
        setFallbackRule(search)
        return
    }
    if (queryMatch(e, "#add-songs") && isHTMLTextAreaElement(searchbox)) {
        const search = searchbox.value
        if (mode === "searchbox") {
            append({"rule": search})
        }
        if (mode === "search") {
            appendSelectedSong()
        }
    }
    if (queryMatch(e, "#status-folder, #open-folder")) {
        openFolder()
        return
    }
    if (queryMatch(e, "#status-notify")) {
        switchFocus("events")
        return
    }
    if (queryMatch(e, "#song-info") && !window.getSelection()?.toString()) {
        if (["search", "searchbox", "playlist"].includes(mode ?? "")) {
            switchFocus(mode)
        }
        return
    }
    if (queryMatch(e, "#export-playlist")) {
        exportList()
        return
    }
    if (queryMatch(e, "#import-playlist")) {
        importList()
        return
    }
    if (queryMatch(e, ".save-settings")) {
        saveSettings()
        closeSpecialMode()
        return
    }
    if (queryMatch(e, "#prev, #fs-prev")) {
        decrementSong()
        return
    }
    if (queryMatch(e, "#pause, #fs-pause")) {
        pause()
        return
    }
    if (queryMatch(e, "#next, #fs-next")) {
        incrementSong()
        return
    }
    if (queryMatch(e, "#show-help")) {
        resetShowingLyrics()
        return
    }
    if (queryMatch(e, "#show-lyrics")) {
        switchToLyrics()
        return
    }
    if (queryMatch(e, "#fetch-lyrics")) {
        switchToLyrics(true)
        return
    }
    if (queryMatch(e, "#edit-settings")) {
        switchFocus("settingseditor")
        return
    }
    if (queryMatch(e, "#rule-search")) {
        switchFocus("searchbox")
        return
    }
    if (queryMatch(e, "#search-container")) {
        switchFocus("search")
        return
    }
    if (queryMatch(e, "#playlist-container")) {
        switchFocus("playlist")
        return
    }
    if (queryMatch(e, "#lyrics-query")) {
        searchLyrics(document.getElementById("lyrics-search").value)
        return
    }
    if (queryMatch(e, "#lyrics-save")) {
        saveLyrics()
        return
    }
    if (queryMatch(e, "#lyrics-edit-field, #edit-lyrics")) {
        switchFocus("lyricseditor")
        return
    }
    if (queryMatch(e, "#lyrics-search")) {
        switchFocus("lyricssearch")
        return
    }
    if (queryMatch(e, "#lyrics-results, #lyrics-editor")) {
        switchFocus("lyrics")
    }
}

/** Initialize all keyboard and mouse inputs. */
export const init = () => {
    window.addEventListener("keydown", e => handleKeyboard(e))
    window.addEventListener("keypress", e => {
        const id = toIdentifier(e)
        if (e.key === "Tab" || id.length > 1) {
            if (e.key === "Enter") {
                if (!queryMatch(e, "#lyrics-edit-field")) {
                    e.preventDefault()
                }
            } else {
                e.preventDefault()
            }
        }
    })
    window.addEventListener("keyup", e => {
        const id = toIdentifier(e)
        if (e.key === "Tab" || id.length > 1) {
            if (e.key === "Enter") {
                if (!queryMatch(e, "#lyrics-edit-field")) {
                    e.preventDefault()
                }
            } else {
                e.preventDefault()
            }
        }
    })
    window.addEventListener("click", e => {
        if (!queryMatch(e, "input, select")) {
            e.preventDefault()
        }
    })
    window.addEventListener("mousedown", handleMouse)
    window.addEventListener("mouseup", e => {
        if (!queryMatch(e, "input, textarea, #song-info, select, #fs-lyrics")) {
            e.preventDefault()
        }
    })
    window.addEventListener("touchmove", e => {
        if (queryMatch(e, "#song-info, #fs-lyrics")) {
            stunShiftLyrics()
        }
    })
    window.addEventListener("mousewheel", e => {
        if (queryMatch(e, "#song-info, #fs-lyrics")) {
            stunShiftLyrics()
        }
    })
    for (const vol of [...document.querySelectorAll("input[type='range']")]) {
        if (!isHTMLInputElement(vol)) {
            return
        }
        vol.addEventListener("input", () => {
            if (!isReady()) {
                return
            }
            volumeSet(vol.value)
        })
        vol.addEventListener("mousedown", e => {
            if (!isReady()) {
                return
            }
            if (e.button === 2) {
                volumeSet(100)
            } else if (e.button === 1) {
                toggleMute()
            }
        })
    }
    const searchbox = document.getElementById("rule-search")
    const searchResults = document.getElementById("search-results")
    if (searchbox) {
        searchbox.addEventListener("input", () => {
            if (!isReady() || !isHTMLTextAreaElement(searchbox)
                || !searchResults) {
                return
            }
            const search = searchbox.value
                .replace(/\n/g, "\\n")
            if (search !== searchbox.value) {
                searchbox.value = search
            }
            searchResults.textContent = ""
            query(search).slice(0, 100).forEach(song => {
                const el = generateSongElement(song)
                document.getElementById("search-results")?.append(el)
                el.addEventListener("dblclick", () => {
                    append({"songs": [JSON.parse(JSON.stringify(song))]})
                })
                el.addEventListener("mousedown", mouseEv => {
                    document.querySelector("#search-results .selected")
                        ?.classList.remove("selected")
                    el.classList.add("selected")
                    el?.scrollIntoView({"block": "nearest"})
                    if (mouseEv.button !== 0) {
                        append(
                            {"songs": [JSON.parse(JSON.stringify(song))]},
                            mouseEv.button === 1)
                    }
                })
            })
        })
    }
    const progressContainers = [
        document.getElementById("progress-container"),
        document.getElementById("fs-progress-container")
    ]
    for (const element of progressContainers) {
        element?.addEventListener("mousedown", e => {
            const parent = element.offsetParent
            if (!isReady() || !isHTMLElement(parent)) {
                return
            }
            const x = e.pageX - element.offsetLeft - parent.offsetLeft
            let percentage = x / element.getBoundingClientRect().width * 100
            if (percentage < 1) {
                percentage = 0
            }
            seek(percentage)
        })
    }
    const coverartEls = [
        document.getElementById("song-cover"),
        document.getElementById("fs-song-cover")
    ]
    for (const element of coverartEls) {
        element?.addEventListener("mousedown", e => {
            if (!isReady()) {
                return
            }
            if (e.button === 0) {
                const isFullscreened = document.fullscreenElement
                    || document.body.getAttribute("focus-el") === "fullscreen"
                setFullscreenLayout(!isFullscreened, !isFullscreened)
            }
            if (e.button === 1) {
                setFullscreenLayout(document.fullscreenElement,
                    document.body.getAttribute("focus-el") !== "fullscreen")
            }
            if (e.button === 2) {
                setFullscreenLayout(!document.fullscreenElement,
                    document.body.getAttribute("focus-el") === "fullscreen")
            }
        })
    }
    document.getElementById("fullscreen")?.addEventListener("mousedown", e => {
        if (!queryMatch(e, "#fs-player-status, #fs-song-cover, #fs-lyrics")) {
            if (!queryMatch(e, "#fs-progress-container, #fs-volume-slider")) {
                document.exitFullscreen().catch(() => closeSpecialMode())
            }
        }
    })
    resetShowingLyrics()
}
