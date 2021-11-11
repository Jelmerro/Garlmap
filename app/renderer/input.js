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

const {keyMatch, queryMatch} = require("./util")

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
}

const handleKeyboard = e => {
    if (e.key === "Tab" || !queryMatch(e, "input")) {
        e.preventDefault()
    }
    if (queryMatch(e, "#rule-search")) {
        const search = document.getElementById("rule-search").value
        console.log(search)
    }
    if (document.getElementById("status-current").textContent !== "Ready") {
        return
    }
    if (keyMatch(e, {"key": "o", "ctrl": true})) {
        const {scanner} = require("./songs")
        setTimeout(() => scanner("/mnt/HDD/Music/Weezer/"), 1)
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
        increment(true)
    }
    if (queryMatch(e, "#progress-container")) {
        const {seek} = require("./player")
        const clickPercent = (event, element) => {
            const x = event.pageX - element.offsetLeft - element.offsetParent.offsetLeft
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