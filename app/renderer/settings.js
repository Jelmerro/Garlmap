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

let startupConfig = {}

const init = () => {
    ipcRenderer.on("config", (_, config) => {
        startupConfig = config
        const {setStartupSettings} = require("./songs")
        // Two column
        document.body.setAttribute("two-column", config.twoColumn || "mobile")
        document.getElementById("setting-two-column")
            .addEventListener("input", () => {
                document.body.setAttribute("two-column",
                    document.getElementById("setting-two-column").value)
            })
        document.getElementById("setting-two-column").value
            = config.twoColumn || "mobile"
        // Autoclose
        document.getElementById("toggle-autoclose").checked = config.autoClose
        document.getElementById("toggle-autoclose").parentNode
            .addEventListener("click", () => {
                const {toggleAutoClose} = require("./playlist")
                toggleAutoClose()
            })
        // Autolyrics
        document.getElementById("toggle-autolyrics").checked = config.autoLyrics
        document.getElementById("toggle-autolyrics").parentNode
            .addEventListener("click", () => toggleAutoLyrics())
        // Autoremove
        document.getElementById("toggle-autoremove").checked = config.autoRemove
        document.getElementById("toggle-autoremove").parentNode
            .addEventListener("click", () => {
                const {toggleAutoRemove} = require("./playlist")
                toggleAutoRemove()
            })
        // Autoscroll
        document.getElementById("toggle-autoscroll").checked = config.autoScroll
        document.getElementById("toggle-autoscroll").parentNode
            .addEventListener("click", () => {
                const {toggleAutoScroll} = require("./playlist")
                toggleAutoScroll()
            })
        // Cache
        document.getElementById("setting-cache").value = config.cache || "all"
        // Cacheclean
        document.getElementById("setting-cache-clean")
            .addEventListener("click", () => {
                document.getElementById("toggle-cache-clean").checked
                    = !document.getElementById("toggle-cache-clean").checked
                document.getElementById("setting-cache-clean").focus()
            })
        document.getElementById("toggle-cache-clean").checked
            = config.cacheClean
        // Set config dir
        setStartupSettings(config.configDir)
        // Shifttimer
        document.getElementById("setting-shift-timer").value
            = config.shiftTimer || 0
        document.getElementById("setting-shift-timer")
            .addEventListener("input", () => {
                const val = document.getElementById("setting-shift-timer").value
                if (Number(val) > 0) {
                    document.getElementById("toggle-shift-lyrics")
                        .parentNode.style.display = "none"
                } else {
                    document.getElementById("toggle-shift-lyrics")
                        .parentNode.style.display = null
                }
            })
        // Shiftlyrics
        document.getElementById("toggle-shift-lyrics").checked
            = config.shiftLyrics || config.shiftTimer
        if (config.shiftTimer) {
            document.getElementById("toggle-shift-lyrics")
                .parentNode.style.display = "none"
        }
        document.getElementById("toggle-shift-lyrics").parentNode
            .addEventListener("click", () => toggleShiftLyrics())
        // Fontsize
        document.getElementById("setting-fontsize").value
            = config.fontSize || "14"
        // Customtheme
        if (config.customTheme) {
            const styleEl = document.createElement("style")
            styleEl.textContent = config.customTheme
            document.head.appendChild(styleEl)
        }
        // Usegenius
        document.getElementById("toggle-genius").checked
            = config.useGenius ?? true
        document.getElementById("toggle-genius").parentNode
            .addEventListener("click", () => toggleGenius())
        // Mpv
        document.getElementById("setting-mpv").value = config.mpv || ""
        const {"init": startMpv} = require("./player")
        let defaultMpv = "mpv"
        if (process.platform === "win32") {
            defaultMpv = "mpv.exe"
        }
        startMpv(config.mpv || defaultMpv)
        // Scan folder on startup
        if (config.folder) {
            const {scanner} = require("./songs")
            scanner(config.folder, config.dumpLyrics)
        }
    })
}

const toggleAutoLyrics = () => {
    document.getElementById("toggle-autolyrics").checked
        = !document.getElementById("toggle-autolyrics").checked
}

const toggleShiftLyrics = () => {
    if (Number(document.getElementById("setting-shift-timer").value) > 0) {
        return
    }
    document.getElementById("toggle-shift-lyrics").checked
        = !document.getElementById("toggle-shift-lyrics").checked
}

const toggleGenius = () => {
    document.getElementById("toggle-genius").checked
        = !document.getElementById("toggle-genius").checked
}

const saveSettings = () => {
    const config = {}
    const configFile = joinPath(startupConfig.configDir, "settings.json")
    const folder = document.getElementById("status-folder").textContent.trim()
    if (folder !== "No folder selected") {
        config.folder = folder
    }
    config.autoScroll = document.getElementById("toggle-autoscroll").checked
    config.autoClose = document.getElementById("toggle-autoclose").checked
    config.autoRemove = document.getElementById("toggle-autoremove").checked
    config.autoLyrics = document.getElementById("toggle-autolyrics").checked
    config.useGenius = document.getElementById("toggle-genius").checked
    config.shiftTimer = Number(document.getElementById(
        "setting-shift-timer").value) || 0
    config.shiftLyrics = document.getElementById("toggle-shift-lyrics").checked
        && config.shiftTimer === 0
    config.cacheClean = document.getElementById("toggle-cache-clean").checked
    config.cache = document.getElementById("setting-cache").value
    config.twoColumn = document.getElementById("setting-two-column").value
    config.fontSize = Number(document.getElementById(
        "setting-fontsize").value) || 14
    config.mpv = document.getElementById("setting-mpv").value
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
    if (config.useGenius) {
        delete config.useGenius
    }
    if (!config.shiftLyrics) {
        delete config.shiftLyrics
    }
    if (!config.shiftTimer) {
        delete config.shiftTimer
    }
    if (config.cache === "all") {
        delete config.cache
    }
    if (config.twoColumn === "mobile") {
        delete config.twoColumn
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

module.exports = {
    init, saveSettings, toggleAutoLyrics, toggleGenius, toggleShiftLyrics
}
