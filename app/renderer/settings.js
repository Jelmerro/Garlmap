/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2021-2023 Jelmer van Arnhem
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
            try {
                applyPrimaryColorToImages()
            } catch {
                // Should not prevent loading mpv and playing songs
            }
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
        startMpv(config.mpv || defaultMpv, config.configDir)
        // Fallback
        document.getElementById("setting-fallback").value = config.fallback
            || "order=shuffle"
        // Autoplay
        document.getElementById("setting-autoplay")
            .addEventListener("click", () => {
                document.getElementById("toggle-autoplay").checked
                    = !document.getElementById("toggle-autoplay").checked
                document.getElementById("setting-autoplay").focus()
            })
        document.getElementById("toggle-autoplay").checked
            = config.autoplay ?? false
        // Api key
        document.getElementById("setting-apikey").value
            = config.apiKey ?? ""
        // Scan folder on startup
        if (config.folder) {
            setTimeout(async() => {
                const {scanner} = require("./songs")
                await scanner(config.folder, config.dumpLyrics)
                if (config.fallback) {
                    const {setFallbackRule} = require("./playlist")
                    setFallbackRule(config.fallback)
                }
                if (config.autoplay) {
                    const {pause} = require("./player")
                    pause()
                }
            }, 10)
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
    config.fallback = document.getElementById("setting-fallback").value
    config.autoplay = document.getElementById("toggle-autoplay").checked
    config.apiKey = document.getElementById("setting-apikey").value
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
    if (!config.fallback || config.fallback === "order=shuffle") {
        delete config.fallback
    }
    if (!config.autoplay) {
        delete config.autoplay
    }
    if (!config.apiKey) {
        delete config.apiKey
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

const cssColors = {
    "aliceblue": "#f0f8ff",
    "antiquewhite": "#faebd7",
    "aqua": "#00ffff",
    "aquamarine": "#7fffd4",
    "azure": "#f0ffff",
    "beige": "#f5f5dc",
    "bisque": "#ffe4c4",
    "black": "#000000",
    "blanchedalmond": "#ffebcd",
    "blue": "#0000ff",
    "blueviolet": "#8a2be2",
    "brown": "#a52a2a",
    "burlywood": "#deb887",
    "cadetblue": "#5f9ea0",
    "chartreuse": "#7fff00",
    "chocolate": "#d2691e",
    "coral": "#ff7f50",
    "cornflowerblue": "#6495ed",
    "cornsilk": "#fff8dc",
    "crimson": "#dc143c",
    "cyan": "#00ffff",
    "darkblue": "#00008b",
    "darkcyan": "#008b8b",
    "darkgoldenrod": "#b8860b",
    "darkgray": "#a9a9a9",
    "darkgreen": "#006400",
    "darkgrey": "#a9a9a9",
    "darkkhaki": "#bdb76b",
    "darkmagenta": "#8b008b",
    "darkolivegreen": "#556b2f",
    "darkorange": "#ff8c00",
    "darkorchid": "#9932cc",
    "darkred": "#8b0000",
    "darksalmon": "#e9967a",
    "darkseagreen": "#8fbc8f",
    "darkslateblue": "#483d8b",
    "darkslategray": "#2f4f4f",
    "darkslategrey": "#2f4f4f",
    "darkturquoise": "#00ced1",
    "darkviolet": "#9400d3",
    "deeppink": "#ff1493",
    "deepskyblue": "#00bfff",
    "dimgray": "#696969",
    "dimgrey": "#696969",
    "dodgerblue": "#1e90ff",
    "firebrick": "#b22222",
    "floralwhite": "#fffaf0",
    "forestgreen": "#228b22",
    "fuchsia": "#ff00ff",
    "gainsboro": "#dcdcdc",
    "ghostwhite": "#f8f8ff",
    "gold": "#ffd700",
    "goldenrod": "#daa520",
    "gray": "#808080",
    "green": "#008000",
    "greenyellow": "#adff2f",
    "grey": "#808080",
    "honeydew": "#f0fff0",
    "hotpink": "#ff69b4",
    "indianred": "#cd5c5c",
    "indigo": "#4b0082",
    "ivory": "#fffff0",
    "khaki": "#f0e68c",
    "lavender": "#e6e6fa",
    "lavenderblush": "#fff0f5",
    "lawngreen": "#7cfc00",
    "lemonchiffon": "#fffacd",
    "lightblue": "#add8e6",
    "lightcoral": "#f08080",
    "lightcyan": "#e0ffff",
    "lightgoldenrodyellow": "#fafad2",
    "lightgray": "#d3d3d3",
    "lightgreen": "#90ee90",
    "lightgrey": "#d3d3d3",
    "lightpink": "#ffb6c1",
    "lightsalmon": "#ffa07a",
    "lightseagreen": "#20b2aa",
    "lightskyblue": "#87cefa",
    "lightslategray": "#778899",
    "lightslategrey": "#778899",
    "lightsteelblue": "#b0c4de",
    "lightyellow": "#ffffe0",
    "lime": "#00ff00",
    "limegreen": "#32cd32",
    "linen": "#faf0e6",
    "magenta": "#ff00ff",
    "maroon": "#800000",
    "mediumaquamarine": "#66cdaa",
    "mediumblue": "#0000cd",
    "mediumorchid": "#ba55d3",
    "mediumpurple": "#9370db",
    "mediumseagreen": "#3cb371",
    "mediumslateblue": "#7b68ee",
    "mediumspringgreen": "#00fa9a",
    "mediumturquoise": "#48d1cc",
    "mediumvioletred": "#c71585",
    "midnightblue": "#191970",
    "mintcream": "#f5fffa",
    "mistyrose": "#ffe4e1",
    "moccasin": "#ffe4b5",
    "navajowhite": "#ffdead",
    "navy": "#000080",
    "oldlace": "#fdf5e6",
    "olive": "#808000",
    "olivedrab": "#6b8e23",
    "orange": "#ffa500",
    "orangered": "#ff4500",
    "orchid": "#da70d6",
    "palegoldenrod": "#eee8aa",
    "palegreen": "#98fb98",
    "paleturquoise": "#afeeee",
    "palevioletred": "#db7093",
    "papayawhip": "#ffefd5",
    "peachpuff": "#ffdab9",
    "peru": "#cd853f",
    "pink": "#ffc0cb",
    "plum": "#dda0dd",
    "powderblue": "#b0e0e6",
    "purple": "#800080",
    "rebeccapurple": "#663399",
    "red": "#ff0000",
    "rosybrown": "#bc8f8f",
    "royalblue": "#4169e1",
    "saddlebrown": "#8b4513",
    "salmon": "#fa8072",
    "sandybrown": "#f4a460",
    "seagreen": "#2e8b57",
    "seashell": "#fff5ee",
    "sienna": "#a0522d",
    "silver": "#c0c0c0",
    "skyblue": "#87ceeb",
    "slateblue": "#6a5acd",
    "slategray": "#708090",
    "slategrey": "#708090",
    "snow": "#fffafa",
    "springgreen": "#00ff7f",
    "steelblue": "#4682b4",
    "tan": "#d2b48c",
    "teal": "#008080",
    "thistle": "#d8bfd8",
    "tomato": "#ff6347",
    "turquoise": "#40e0d0",
    "violet": "#ee82ee",
    "wheat": "#f5deb3",
    "white": "#ffffff",
    "whitesmoke": "#f5f5f5",
    "yellow": "#ffff00",
    "yellowgreen": "#9acd32"
}

const applyPrimaryColorToImages = () => {
    const color = getComputedStyle(document.body).getPropertyValue("--icons")
    const rgb = hexToRgb(cssColors[color.trim()] || color.trim())
    document.querySelector("#colored feColorMatrix").setAttribute("values",
        `${rgb.r / 256} 0 0 0 0 ${rgb.g / 256} `
        + `0 0 0 0 ${rgb.b / 256} 0 0 0 0 0 0 0 1 0`)
}

const hexToRgb = hex => {
    const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    const split = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b)
    const result = (/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i).exec(split)
    if (result) {
        return {
            "b": parseInt(result[3], 16),
            "g": parseInt(result[2], 16),
            "r": parseInt(result[1], 16)
        }
    }
    return null
}

module.exports = {
    init, saveSettings, toggleAutoLyrics, toggleGenius, toggleShiftLyrics
}
