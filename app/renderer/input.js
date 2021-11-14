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

const {ipcRenderer} = require("electron")
const {keyMatch, queryMatch, resetWelcome} = require("../util")

const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", e => {
        if (e.key === "Tab" || !queryMatch(e, "input")) {
            e.preventDefault()
        }
    })
    window.addEventListener("keyup", e => {
        if (e.key === "Tab" || !queryMatch(e, "input")) {
            e.preventDefault()
        }
    })
    window.addEventListener("click", e => e.preventDefault())
    window.addEventListener("mousedown", handleMouse)
    resetWelcome()
}

const handleKeyboard = e => {
    if (e.key === "Tab" || !queryMatch(e, "input")) {
        e.preventDefault()
    }
    if (queryMatch(e, "#rule-search")) {
        const {query} = require("./songs")
        const search = document.getElementById("rule-search").value
        const results = query(search)
        // TODO display results and allow appending
        console.log(results)
        document.getElementById("rule-results").textContent = JSON.stringify(results, null, 3)
    }
    if (document.getElementById("status-current").textContent !== "Ready") {
        return
    }
    if (keyMatch(e, {"key": "o", "ctrl": true})) {
        const {scanner} = require("./songs")
        const folder = ipcRenderer.sendSync("dialog-dir", {
            "title": "Open a folder", "properties": ["openDirectory"]
        })?.[0]
        if (folder) {
            setTimeout(() => scanner(folder), 1)
        }
    }
    if (keyMatch(e, {"key": "F1"})) {
        resetWelcome()
    }
    if (keyMatch(e, {"key": "F2"})) {
        // TODO search section
    }
    if (keyMatch(e, {"key": "F3"})) {
        // TODO playlist section
    }
    if (keyMatch(e, {"key": "F4"})) {
        const {currentAndNext} = require("./playlist")
        const {fetchLyrics} = require("./songs")
        const {current} = currentAndNext()
        if (current) {
            fetchLyrics(current)
        }
    }
    if (keyMatch(e, {"key": "F5"})) {
        const {pause} = require("./player")
        pause()
    }
    if (keyMatch(e, {"key": "F6"})) {
        // TODO stop after this track
    }
    if (keyMatch(e, {"key": "F7"})) {
        const {decrement} = require("./playlist")
        decrement()
    }
    if (keyMatch(e, {"key": "F8"})) {
        const {increment} = require("./playlist")
        increment()
    }
    if (keyMatch(e, {"key": "F9"})) {
        document.getElementById("song-info").scrollBy(0, 100)
    }
    if (keyMatch(e, {"key": "F10"})) {
        document.getElementById("song-info").scrollBy(0, -100)
    }
    if (keyMatch(e, {"key": "F11"})) {
        // TODO fullscreen
    }
    if (keyMatch(e, {"key": "F12"})) {
        ipcRenderer.invoke("toggle-devtools")
    }
}

const handleMouse = e => {
    if (queryMatch(e, "#prev")) {
        const {decrement} = require("./playlist")
        decrement()
    }
    if (queryMatch(e, "#pause")) {
        const {pause} = require("./player")
        pause()
    }
    if (queryMatch(e, "#next")) {
        const {increment} = require("./playlist")
        increment()
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
