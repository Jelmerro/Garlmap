/*
*  Garlmap - Gapless Almighty Rule-based Logical Mpv Audio Player
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

const {
    app, BrowserWindow, systemPreferences, globalShortcut, ipcMain, dialog
} = require("electron")
const {joinPath, basePath, isDirectory, readJSON, readFile} = require("./util")

const version = process.env.npm_package_version || app.getVersion()
const configDir = joinPath(app.getPath("appData"), "Garlmap")
app.setPath("appData", configDir)
app.setPath("userData", configDir)
let mainWindow = null
app.on("ready", () => {
    const config = processStartupArgs()
    if (!app.requestSingleInstanceLock()) {
        console.info(`Garlmap is a single instance app for performance reasons`)
        app.exit(0)
    }
    app.on("second-instance", () => {
        if (mainWindow.isMinimized()) {
            mainWindow.restore()
        }
        mainWindow.focus()
    })
    const windowData = {
        "closable": false,
        "frame": true,
        "height": 700,
        "icon": joinPath(__dirname, "img/icon/1024x1024.png"),
        "show": false,
        "title": app.getName(),
        "webPreferences": {
            "disableBlinkFeatures": "Auxclick",
            "preload": joinPath(__dirname, "renderer/index.js"),
            "sandbox": false,
            "spellcheck": false
        },
        "width": 1000
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.removeMenu()
    mainWindow.setMinimumSize(700, 700)
    mainWindow.loadURL(`file://${joinPath(__dirname, "renderer/index.html")}`)
    mainWindow.on("close", e => {
        e.preventDefault()
        mainWindow.webContents.send("window-close")
    })
    mainWindow.on("closed", () => app.exit(0))
    mainWindow.webContents.once("did-finish-load", () => {
        mainWindow.webContents.on("new-window", e => e.preventDefault())
        mainWindow.webContents.on("will-navigate", e => e.preventDefault())
        mainWindow.webContents.on("will-redirect", e => e.preventDefault())
        logCustomSettings(config)
        config.version = version
        config.configDir = configDir
        mainWindow.webContents.send("config", config)
        registerMediaKeys()
        mainWindow.show()
    })
})

const registerMediaKeys = () => {
    systemPreferences.isTrustedAccessibilityClient?.(true)
    globalShortcut.register("MediaPlayPause", () => {
        mainWindow.webContents.send("media-pause")
    })
    globalShortcut.register("MediaNextTrack", () => {
        mainWindow.webContents.send("media-next")
    })
    globalShortcut.register("MediaPreviousTrack", () => {
        mainWindow.webContents.send("media-prev")
    })
    globalShortcut.register("MediaStop", () => {
        mainWindow.webContents.send("media-stop")
    })
}

const logCustomSettings = config => {
    let hasCustom = false
    for (const [key, val] of Object.entries(config)) {
        if (val !== null && val !== undefined) {
            if (!hasCustom) {
                console.info("Current custom settings:")
                hasCustom = true
            }
            console.info(`- ${key}: ${val}`)
        }
    }
    if (!hasCustom) {
        console.info("No custom settings, all defaults")
    }
}

const processStartupArgs = () => {
    let args = process.argv.slice(1)
    const exec = basePath(process.argv[0])
    if (exec === "electron" || process.defaultApp && exec !== "garlmap") {
        args = args.slice(1)
    }
    const isTruthyArg = arg => {
        const argStr = String(arg).trim().toLowerCase()
        return Number(argStr) > 0 || ["y", "yes", "true", "on"].includes(argStr)
    }
    console.info(
        "Garlmap - Gapless Almighty Rule-based Logical Mpv Audio Player")
    let config = {
        "autoClose": isTruthyArg(process.env.GARLMAP_AUTO_CLOSE) || undefined,
        "autoLyrics": isTruthyArg(process.env.GARLMAP_AUTO_LYRICS) || undefined,
        "autoRemove": isTruthyArg(process.env.GARLMAP_AUTO_REMOVE) || undefined,
        "autoScroll": isTruthyArg(process.env.GARLMAP_AUTO_SCROLL) || undefined,
        "cache": process.env.GARLMAP_CACHE?.trim().toLowerCase(),
        "customTheme": readFile(joinPath(configDir, "theme.css")),
        "folder": process.env.GARLMAP_FOLDER?.trim(),
        "fontSize": process.env.GARLMAP_FONT_SIZE?.trim()
    }
    const configFile = readJSON(joinPath(configDir, "settings.json"))
    if (configFile) {
        config = {...config, ...configFile}
    }
    args.forEach(arg => {
        if (arg.startsWith("-")) {
            const [name] = arg.split("=")
            const value = arg.split("=").slice(1).join("=").toLowerCase()
            if (name === "--help") {
                outputHelp()
            } else if (name === "--version") {
                outputVersion()
            } else if (name === "--cache") {
                config.cache = value
            } else if (name === "--font-size") {
                config.fontSize = value
            } else if (name === "--auto-lyrics") {
                config.autoLyrics = isTruthyArg(value)
                    || arg === "--auto-lyrics"
            } else if (name === "--auto-scroll") {
                config.autoScroll = isTruthyArg(value)
                    || arg === "--auto-scroll"
            } else if (name === "--auto-close") {
                config.autoClose = isTruthyArg(value)
                    || arg === "--auto-close"
            } else if (name === "--auto-remove") {
                config.autoRemove = isTruthyArg(value)
                    || arg === "--auto-remove"
            } else {
                console.warn(`Error, unsupported argument '${arg}'`)
                app.exit(1)
            }
        } else {
            config.folder = arg
        }
    })
    if (!["all", "song", "lyrics", "none", undefined].includes(config.cache)) {
        console.warn("Error, cache arg only accepts one of:")
        console.warn("- all, song, lyrics, none")
        app.exit(1)
    }
    if (config.fontSize) {
        const s = Number(config.fontSize)
        if (isNaN(s) || s > 100 || s < 8 || Math.floor(s) !== s) {
            console.warn("Font size must be a round number between 8 and 100.")
            app.exit(1)
        }
        config.fontSize = s
    }
    if (config.folder && !isDirectory(config.folder)) {
        console.warn(`Music dir '${config.folder}' could not be found`)
        app.exit(1)
    }
    return config
}

const outputHelp = () => {
    console.info(`${`
> garlmap --cache=<ALL,song,lyrics,none> --auto-lyrics --font-size=<int> folder

For help with app usage, see the built-in help on the right.
Garlmap can be started without any arguments, but it supports the following:

    --help         Show this help and exit.

    --version      Show the current Garlmap version and exit.

    --cache=all    Define the cache policy to use for this instance.
                   By default, both lyrics and song data are cached forever.
                   If you want to update either of them once in a while,
                   simply run Garlmap with a --cache=none argument present.
                   Cache will still be written after being freshly fetched/read.
                   Other than "all", this arg can be set to these values:
                   Song data (songs), lyrics (lyrics), or nothing at all (none)
                   If no arg is found, it will read the "cache" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_CACHE env will be read,
                   or this setting will by default fallback to using "all".
                   This setting cannot be changed once Garlmap is started.

    --auto-lyrics  Enable the automatic downloading of lyrics when songs play.
                   If disabled, you can download them per song by pressing F4.
                   Lyrics will be cached forever after being fetched once,
                   unless you disable it with the cache setting listed above.
                   The argument can optionally be provided with value:
                   "--auto-lyrics=true", "--auto-lyrics=0, "--auto-lyrics=no".
                   If no arg is found, it will read the "autoLyrics" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_AUTO_LYRICS env will be read,
                   or this setting will by default be disabled from auto fetch.
                   Change this setting in the playlist with "t" or the mouse.

    --auto-scroll  Enable automatic scrolling to the current song in the list.
                   If disabled, no automatic scrolling will happen.
                   The argument can optionally be provided with value:
                   "--auto-scroll=true", "--auto-scroll=0, "--auto-scroll=no".
                   If no arg is found, it will read the "autoScroll" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_AUTO_SCROLL env will be read,
                   or this setting will by default be disabled.
                   Change this setting in the playlist with "a" or the mouse.

    --auto-close   Enable automatic closing and opening of rules when played.
                   The current rule will be opened, all others will be closed.
                   If disabled, no automatic open or closing will happen.
                   The argument can optionally be provided with value:
                   "--auto-close=true", "--auto-close=0, "--auto-close=no".
                   If no arg is found, it will read the "autoClose" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_AUTO_CLOSE env will be read,
                   or this setting will by default be disabled.
                   Change this setting in the playlist with "c" or the mouse.

    --auto-remove  Enable automatic removal of old rules and tracks after play.
                   If disabled, no automatic removal of songs/rules will happen.
                   The argument can optionally be provided with value:
                   "--auto-remove=true", "--auto-remove=0, "--auto-remove=no".
                   If no arg is found, it will read the "autoRemove" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_AUTO_REMOVE env will be read,
                   or this setting will by default be disabled.
                   Change this setting in the playlist with "r" or the mouse.

    --font-size=14 Define a custom font size, without requiring a custom theme.
                   Accepted values are between 8-100, and the unit is in pixels.
                   Especially helpful on very high resolution screens.
                   Even values are recommend regardless of font size value,
                   to prevent rounding errors on small elements in the player.
                   If no arg is found, it will read the "fontSize" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_FONT_SIZE env will be read,
                   or this setting will by default set to 14 pixels.
                   This setting cannot be changed once Garlmap is started.

    folder         Provide a folder to load the songs from for this instance.
                   If no arg is found, it will read the "folder" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_FOLDER env will be read,
                   or no default folder is opened on startup.
                   This is a positional argument, of which only one is allowed.
                   You can change the folder after starting with "Ctrl-o".

You can also customize the look and feel of Garlmap using a custom theme file:
${joinPath(configDir, "theme.css")}
If not present, the default theme will be used,
although you may still change the fontsize without using a custom theme.
The default theme, including the color configuration, is located here:
https://github.com/Jelmerro/Garlmap/blob/master/app/renderer/index.css
If you JUST want to change the colors, you ONLY need the ":root" section!
`.trim()}\n`)
    showLicense()
}

const outputVersion = () => {
    console.info(`You are dealing with version ${version}\n`)
    showLicense()
}

const showLicense = () => {
    console.info(`Garlmap is created by Jelmer van Arnhem
Website: https://github.com/Jelmerro/Garlmap

License: GNU GPL version 3 or later versions <http://gnu.org/licenses/gpl.html>
This is free software; you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
See the LICENSE file or the GNU website for details.`)
    app.exit(0)
}

ipcMain.handle("toggle-devtools", () => mainWindow.webContents.toggleDevTools())
ipcMain.on("dialog-open", (e, options) => {
    e.returnValue = dialog.showOpenDialogSync(mainWindow, options)
})
ipcMain.on("dialog-save", (e, options) => {
    e.returnValue = dialog.showSaveDialogSync(mainWindow, options)
})
ipcMain.on("destroy-window", (_, error) => {
    if (error) {
        console.error("Mpv failed to start with error:")
        console.error(error)
    }
    mainWindow.destroy()
})
