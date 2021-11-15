/*
*  Garlmap - Gapless Almighty Rule-based Logical Mpv Audio Player
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

const {
    app, BrowserWindow, systemPreferences, globalShortcut, ipcMain, dialog
} = require("electron")
const {joinPath, basePath, isDirectory} = require("./util")

const version = process.env.npm_package_version || app.getVersion()
const configDir = joinPath(app.getPath("appData"), "Garlmap")
app.setPath("appData", configDir)
app.setPath("userData", configDir)
let mainWindow = null
app.on("ready", () => {
    if (!app.requestSingleInstanceLock()) {
        console.info(`Garlmap is a single instance app for performance reasons`)
        app.exit(0)
    }
    const windowData = {
        "closable": false,
        "frame": true,
        "height": 600,
        "show": true,
        "title": app.getName(),
        "webPreferences": {
            "contextIsolation": false,
            "disableBlinkFeatures": "Auxclick",
            "preload": joinPath(__dirname, "renderer/index.js"),
            "sandbox": false
        },
        "width": 600
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.removeMenu()
    mainWindow.setMinimumSize(500, 500)
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
        registerMediaKeys()
    })
    processStartupArgs()
    mainWindow.show()
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
    let cache = process.env.GARLMAP_CACHE?.trim().toLowerCase() || "all"
    let autoLyrics = isTruthyArg(process.env.GARLMAP_AUTO_LYRICS)
    let folder = process.env.GARLMAP_FOLDER?.trim()
    console.info(
        "Garlmap - Gapless Almighty Rule-based Logical Mpv Audio Player")
    args.forEach(arg => {
        if (arg.startsWith("-")) {
            const [name] = arg.split("=")
            const value = arg.split("=").slice(1).join("=").toLowerCase()
            if (name === "--help") {
                outputHelp()
            } else if (name === "--version") {
                outputVersion()
            } else if (name === "--cache") {
                if (["all", "song", "lyrics", "none"].includes(value)) {
                    cache = value
                } else {
                    console.warn("Error, cache arg only accepts one of:")
                    console.warn("- all, song, lyrics, none")
                    app.exit(1)
                }
            } else if (name === "--auto-lyrics") {
                autoLyrics = isTruthyArg(value) || arg === "--auto-lyrics"
            } else {
                console.warn(`Error, unsupported argument '${arg}'`)
                app.exit(1)
            }
        } else {
            folder = arg
        }
    })
    if (folder && !isDirectory(folder)) {
        console.warn(`Music dir '${folder}' could not be found`)
        app.exit(1)
    }
    mainWindow.webContents.send("config", {
        version, folder, autoLyrics, cache, configDir
    })
}

const outputHelp = () => {
    console.info(`> garlmap --cache=<ALL,song,lyrics,none> --auto-lyrics folder

Garlmap can be started without any arguments, but it supports the following:

    --help         Shows this help and exits.

    --version      Shows the current Garlmap version and exits.

    --cache=all    Define the cache policy to use for this instance.
                   By default, both lyrics and song data are cached forever.
                   If you want to update either of them once in a while,
                   simply run Garlmap with a --cache=none argument present.
                   Cache will still be written after being freshly fetched/read.
                   Other than "all", this arg can be set to these values:
                   Song data (songs), lyrics (lyrics), or nothing at all (none)
                   Can be set with env GARLMAP_CACHE, but this arg overrides it.

    --auto-lyrics  Enables the automatic downloading of lyrics when songs play.
                   Can be set with GARLMAP_AUTO_LYRICS, but args go over envs.
                   Which means you can do: GARLMAP_AUTO_LYRICS=1 or TRUE or w/e,
                   and then disable it again at startup with --auto-lyrics=false
                   If neither are present, default is set to not download auto,
                   but you can still download them per song by pressing F4.
                   Lyrics will be cached forever after being fetched once,
                   unless you disable it with the cache argument or env var.

    folder         Provide a folder to load the songs from for this instance.
                   If not provided, no default folder is opened in Garlmap.
                   This means that you need to open one manually with Ctrl-O.
                   Can also be set with GARLMAP_FOLDER, again, arg overrides it.
`)
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
ipcMain.on("dialog-dir", (e, options) => {
    e.returnValue = dialog.showOpenDialogSync(mainWindow, options)
})
ipcMain.on("destroy-window", () => mainWindow.destroy())
