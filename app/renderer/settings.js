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

const {ipcRenderer} = require("electron")
const {deleteFile, notify, joinPath, writeJSON} = require("../util")

let autoLyrics = false
let startupConfig = {}

const init = () => {
    ipcRenderer.on("config", (_, config) => {
        startupConfig = config
        const {setStartupSettings} = require("./songs")
        setStartupSettings(config.configDir,
            config.cache || "all", config.cacheClean, config.useGenius)
        if (config.folder) {
            const {scanner} = require("./songs")
            scanner(config.folder, config.dumpLyrics)
        }
        autoLyrics = !!config.autoLyrics
        document.getElementById("toggle-autolyrics").checked = autoLyrics
        document.getElementById("toggle-genius").checked = config.useGenius
        document.getElementById("toggle-autolyrics").parentNode
            .addEventListener("click", () => toggleAutoLyrics())
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
        if (config.autoClose) {
            const {toggleAutoClose} = require("./playlist")
            toggleAutoClose()
        }
        if (config.autoRemove) {
            const {toggleAutoRemove} = require("./playlist")
            toggleAutoRemove()
        }
        const {"init": startMpv} = require("./player")
        let defaultMpv = "mpv"
        if (process.platform === "win32") {
            defaultMpv = "mpv.exe"
        }
        startMpv(config.mpv || defaultMpv)
    })
}

const shouldAutoFetchLyrics = () => autoLyrics

const toggleAutoLyrics = () => {
    autoLyrics = !autoLyrics
    document.getElementById("toggle-autolyrics").checked = autoLyrics
}

const saveSettings = () => {
    const config = JSON.parse(JSON.stringify(startupConfig))
    const configFile = joinPath(config.configDir, "settings.json")
    delete config.configDir
    delete config.version
    delete config.dumpLyrics
    const folder = document.getElementById("status-folder").textContent.trim()
    if (folder !== "No folder selected") {
        config.folder = folder
    }
    config.autoScroll = document.getElementById("toggle-autoscroll").checked
    config.autoClose = document.getElementById("toggle-autoclose").checked
    config.autoRemove = document.getElementById("toggle-autoremove").checked
    config.autoLyrics = document.getElementById("toggle-autolyrics").checked
    if (!config.autoScroll) {
        delete config.autoScroll
    }
    if (!config.autoClose) {
        delete config.autoClose
    }
    if (!config.autoRemove) {
        delete config.autoRemove
    }
    if (!config.autoLyrics) {
        delete config.autoLyrics
    }
    if (config.cache === "all") {
        delete config.cache
    }
    if (!config.cacheClean) {
        delete config.cacheClean
    }
    if (!config.customTheme) {
        delete config.customTheme
    }
    if (!config.folder) {
        delete config.folder
    }
    if (!config.fontSize || config.fontSize === 14) {
        delete config.fontSize
    }
    let defaultMpv = "mpv"
    if (process.platform === "win32") {
        defaultMpv = "mpv.exe"
    }
    if (!config.mpv || config.mpv === defaultMpv) {
        delete config.mpv
    }
    let success = false
    if (Object.keys(config).length === 0) {
        success = deleteFile(configFile)
    } else {
        success = writeJSON(configFile, config, 4)
    }
    if (!success) {
        notify("Failed to save current settings")
    }
}

module.exports = {init, saveSettings, shouldAutoFetchLyrics, toggleAutoLyrics}
