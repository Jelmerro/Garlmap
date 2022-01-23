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

let autoLyrics = false

const init = () => {
    ipcRenderer.on("config", (_, config) => {
        const {setCachePolicy} = require("./songs")
        setCachePolicy(config.configDir, config.cache || "all")
        if (config.folder) {
            const {scanner} = require("./songs")
            setTimeout(() => scanner(config.folder), 1)
        }
        autoLyrics = !!config.autoLyrics
        if (config.fontSize) {
            document.body.style.fontSize = `${config.fontSize}px`
        }
        if (config.customTheme) {
            const styleEl = document.createElement("style")
            styleEl.textContent = config.customTheme
            document.head.appendChild(styleEl)
        }
        if (config.autoScroll) {
            const {toggleAutoScroll} = require("./playlist")
            toggleAutoScroll()
        }
    })
}

const shouldAutoFetchLyrics = () => autoLyrics

module.exports = {init, shouldAutoFetchLyrics}
