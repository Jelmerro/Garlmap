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

const {ipcRenderer, clipboard} = require("electron")
const {keyMatch, queryMatch, resetWelcome} = require("../util")

const init = () => {
    window.addEventListener("keydown", e => {
        if (["Tab", "Enter"].includes(e.key) || !queryMatch(e, "textarea")) {
            e.preventDefault()
        }
        if (!queryMatch(e, "textarea")) {
            handleKeyboard(e)
        }
    })
    window.addEventListener("keypress", e => {
        if (["Tab", "Enter"].includes(e.key) || !queryMatch(e, "textarea")) {
            e.preventDefault()
        }
    })
    window.addEventListener("keyup", e => {
        if (["Tab", "Enter"].includes(e.key) || !queryMatch(e, "textarea")) {
            e.preventDefault()
        }
        if (queryMatch(e, "textarea")) {
            handleKeyboard(e)
        }
    })
    window.addEventListener("click", e => e.preventDefault())
    window.addEventListener("mousedown", handleMouse)
    resetWelcome()
}

const handleKeyboard = async e => {
    if (e.key === "Tab" || !queryMatch(e, "textarea")) {
        e.preventDefault()
    }
    if (keyMatch(e, {"key": "Tab"})) {
        const {switchFocus} = require("./dom")
        switchFocus("searchbox")
        return
    }
    if (keyMatch(e, {"key": "o", "ctrl": true})) {
        if (document.getElementById("status-current").textContent !== "Ready") {
            return
        }
        const {scanner} = require("./songs")
        const folder = ipcRenderer.sendSync("dialog-dir", {
            "title": "Open a folder", "properties": ["openDirectory"]
        })?.[0]
        if (folder) {
            setTimeout(() => scanner(folder), 1)
        }
        return
    }
    if (keyMatch(e, {"key": "c", "ctrl": true})) {
        const text = window.getSelection().toString()
        if (text) {
            clipboard.writeText(text)
        }
        return
    }
    if (keyMatch(e, {"key": "m", "ctrl": true})) {
        const {toggleMute} = require("./player")
        toggleMute()
        return
    }
    if (keyMatch(e, {"key": "=", "ctrl": true})) {
        const {volumeUp} = require("./player")
        volumeUp()
        return
    }
    if (keyMatch(e, {"key": "-", "ctrl": true})) {
        const {volumeDown} = require("./player")
        volumeDown()
        return
    }
    if (keyMatch(e, {"key": "F1"})) {
        resetWelcome()
        return
    }
    if (keyMatch(e, {"key": "F2"}) || keyMatch(e, {"key": "f", "ctrl": true})) {
        const {switchFocus} = require("./dom")
        switchFocus("search")
        return
    }
    if (keyMatch(e, {"key": "F3"}) || keyMatch(e, {"key": "l", "ctrl": true})) {
        const {switchFocus} = require("./dom")
        switchFocus("playlist")
        return
    }
    if (keyMatch(e, {"key": "F4"})) {
        const {isAlive} = require("./player")
        if (isAlive()) {
            const {currentAndNext} = require("./playlist")
            const {fetchLyrics} = require("./songs")
            const {current} = currentAndNext()
            if (current) {
                await fetchLyrics(current)
                document.getElementById("song-info").scrollTo(0, 0)
            }
            return
        }
    }
    if (keyMatch(e, {"key": "F5"})) {
        const {pause} = require("./player")
        pause()
        return
    }
    if (keyMatch(e, {"key": "F6"})) {
        const {stopAfterTrack} = require("./playlist")
        stopAfterTrack()
        return
    }
    if (keyMatch(e, {"key": "F7"})) {
        const {decrement} = require("./playlist")
        decrement()
        return
    }
    if (keyMatch(e, {"key": "F8"})) {
        const {increment} = require("./playlist")
        increment()
        return
    }
    if (keyMatch(e, {"key": "F9"})) {
        document.getElementById("song-info").scrollBy(0, 100)
        return
    }
    if (keyMatch(e, {"key": "F10"})) {
        document.getElementById("song-info").scrollBy(0, -100)
        return
    }
    if (keyMatch(e, {"key": "F11"})) {
        // TODO fullscreen
        return
    }
    if (keyMatch(e, {"key": "F12"})) {
        ipcRenderer.invoke("toggle-devtools")
        return
    }
    if (document.body.getAttribute("focus-el") === "search") {
        if (keyMatch(e, {"key": "ArrowUp"})
        || keyMatch(e, {"key": "p", "ctrl": true})) {
            const {decrementSelected} = require("./dom")
            decrementSelected()
            return
        }
        if (keyMatch(e, {"key": "ArrowDown"})
        || keyMatch(e, {"key": "n", "ctrl": true})) {
            const {incrementSelected} = require("./dom")
            incrementSelected()
            return
        }
        if (queryMatch(e, "#rule-search")) {
            const search = document.getElementById("rule-search").value
            if (keyMatch(e, {"key": "Enter"})) {
                const {append} = require("./playlist")
                append({"rule": search})
                e.preventDefault()
            } else if (keyMatch(e, {"key": "Enter", "shift": true})) {
                const {append} = require("./playlist")
                append({"rule": search}, true)
                e.preventDefault()
            } else if (keyMatch(e, {"key": "Enter", "ctrl": true})) {
                const {setFallbackRule} = require("./playlist")
                setFallbackRule(search)
                e.preventDefault()
            } else if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
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
                    el.addEventListener("mousedown", () => {
                        document.querySelector("#search-results .selected")
                            ?.classList.remove("selected")
                        el.classList.add("selected")
                        el?.scrollIntoView({"block": "nearest"})
                    })
                })
            }
            return
        }
        if (keyMatch(e, {"key": "Enter"})) {
            const {appendSelectedSong} = require("./dom")
            appendSelectedSong()
            return
        }
        if (keyMatch(e, {"key": "Enter", "shift": true})) {
            const {appendSelectedSong} = require("./dom")
            appendSelectedSong(true)
            return
        }
    }
    if (document.body.getAttribute("focus-el") === "playlist") {
        if (keyMatch(e, {"key": "ArrowLeft"}) || keyMatch(e, {"key": "h"})) {
            const {closeSelectedRule} = require("./playlist")
            closeSelectedRule()
        }
        if (keyMatch(e, {"key": "ArrowRight"}) || keyMatch(e, {"key": "l"})) {
            const {openSelectedRule} = require("./playlist")
            openSelectedRule()
        }
        if (keyMatch(e, {"key": "ArrowUp"}) || keyMatch(e, {"key": "k"})
        || keyMatch(e, {"key": "p", "ctrl": true})) {
            setTimeout(() => {
                const {decrementSelected} = require("./playlist")
                decrementSelected()
            }, 1)
        }
        if (keyMatch(e, {"key": "ArrowDown"}) || keyMatch(e, {"key": "j"})
        || keyMatch(e, {"key": "n", "ctrl": true})) {
            setTimeout(() => {
                const {incrementSelected} = require("./playlist")
                incrementSelected()
            }, 1)
        }
        if (keyMatch(e, {"key": "d"}) || keyMatch(e, {"key": "Delete"})) {
            const {deleteSelected} = require("./playlist")
            deleteSelected()
        }
        if (keyMatch(e, {"key": "s"})) {
            const {stopAfterTrack} = require("./playlist")
            stopAfterTrack("selected")
        }
        if (keyMatch(e, {"key": "Enter"})) {
            const {playSelectedSong} = require("./playlist")
            await playSelectedSong()
        }
    }
}

const handleMouse = e => {
    if (!queryMatch(e, ".song") && !queryMatch(e, "#song-info")) {
        e.preventDefault()
    }
    if (queryMatch(e, "#prev")) {
        const {decrement} = require("./playlist")
        decrement()
        return
    }
    if (queryMatch(e, "#pause")) {
        const {pause} = require("./player")
        pause()
        return
    }
    if (queryMatch(e, "#next")) {
        const {increment} = require("./playlist")
        increment()
        return
    }
    if (queryMatch(e, "#rule-search")) {
        const {switchFocus} = require("./dom")
        switchFocus("searchbox")
        return
    }
    if (queryMatch(e, "#search-container")) {
        const {switchFocus} = require("./dom")
        switchFocus("search")
    }
    if (queryMatch(e, "#playlist-container")) {
        const {switchFocus} = require("./dom")
        switchFocus("playlist")
    }
    if (queryMatch(e, "#progress-container")) {
        const {seek} = require("./player")
        const clickPercent = (event, element) => {
            const x = event.pageX - element.offsetLeft
                - element.offsetParent.offsetLeft
            const percentage = x / element.getBoundingClientRect().width
            if (percentage < 0.01) {
                return 0
            }
            return percentage
        }
        seek(clickPercent(e, document.getElementById("progress-container")))
    }
}

module.exports = {init}
