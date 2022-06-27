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

const {ipcRenderer, clipboard} = require("electron")
const {queryMatch} = require("../util")
const {switchFocus, setFullscreenLayout, closeSpecialMode} = require("./dom")

const init = () => {
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
        if (!queryMatch(e, "input")) {
            e.preventDefault()
        }
    })
    window.addEventListener("mousedown", handleMouse)
    window.addEventListener("mouseup", e => {
        if (!queryMatch(e, "input, textarea, #song-info")) {
            e.preventDefault()
        }
    })
    window.addEventListener("mousewheel", e => {
        if (queryMatch(e, "#song-info, #fs-lyrics")) {
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        }
    })
    for (const vol of [...document.querySelectorAll("input[type='range']")]) {
        vol.addEventListener("input", () => {
            if (!isReady()) {
                return
            }
            const {volumeSet} = require("./player")
            volumeSet(vol.value)
        })
        vol.addEventListener("mousedown", e => {
            if (!isReady()) {
                return
            }
            if (e.button === 2) {
                const {volumeSet} = require("./player")
                volumeSet(100)
            } else if (e.button === 1) {
                const {toggleMute} = require("./player")
                toggleMute()
            }
        })
    }
    document.getElementById("rule-search").addEventListener("input", () => {
        if (!isReady()) {
            return
        }
        const search = document.getElementById("rule-search").value
            .replace(/\n/g, "\\n")
        if (search !== document.getElementById("rule-search").value) {
            document.getElementById("rule-search").value = search
        }
        const {query} = require("./songs")
        document.getElementById("search-results").textContent = ""
        const {generateSongElement} = require("./dom")
        query(search).slice(0, 100).forEach(song => {
            const el = generateSongElement(song)
            document.getElementById("search-results").appendChild(el)
            el.addEventListener("dblclick", () => {
                const {append} = require("./playlist")
                append({"songs": [JSON.parse(JSON.stringify(song))]})
            })
            el.addEventListener("mousedown", mouseEv => {
                document.querySelector("#search-results .selected")
                    ?.classList.remove("selected")
                el.classList.add("selected")
                el?.scrollIntoView({"block": "nearest"})
                if (mouseEv.button !== 0) {
                    const {append} = require("./playlist")
                    append(
                        {"songs": [JSON.parse(JSON.stringify(song))]},
                        mouseEv.button === 1)
                }
            })
        })
    })
    const progressContainers = [
        document.getElementById("progress-container"),
        document.getElementById("fs-progress-container")
    ]
    for (const element of progressContainers) {
        element.addEventListener("mousedown", e => {
            if (!isReady()) {
                return
            }
            const {seek} = require("./player")
            const x = e.pageX - element.offsetLeft
                - element.offsetParent.offsetLeft
            let percentage = x / element.getBoundingClientRect().width
            if (percentage < 0.01) {
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
        element.addEventListener("mousedown", e => {
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
    document.getElementById("fullscreen").addEventListener("mousedown", e => {
        if (!queryMatch(e, "#fs-player-status, #fs-song-cover, #fs-lyrics")) {
            if (!queryMatch(e, "#fs-progress-container, #fs-volume-slider")) {
                document.exitFullscreen().catch(() => closeSpecialMode())
            }
        }
    })
    const {resetShowingLyrics} = require("./lyrics")
    resetShowingLyrics()
}

const isReady = () => document.getElementById(
    "status-current").textContent === "Ready"

const openFolder = () => {
    const {scanner} = require("./songs")
    ipcRenderer.invoke("dialog-open", {
        "properties": ["openDirectory"], "title": "Open a folder"
    }).then(info => {
        if (!info.canceled) {
            scanner(info.filePaths[0])
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
            document.getElementById("events-list").scrollBy(0, 100)
        },
        "<ArrowUp>": () => {
            document.getElementById("events-list").scrollBy(0, -100)
        },
        "<C-E>": () => closeSpecialMode(),
        "<End>": () => {
            document.getElementById("events-list").scrollTo(
                0, Number.MAX_SAFE_INTEGER)
        },
        "<Escape>": () => closeSpecialMode(),
        "<Home>": () => {
            document.getElementById("events-list").scrollTo(0, 0)
        },
        "<PageDown>": () => {
            document.getElementById("events-list").scrollBy(0, 500)
        },
        "<PageUp>": () => {
            document.getElementById("events-list").scrollBy(0, -500)
        },
        "j": () => {
            document.getElementById("events-list").scrollBy(0, 100)
        },
        "k": () => {
            document.getElementById("events-list").scrollBy(0, -100)
        },
        "q": () => closeSpecialMode()
    },
    "fullscreen": {
        " ": () => {
            const {pause} = require("./player")
            pause()
        },
        "<ArrowDown>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(-60)
        },
        "<ArrowLeft>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(-6)
        },
        "<ArrowRight>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(6)
        },
        "<ArrowUp>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(60)
        },
        "<C-ArrowLeft>": () => {
            const {decrement} = require("./playlist")
            decrement()
        },
        "<C-ArrowRight>": () => {
            const {increment} = require("./playlist")
            increment()
        },
        "<F9>": () => {
            document.getElementById("fs-lyrics").scrollBy(0, 100)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<F10>": () => {
            document.getElementById("fs-lyrics").scrollBy(0, -100)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<PageDown>": () => {
            document.getElementById("fs-lyrics").scrollBy(0, 100)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<PageUp>": () => {
            document.getElementById("fs-lyrics").scrollBy(0, -100)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<S-F9>": () => {
            document.getElementById("fs-lyrics").scrollBy(0, 1000)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<S-F10>": () => {
            document.getElementById("fs-lyrics").scrollBy(0, -1000)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "=": () => {
            const {volumeUp} = require("./player")
            volumeUp()
        },
        "-": () => {
            const {volumeDown} = require("./player")
            volumeDown()
        },
        "0": () => {
            const {volumeSet} = require("./player")
            volumeSet(100)
        },
        "m": () => {
            const {toggleMute} = require("./player")
            toggleMute()
        },
        "q": () => setFullscreenLayout(false, false),
        "s": () => {
            const {stopAfterTrack} = require("./playlist")
            stopAfterTrack()
        }
    },
    "global": {
        "<C-=>": () => {
            const {volumeUp} = require("./player")
            volumeUp()
        },
        "<C-[>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(-6)
        },
        "<C-]>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(6)
        },
        "<C-{>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(-60)
        },
        "<C-}>": () => {
            const {relativeSeek} = require("./player")
            relativeSeek(60)
        },
        "<C-->": () => {
            const {volumeDown} = require("./player")
            volumeDown()
        },
        "<C-0>": () => {
            const {volumeSet} = require("./player")
            volumeSet(100)
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
            const {toggleGenius} = require("./settings")
            toggleGenius()
        },
        "<C-h>": () => {
            const {toggleShiftLyrics} = require("./settings")
            toggleShiftLyrics()
        },
        "<C-i>": () => {
            const {showSongInfo} = require("./dom")
            showSongInfo("current")
        },
        "<C-l>": () => switchFocus("playlist"),
        "<C-m>": () => {
            const {toggleMute} = require("./player")
            toggleMute()
        },
        "<C-o>": () => openFolder(),
        "<C-r>": () => {
            const {importList} = require("./playlist")
            importList()
        },
        "<C-s>": () => {
            const {saveSettings} = require("./settings")
            saveSettings()
        },
        "<C-t>": () => {
            const {exportList} = require("./playlist")
            exportList()
        },
        "<Escape>": () => setFullscreenLayout(false, false),
        "<F1>": () => {
            const {resetShowingLyrics} = require("./lyrics")
            resetShowingLyrics()
        },
        "<F2>": () => switchFocus("search"),
        "<F3>": () => switchFocus("playlist"),
        "<F4>": () => {
            const {switchToLyrics} = require("./lyrics")
            switchToLyrics()
        },
        "<F5>": () => {
            const {pause} = require("./player")
            pause()
        },
        "<F6>": () => {
            const {stopAfterTrack} = require("./playlist")
            stopAfterTrack()
        },
        "<F7>": () => {
            const {decrement} = require("./playlist")
            decrement()
        },
        "<F8>": () => {
            const {increment} = require("./playlist")
            increment()
        },
        "<F9>": () => {
            document.getElementById("song-info").scrollBy(0, 100)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<F10>": () => {
            document.getElementById("song-info").scrollBy(0, -100)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<F11>": () => {
            const isFullscreened = document.fullscreenElement
                || document.body.getAttribute("focus-el") === "fullscreen"
            setFullscreenLayout(!isFullscreened, !isFullscreened)
        },
        "<F12>": () => ipcRenderer.invoke("toggle-devtools"),
        "<S-F4>": () => {
            const {switchToLyrics} = require("./lyrics")
            switchToLyrics(true)
        },
        "<S-F6>": () => {
            const {stopAfterLastTrackOfRule} = require("./playlist")
            stopAfterLastTrackOfRule()
        },
        "<S-F9>": () => {
            document.getElementById("song-info").scrollBy(0, 1000)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<S-F10>": () => {
            document.getElementById("song-info").scrollBy(0, -1000)
            const {stunShiftLyrics} = require("./lyrics")
            stunShiftLyrics()
        },
        "<S-F11>": () => setFullscreenLayout(document.fullscreenElement,
            document.body.getAttribute("focus-el") !== "fullscreen"),
        "<Tab>": () => switchFocus("searchbox")
    },
    "infopanel": {
        "<ArrowDown>": () => {
            document.getElementById("infopanel-details").scrollBy(0, 100)
        },
        "<ArrowUp>": () => {
            document.getElementById("infopanel-details").scrollBy(0, -100)
        },
        "<C-i>": () => closeSpecialMode(),
        "<End>": () => {
            document.getElementById("infopanel-details").scrollTo(
                0, Number.MAX_SAFE_INTEGER)
        },
        "<Escape>": () => closeSpecialMode(),
        "<Home>": () => {
            document.getElementById("infopanel-details").scrollTo(0, 0)
        },
        "<PageDown>": () => {
            document.getElementById("infopanel-details").scrollBy(0, 500)
        },
        "<PageUp>": () => {
            document.getElementById("infopanel-details").scrollBy(0, -500)
        },
        "i": () => closeSpecialMode(),
        "j": () => {
            document.getElementById("infopanel-details").scrollBy(0, 100)
        },
        "k": () => {
            document.getElementById("infopanel-details").scrollBy(0, -100)
        },
        "q": () => closeSpecialMode()
    },
    "lyrics": {
        "<ArrowDown>": () => {
            const {incrementSelectedLyrics} = require("./lyrics")
            incrementSelectedLyrics()
        },
        "<ArrowUp>": () => {
            const {decrementSelectedLyrics} = require("./lyrics")
            decrementSelectedLyrics()
        },
        "<C-F4>": () => closeSpecialMode(),
        "<C-Tab>": () => switchFocus("lyricseditor"),
        "<C-n>": () => {
            const {incrementSelectedLyrics} = require("./lyrics")
            incrementSelectedLyrics()
        },
        "<C-p>": () => {
            const {decrementSelectedLyrics} = require("./lyrics")
            decrementSelectedLyrics()
        },
        "<C-s>": () => {
            const {saveLyrics} = require("./lyrics")
            saveLyrics()
        },
        "<Enter>": () => {
            const {selectLyricsFromResults} = require("./lyrics")
            selectLyricsFromResults()
        },
        "<Escape>": () => closeSpecialMode(),
        "<Tab>": () => switchFocus("lyricssearch")
    },
    "lyricseditor": {
        "<C-Enter>": () => {
            const {saveLyrics} = require("./lyrics")
            saveLyrics()
        },
        "<C-F4>": () => closeSpecialMode(),
        "<C-Tab>": () => switchFocus("lyrics"),
        "<C-s>": () => {
            const {saveLyrics} = require("./lyrics")
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
            const {saveLyrics} = require("./lyrics")
            saveLyrics()
        },
        "<Enter>": () => {
            const {searchLyrics} = require("./lyrics")
            searchLyrics(document.getElementById("lyrics-search").value)
        },
        "<Escape>": () => closeSpecialMode(),
        "<Tab>": () => null
    },
    "playlist": {
        "<ArrowDown>": () => {
            const {incrementSelected} = require("./playlist")
            incrementSelected()
        },
        "<ArrowLeft>": () => {
            const {closeSelectedRule} = require("./playlist")
            closeSelectedRule()
        },
        "<ArrowRight>": () => {
            const {openSelectedRule} = require("./playlist")
            openSelectedRule()
        },
        "<ArrowUp>": () => {
            const {decrementSelected} = require("./playlist")
            decrementSelected()
        },
        "<C-ArrowDown>": () => {
            const {incrementSelected} = require("./playlist")
            let i = 0
            while (i < 10) {
                incrementSelected()
                i += 1
            }
        },
        "<C-ArrowUp>": () => {
            const {decrementSelected} = require("./playlist")
            let i = 0
            while (i < 10) {
                decrementSelected()
                i += 1
            }
        },
        "<C-End>": () => {
            const {bottomSelected} = require("./playlist")
            bottomSelected()
        },
        "<C-Home>": () => {
            const {topSelected} = require("./playlist")
            topSelected()
        },
        "<C-PageDown>": () => {
            const {incrementSelected} = require("./playlist")
            let i = 0
            while (i < 10) {
                incrementSelected()
                i += 1
            }
        },
        "<C-PageUp>": () => {
            const {decrementSelected} = require("./playlist")
            let i = 0
            while (i < 10) {
                decrementSelected()
                i += 1
            }
        },
        "<C-Tab>": () => switchFocus("search"),
        "<C-e>": () => {
            document.getElementById("main-playlist").scrollBy(0, 50)
        },
        "<C-n>": () => {
            const {incrementSelected} = require("./playlist")
            incrementSelected()
        },
        "<C-p>": () => {
            const {decrementSelected} = require("./playlist")
            decrementSelected()
        },
        "<C-y>": () => {
            document.getElementById("main-playlist").scrollBy(0, -50)
        },
        "<Delete>": () => {
            const {deleteSelected} = require("./playlist")
            deleteSelected()
        },
        "<End>": () => {
            const {bottomScroll} = require("./playlist")
            bottomScroll()
        },
        "<Enter>": async() => {
            const {playSelectedSong} = require("./playlist")
            await playSelectedSong()
        },
        "<Home>": () => {
            const {topScroll} = require("./playlist")
            topScroll()
        },
        "<PageDown>": () => {
            document.getElementById("main-playlist").scrollBy(0, 300)
        },
        "<PageUp>": () => {
            document.getElementById("main-playlist").scrollBy(0, -300)
        },
        "S": () => {
            const {stopAfterLastTrackOfRule} = require("./playlist")
            stopAfterLastTrackOfRule()
        },
        "a": () => {
            const {toggleAutoScroll} = require("./playlist")
            toggleAutoScroll()
        },
        "c": () => {
            const {toggleAutoClose} = require("./playlist")
            toggleAutoClose()
        },
        "d": () => {
            const {deleteSelected} = require("./playlist")
            deleteSelected()
        },
        "h": () => {
            const {closeSelectedRule} = require("./playlist")
            closeSelectedRule()
        },
        "i": () => {
            const {showSongInfo} = require("./dom")
            showSongInfo("playlist")
        },
        "j": () => {
            const {incrementSelected} = require("./playlist")
            incrementSelected()
        },
        "k": () => {
            const {decrementSelected} = require("./playlist")
            decrementSelected()
        },
        "l": () => {
            const {openSelectedRule} = require("./playlist")
            openSelectedRule()
        },
        "r": () => {
            const {toggleAutoRemove} = require("./playlist")
            toggleAutoRemove()
        },
        "s": () => {
            const {stopAfterTrack} = require("./playlist")
            stopAfterTrack("selected")
        },
        "t": () => {
            const {toggleAutoLyrics} = require("./settings")
            toggleAutoLyrics()
        }
    },
    "search": {
        "<ArrowDown>": () => {
            const {incrementSelected} = require("./dom")
            incrementSelected()
        },
        "<ArrowUp>": () => {
            const {decrementSelected} = require("./dom")
            decrementSelected()
        },
        "<C-PageDown>": () => {
            const {incrementSelected} = require("./dom")
            let i = 0
            while (i < 10) {
                incrementSelected()
                i += 1
            }
        },
        "<C-PageUp>": () => {
            const {decrementSelected} = require("./dom")
            let i = 0
            while (i < 10) {
                decrementSelected()
                i += 1
            }
        },
        "<C-Tab>": () => switchFocus("playlist"),
        "<C-n>": () => {
            const {incrementSelected} = require("./dom")
            incrementSelected()
        },
        "<C-p>": () => {
            const {decrementSelected} = require("./dom")
            decrementSelected()
        },
        "<Enter>": () => {
            const {appendSelectedSong} = require("./dom")
            appendSelectedSong()
        },
        "<PageDown>": () => {
            document.getElementById("search-results").scrollBy(0, 300)
        },
        "<PageUp>": () => {
            document.getElementById("search-results").scrollBy(0, -300)
        },
        "<S-Enter>": () => {
            const {appendSelectedSong} = require("./dom")
            appendSelectedSong(true)
        },
        "i": () => {
            const {showSongInfo} = require("./dom")
            showSongInfo("search")
        }
    },
    "searchbox": {
        "<ArrowDown>": () => {
            const {incrementSelected} = require("./dom")
            incrementSelected()
        },
        "<C-Enter>": () => {
            const search = document.getElementById("rule-search").value
            const {setFallbackRule} = require("./playlist")
            setFallbackRule(search)
        },
        "<C-PageDown>": () => {
            const {incrementSelected} = require("./dom")
            let i = 0
            while (i < 10) {
                incrementSelected()
                i += 1
            }
        },
        "<C-Tab>": () => switchFocus("playlist"),
        "<C-n>": () => {
            const {incrementSelected} = require("./dom")
            incrementSelected()
        },
        "<Enter>": () => {
            const search = document.getElementById("rule-search").value
            const {append} = require("./playlist")
            append({"rule": search})
        },
        "<PageDown>": () => {
            document.getElementById("search-results").scrollBy(0, 300)
        },
        "<PageUp>": () => {
            document.getElementById("search-results").scrollBy(0, -300)
        },
        "<S-Enter>": () => {
            const search = document.getElementById("rule-search").value
            const {append} = require("./playlist")
            append({"rule": search}, true)
        }
    }
}

const handleKeyboard = async e => {
    if (e.key === "Tab" || !queryMatch(e, "textarea, input[type='text']")) {
        e.preventDefault()
    }
    if (!isReady()) {
        return
    }
    const id = toIdentifier(e)
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

const handleMouse = e => {
    if (!isReady()) {
        return
    }
    const ok = ".song, #song-info, textarea, input, "
        + "#fs-lyrics, #events-list, #infopanel-details"
    if (!queryMatch(e, ok)) {
        e.preventDefault()
    }
    if (queryMatch(e, "#song-info, #fs-lyrics")) {
        const {stunShiftLyrics} = require("./lyrics")
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
    if (mode === "events") {
        if (!queryMatch(e, "#events, #status-notify")) {
            closeSpecialMode()
        }
    }
    if (mode.startsWith("lyrics")) {
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
    if (queryMatch(e, "#make-fallback")) {
        const search = document.getElementById("rule-search").value
        const {setFallbackRule} = require("./playlist")
        setFallbackRule(search)
        return
    }
    if (queryMatch(e, "#add-songs")) {
        const search = document.getElementById("rule-search").value
        if (mode === "searchbox") {
            const {append} = require("./playlist")
            append({"rule": search})
        }
        if (mode === "search") {
            const {appendSelectedSong} = require("./dom")
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
    if (queryMatch(e, "#song-info") && !window.getSelection().toString()) {
        if (["search", "searchbox", "playlist"].includes(mode)) {
            switchFocus(mode)
        }
        return
    }
    if (queryMatch(e, "#export-playlist")) {
        const {exportList} = require("./playlist")
        exportList()
        return
    }
    if (queryMatch(e, "#import-playlist")) {
        const {importList} = require("./playlist")
        importList()
        return
    }
    if (queryMatch(e, "#save-settings")) {
        const {saveSettings} = require("./settings")
        saveSettings()
        return
    }
    if (queryMatch(e, "#prev, #fs-prev")) {
        const {decrement} = require("./playlist")
        decrement()
        return
    }
    if (queryMatch(e, "#pause, #fs-pause")) {
        const {pause} = require("./player")
        pause()
        return
    }
    if (queryMatch(e, "#next, #fs-next")) {
        const {increment} = require("./playlist")
        increment()
        return
    }
    if (queryMatch(e, "#show-help")) {
        const {resetShowingLyrics} = require("./lyrics")
        resetShowingLyrics()
        return
    }
    if (queryMatch(e, "#show-lyrics")) {
        const {switchToLyrics} = require("./lyrics")
        switchToLyrics()
        return
    }
    if (queryMatch(e, "#fetch-lyrics")) {
        const {switchToLyrics} = require("./lyrics")
        switchToLyrics(true)
        return
    }
    if (queryMatch(e, "#edit-lyrics")) {
        switchFocus("lyricseditor")
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
        const {searchLyrics} = require("./lyrics")
        searchLyrics(document.getElementById("lyrics-search").value)
        return
    }
    if (queryMatch(e, "#lyrics-save")) {
        const {saveLyrics} = require("./lyrics")
        saveLyrics()
        return
    }
    if (queryMatch(e, "#lyrics-edit-field")) {
        switchFocus("lyricseditor")
        return
    }
    if (queryMatch(e, "#lyrics-search")) {
        switchFocus("lyricssearch")
        return
    }
    if (queryMatch(e, "#lyrics-results")) {
        switchFocus("lyrics")
        return
    }
    if (queryMatch(e, "#lyrics-editor")) {
        switchFocus("lyrics")
    }
}

module.exports = {init}
