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
    deleteFile,
    getInputNumber,
    getInputValue,
    isHTMLInputElement,
    isHTMLLabelElement,
    isHTMLSelectElement,
    isInputChecked,
    joinPath,
    notify,
    writeJSON
} from "../util.js"
import {pause, init as startMpv} from "./player.js"
import {scanner, setStartupSettings} from "./songs.js"
import {
    setFallbackRule, toggleAutoClose, toggleAutoRemove, toggleAutoScroll
} from "./playlist.js"
import {ipcRenderer} from "electron"

/** @typedef {{
 *   apiKey: string | undefined,
 *   autoClose?: boolean | undefined,
 *   autoLyrics?: boolean | undefined,
 *   autoRemove?: boolean | undefined,
 *   autoScroll?: boolean | undefined,
 *   autoplay?: boolean | undefined,
 *   cache: string | undefined,
 *   cacheClean?: boolean | undefined,
 *   configDir: string,
 *   customTheme: string | null,
 *   debug?: boolean | undefined,
 *   dumpLyrics?: boolean | undefined,
 *   fallback: string | undefined,
 *   folder: string | undefined,
 *   fontSize: string | number | undefined,
 *   mpv: string | undefined,
 *   shiftLyrics?: boolean | undefined,
 *   shiftTimer?: string | number | undefined,
 *   twoColumn: string | undefined,
 *   useGenius?: boolean | undefined,
 *   version?: string | undefined
 * }} Config
 */

/** Toggle the auto lyrics feature. */
export const toggleAutoLyrics = () => {
    const autoLyricsEl = document.getElementById("toggle-autolyrics")
    if (isHTMLInputElement(autoLyricsEl)) {
        autoLyricsEl.checked = !autoLyricsEl.checked
    }
}

/** Toggle the shift lyrics feature. */
export const toggleShiftLyrics = () => {
    if (getInputNumber("settings-shift-timer") > 0) {
        return
    }
    const toggleEl = document.getElementById("toggle-shift-lyrics")
    if (isHTMLInputElement(toggleEl)) {
        toggleEl.checked = !toggleEl.checked
    }
}

/** Toggle the automatic invocation of the Genius API. */
export const toggleGenius = () => {
    const toggleGeniusEl = document.getElementById("toggle-genius")
    if (isHTMLInputElement(toggleGeniusEl)) {
        toggleGeniusEl.checked = !toggleGeniusEl.checked
    }
}

/** Save the currently active settings to disk inside the configdir. */
export const saveSettings = () => {
    const startupConfigDir = localStorage.getItem("startup-config-dir")
    if (!startupConfigDir) {
        return
    }
    const configFile = joinPath(startupConfigDir, "settings.json")
    /** @type {Partial<Config>} */
    const config = {
        "apiKey": getInputValue("setting-apikey"),
        "autoClose": isInputChecked("toggle-autoclose"),
        "autoLyrics": isInputChecked("toggle-autolyrics"),
        "autoRemove": isInputChecked("toggle-autoremove"),
        "autoScroll": isInputChecked("toggle-autoscroll"),
        "autoplay": isInputChecked("toggle-autoplay"),
        "cache": getInputValue("setting-cache"),
        "cacheClean": isInputChecked("toggle-cache-clean"),
        "fallback": getInputValue("setting-fallback"),
        "folder": document.getElementById("status-folder")?.textContent?.trim(),
        "fontSize": getInputNumber("setting-fontsize") || 14,
        "mpv": getInputValue("setting-mpv"),
        "shiftLyrics": isInputChecked("toggle-shift-lyrics")
            && getInputNumber("setting-shift-timer") === 0,
        "shiftTimer": getInputNumber("setting-shift-timer"),
        "twoColumn": getInputValue("setting-two-column"),
        "useGenius": isInputChecked("toggle-genius")
    }
    if (!config.apiKey) {
        delete config.apiKey
    }
    if (!config.autoClose) {
        delete config.autoClose
    }
    if (!config.autoLyrics) {
        delete config.autoLyrics
    }
    if (!config.autoRemove) {
        delete config.autoRemove
    }
    if (!config.autoScroll) {
        delete config.autoScroll
    }
    if (!config.autoplay) {
        delete config.autoplay
    }
    if (config.cache === "all") {
        delete config.cache
    }
    if (!config.cacheClean) {
        delete config.cacheClean
    }
    if (!config.fallback || config.fallback === "order=shuffle") {
        delete config.fallback
    }
    if (!config.folder || config.folder === "No folder selected") {
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
    if (!config.shiftLyrics) {
        delete config.shiftLyrics
    }
    if (!config.shiftTimer) {
        delete config.shiftTimer
    }
    if (config.twoColumn === "mobile") {
        delete config.twoColumn
    }
    if (config.useGenius) {
        delete config.useGenius
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
/** @type {{[key: string]: string | undefined}} */
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

/**
 * Convert a color hex code to red, green and blue values.
 * @param {string} hex
 */
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

/** Apply the primary color or the icon specific color as an image filter. */
const applyPrimaryColorToImages = () => {
    const color = getComputedStyle(document.body).getPropertyValue("--icons")
    const rgb = hexToRgb(cssColors[color.trim()] || color.trim())
    const matrixEl = document.querySelector("#colored feColorMatrix")
    if (rgb && matrixEl) {
        matrixEl.setAttribute("values", `${rgb.r / 256} 0 0 0 0 ${rgb.g / 256} `
            + `0 0 0 0 ${rgb.b / 256} 0 0 0 0 0 0 0 1 0`)
    }
}

/** Initialize the settings by waiting for the config from main. */
export const init = () => {
    ipcRenderer.invoke("config").then(
        /**
         * Load the config, set interface according and load folder if present.
         * @param {Config} config
         */
        config => {
            localStorage.setItem("startup-config-dir", config.configDir)
            // Two column
            document.body.setAttribute(
                "two-column", config.twoColumn || "mobile")
            const twoColumnEl = document.getElementById("setting-two-column")
            if (isHTMLSelectElement(twoColumnEl)) {
                twoColumnEl.value = config.twoColumn || "mobile"
                twoColumnEl.addEventListener("input", () => {
                    if (isHTMLSelectElement(twoColumnEl)) {
                        document.body.setAttribute(
                            "two-column", twoColumnEl.value)
                    }
                })
            }
            // Autoclose
            const autoCloseEl = document.getElementById("toggle-autoclose")
            if (isHTMLInputElement(autoCloseEl)) {
                autoCloseEl.checked = config.autoClose ?? false
                autoCloseEl.parentNode?.addEventListener("click", () => {
                    toggleAutoClose()
                })
            }
            // Autolyrics
            const autoLyricsEl = document.getElementById("toggle-autolyrics")
            if (isHTMLInputElement(autoLyricsEl)) {
                autoLyricsEl.checked = config.autoLyrics ?? false
                autoLyricsEl.parentNode?.addEventListener(
                    "click", () => toggleAutoLyrics())
            }
            // Autoremove
            const autoRemoveEl = document.getElementById("toggle-autoremove")
            if (isHTMLInputElement(autoRemoveEl)) {
                autoRemoveEl.checked = config.autoRemove ?? false
                autoRemoveEl.parentNode?.addEventListener("click", () => {
                    toggleAutoRemove()
                })
            }
            // Autoscroll
            const autoScrollEl = document.getElementById("toggle-autoscroll")
            if (isHTMLInputElement(autoScrollEl)) {
                autoScrollEl.checked = config.autoScroll ?? false
                autoScrollEl.parentNode?.addEventListener("click", () => {
                    toggleAutoScroll()
                })
            }
            // Cache
            const settingCacheEl = document.getElementById("setting-cache")
            if (isHTMLSelectElement(settingCacheEl)) {
                settingCacheEl.value = config.cache || "all"
            }
            // Cacheclean
            const cacheCleanEl = document.getElementById("toggle-cache-clean")
            if (isHTMLInputElement(cacheCleanEl)) {
                cacheCleanEl.checked = config.cacheClean ?? false
                cacheCleanEl.parentNode?.addEventListener("click", () => {
                    cacheCleanEl.checked = !cacheCleanEl.checked
                    if (isHTMLLabelElement(cacheCleanEl.parentNode)) {
                        cacheCleanEl.parentNode.focus()
                    }
                })
            }
            // Shifttimer
            const shiftTimerEl = document.getElementById("setting-shift-timer")
            if (isHTMLInputElement(shiftTimerEl)) {
                shiftTimerEl.value = `${config.shiftTimer || 0}`
                shiftTimerEl.addEventListener("input", () => {
                    const shiftLyricsEl = document.getElementById(
                        "toggle-shift-lyrics")?.parentNode
                    if (!isHTMLLabelElement(shiftLyricsEl)) {
                        return
                    }
                    const val = shiftTimerEl.value
                    if (Number(val) > 0) {
                        shiftLyricsEl.style.display = "none"
                    } else {
                        shiftLyricsEl.style.display = ""
                    }
                })
            }
            // Shiftlyrics
            const shiftLyricsEl = document.getElementById("toggle-shift-lyrics")
            if (isHTMLInputElement(shiftLyricsEl)) {
                shiftLyricsEl.checked = config.shiftLyrics
                    || Boolean(config.shiftTimer)
                if (isHTMLLabelElement(shiftLyricsEl.parentNode)) {
                    if (config.shiftTimer) {
                        shiftLyricsEl.parentNode.style.display = "none"
                    }
                }
            }
            shiftLyricsEl?.parentNode?.addEventListener(
                "click", () => toggleShiftLyrics())
            // Fontsize
            const fontsizeEl = document.getElementById("setting-fontsize")
            if (isHTMLInputElement(fontsizeEl)) {
                fontsizeEl.value = `${config.fontSize || "14"}`
            }
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
            const toggleGeniusEl = document.getElementById("toggle-genius")
            if (isHTMLInputElement(toggleGeniusEl)) {
                toggleGeniusEl.checked = config.useGenius ?? true
                toggleGeniusEl.parentNode?.addEventListener(
                    "click", () => toggleGenius())
            }
            // Set config dir
            setStartupSettings(config.configDir)
            // Mpv
            const mpvEl = document.getElementById("setting-mpv")
            if (isHTMLInputElement(mpvEl)) {
                mpvEl.value = config.mpv || ""
            }
            let defaultMpv = "mpv"
            if (process.platform === "win32") {
                defaultMpv = "mpv.exe"
            }
            startMpv(config.mpv || defaultMpv, config.configDir)
            // Fallback
            const fallbackEl = document.getElementById("setting-fallback")
            if (isHTMLInputElement(fallbackEl)) {
                fallbackEl.value = config.fallback || "order=shuffle"
            }
            // Autoplay
            const autoplayEl = document.getElementById("toggle-autoplay")
            if (isHTMLInputElement(autoplayEl)) {
                autoplayEl.parentNode?.addEventListener("click", () => {
                    autoplayEl.checked = !autoplayEl.checked
                    if (isHTMLLabelElement(autoplayEl.parentNode)) {
                        autoplayEl.parentNode.focus()
                    }
                })
                autoplayEl.checked = config.autoplay ?? false
            }
            // Api key
            const apikeyEl = document.getElementById("setting-apikey")
            if (isHTMLInputElement(apikeyEl)) {
                apikeyEl.value = config.apiKey ?? ""
            }
            // Scan folder on startup
            setTimeout(async() => {
                if (config.folder) {
                    await scanner(config.folder, config.dumpLyrics)
                    if (config.fallback) {
                        setFallbackRule(config.fallback)
                    }
                    if (config.autoplay) {
                        pause()
                    }
                }
            }, 10)
        })
}
