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
const {
    joinPath,
    basePath,
    isDirectory,
    readJSON,
    writeJSON,
    readFile,
    makeDir,
    dirName
} = require("./util")

const applyDevtoolsSettings = prefFile => {
    makeDir(dirName(prefFile))
    const preferences = readJSON(prefFile) || {}
    preferences.electron = preferences.electron || {}
    preferences.electron.devtools = preferences.electron.devtools || {}
    preferences.electron.devtools.preferences
        = preferences.electron.devtools.preferences || {}
    // Disable source maps as they are unused and produce a lot of warnings
    preferences.electron.devtools.preferences.cssSourceMapsEnabled = false
    preferences.electron.devtools.preferences.jsSourceMapsEnabled = false
    // Disable release notes, none of these are relevant for Garlmap
    preferences.electron.devtools.preferences["help.show-release-note"] = false
    // Show timestamps in the console
    preferences.electron.devtools.preferences.consoleTimestampsEnabled = true
    // Disable the paused overlay which prevents interaction with the player
    preferences.electron.devtools.preferences.disablePausedStateOverlay = true
    // Enable dark theme
    preferences.electron.devtools.preferences.uiTheme = `"dark"`
    writeJSON(prefFile, preferences)
}

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
        "cacheClean": isTruthyArg(process.env.GARLMAP_CACHE_CLEAN) || undefined,
        "customTheme": readFile(joinPath(configDir, "theme.css")),
        "dumpLyrics": undefined,
        "folder": process.env.GARLMAP_FOLDER?.trim(),
        "fontSize": process.env.GARLMAP_FONT_SIZE?.trim(),
        "mpv": process.env.GARLMAP_MPV?.trim(),
        "shiftLyrics": isTruthyArg(process.env.GARLMAP_SHIFT_LYRICS)
            || undefined,
        "shiftTimer": process.env.GARLMAP_SHIFT_TIMER?.trim().toLowerCase(),
        "twoColumn": process.env.GARLMAP_TWO_COLUMN?.trim().toLowerCase(),
        "useGenius": isTruthyArg(process.env.GARLMAP_USE_GENIUS) || undefined
    }
    const configFile = readJSON(joinPath(configDir, "settings.json"))
    if (configFile) {
        config = {...config, ...configFile, "dumpLyrics": undefined}
    }
    args.forEach(arg => {
        if (arg.startsWith("-")) {
            const [name] = arg.split("=")
            const value = arg.split("=").slice(1).join("=").toLowerCase()
            if (name === "--help") {
                outputHelp()
            } else if (name === "--version") {
                outputVersion()
            } else if (name === "--devtools") {
                config.debug = true
            } else if (name === "--cache") {
                config.cache = value
            } else if (name === "--cache-clean") {
                config.cacheClean = isTruthyArg(value)
                    || arg === "--cache-clean"
            } else if (name === "--dump-lyrics") {
                config.dumpLyrics = isTruthyArg(value)
                    || arg === "--dump-lyrics"
            } else if (name === "--mpv") {
                config.mpv = value
            } else if (name === "--shift-timer") {
                config.shiftTimer = value
            } else if (name === "--two-column") {
                config.twoColumn = value
            } else if (name === "--font-size") {
                config.fontSize = value
            } else if (name === "--auto-lyrics") {
                config.autoLyrics = isTruthyArg(value)
                    || arg === "--auto-lyrics"
            } else if (name === "--auto-scroll") {
                config.autoScroll = isTruthyArg(value)
                    || arg === "--auto-scroll"
            } else if (name === "--auto-close") {
                config.autoClose = isTruthyArg(value) || arg === "--auto-close"
            } else if (name === "--use-genius") {
                config.useGenius = isTruthyArg(value) || arg === "--use-genius"
            } else if (name === "--shift-lyrics") {
                config.shiftLyrics = isTruthyArg(value)
                    || arg === "--shift-lyrics"
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
    if (!["all", "songs", "lyrics", "none", undefined].includes(config.cache)) {
        console.warn("Error, cache arg only accepts one of:")
        console.warn("- all, songs, lyrics, none")
        app.exit(1)
    }
    if (!["never", "mobile", "always", undefined].includes(config.twoColumn)) {
        console.warn("Error, twoColumn arg only accepts one of:")
        console.warn("- never, mobile, always")
        app.exit(1)
    }
    if (["songs", "none"].includes(config.cache) && config.dumpLyrics) {
        console.warn("Error, cache is set to songs only or none,")
        console.warn("therefor there are no lyrics to be dumped.")
        app.exit(1)
    }
    if (config.shiftTimer) {
        const s = Number(config.shiftTimer)
        if (isNaN(s) || s > 1000 || s < 0) {
            console.warn("Shift timer must be a number between 0 and 1000")
            app.exit(1)
        }
        config.shiftTimer = s
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
> garlmap --cache=<ALL,songs,lyrics,none> --cache-clean --auto-lyrics \\
    --auto-scroll --auto-close --auto-remove --use-genius --font-size=<int> \\
    --mpv=<loc> --dump-lyrics folder

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

    --cache-clean  Enable the removal of cached songs that have a missing file.
                   By default they are kept in cache at all times,
                   because that allows you to safely move your music folder,
                   while keeping the same cache info and especally lyrics.
                   If enabled, the cache is filtered for files that exist.
                   The argument can optionally be provided with value:
                   "--cache-clean=true", "--cache-clean=0, "--cache-clean=no".
                   If no arg is found, it will read the "cacheClean" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_CACHE_CLEAN env will be read,
                   or this setting will by default be disabled from cleaning.
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

    --use-genius   Toggle the use of the Genius API for fetching lyrics.
                   Enabled by default, used to find lyrics for the current song,
                   first does a search, then looks up the lyrics for the match.
                   If disabled, only local and cached lyrics will be used,
                   and the lyrics buttons will not connect to the Genius API.
                   You can still search manually inside the lyrics editor.
                   The argument should be provided with value to disable it:
                   "--use-genius=false", "--use-genius=0, "--use-genius=no",
                   but setting it to true can also be done to override env vars.
                   If no arg is found, it will read the "useGenius" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_USE_GENIUS env will be read,
                   or this setting will by default be enabled and use the API.
                   Change this setting with Ctrl-g or the bottom right checkbox.

    --shift-lyrics Enable automatic scrolling/shifting of song lyrics.
                   If disabled, no automatic scrolling of lyrics will happen.
                   There is no word syncing for the lyrics in Garlmap,
                   the scroll position is based on the current song progress.
                   Shifting is turned off when scrolling manually,
                   you can re-enable it on a delay with "--shift-timer" option.
                   If a timer is set, the shiftLyrics value is ignored,
                   as it will automatically be enabled on a delay by shiftTimer.
                   The argument can optionally be provided with value:
                   "--shift-lyrics=yes", "--shift-lyrics=0, "--shift-lyrics=no".
                   If no arg is found, it will read "shiftLyrics" from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_SHIFT_LYRICS env will be read,
                   or this setting will by default be disabled.
                   Change this setting with Ctrl-h or the bottom right checkbox.

    --shift-timer* Set the delay to re-enable lyrics shifting after scrolling.
                   Accepted values are between 0-1000, and the unit is seconds.
                   This setting controls how long to wait after scrolling,
                   to then enable the shift lyrics option automatically.
                   If set to zero, it's disabled and no enable delay is used.
                   Any other number controls the amount of seconds to wait,
                   and will ignore the shitLyrics value, as it's always enabled.
                   For example 5, will wait 5 seconds to re-enable shifting.
                   The argument should be provided with value to set it:
                   "--shift-timer=5", "--shift-timer=0" or "--shift-timer=60".
                   If no arg is found, it will read the "shiftTimer" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_SHIFT_TIMER env will be read,
                   or this setting will by default be disabled.
                   This setting cannot be changed once Garlmap is started,
                   but you can still toggle shifting manually with the checkbox.

    --two-column*  Define the policy for using the two column layout.
                   When enabled, only the lyrics with cover are always visible.
                   The playlist/search section will be hidden/shown on switch,
                   with only the currently focused section being visible.
                   This results in only two columns being visible at a time.
                   This layout is mainly intended to be used on smaller screens,
                   which is why the default value is set to "mobile",
                   as this will only activate this layout on smaller windows.
                   When on, buttons will be shown to switch between sections,
                   but this can also be done with the keyboard if available.
                   You can set to use the two column layout "always" or "never".
                   The argument should be provided with value like so:
                   "--two-column=never", "--two-column=mobile" or with "always".
                   If no arg is found, it will read the "twoColumn" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_TWO_COLUMN env will be read,
                   or this setting will by default fallback to using "mobile".
                   This setting cannot be changed once Garlmap is started.

    --font-size=14 Define a custom font size, without requiring a custom theme.
                   Accepted values are between 8-100, and the unit is pixels.
                   Especially helpful on very high resolution screens.
                   Even values are recommend regardless of font size value,
                   to prevent rounding errors on small elements in the player.
                   If no arg is found, it will read the "fontSize" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_FONT_SIZE env will be read,
                   or this setting will by default set to 14 pixels.
                   This setting cannot be changed once Garlmap is started.

    --mpv=loc      Define a custom location for the mpv executable.
                   Mostly useful in case you don't want to have mpv on the path.
                   If no arg is found, it will read the "mpv" field from:
                   ${joinPath(configDir, "settings.json")}
                   If also absent, the GARLMAP_MPV env will be read,
                   or this setting will by default set to "mpv" or "mpv.exe",
                   the latter only being the default on Windows.
                   This setting cannot be changed once Garlmap is started.

    --dump-lyrics  Dump all cached lyrics in a "Lyrics" subfolder of the folder.
                   The base directory must be set with the option below,
                   or using the folder option in the config or env vars.
                   Inside the base music folder, it will create a "Lyrics" dir,
                   which will have text files in the same path as the songs,
                   with every song getting it's own text file at the right path.
                   Each of these files is filled with the lyrics for that song.
                   Garlmap will read "Lyrics" folders even without a cache file,
                   as long as they follow this same file structure.
                   You can add your own lyrics to this folder for any song,
                   but you will need to do Shift-F4 after editing existing ones,
                   which have already been loaded into the lyrics cache.
                   If you supply this option, Garlmap will parse the folder,
                   next create these files and then exit without playing songs.
                   You cannot set this option from the config file or env vars.

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

In case of issues, you can toggle the developer tools at runtime with F12.
If this does not work, you can also supply the "--devtools" argument.
`.trim()}\n`)
    showLicense()
}

const outputVersion = () => {
    console.info(`You are dealing with version ${version} of Garlmap`)
    console.info(`This release uses Electron ${
        process.versions.electron} and Chromium ${process.versions.chrome}\n`)
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

const version = process.env.npm_package_version || app.getVersion()
const configDir = joinPath(app.getPath("appData"), "Garlmap")
app.setPath("appData", configDir)
app.setPath("userData", configDir)
applyDevtoolsSettings(joinPath(configDir, "Preferences"))
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
        "height": 700,
        "icon": joinPath(__dirname, "img/icon/1024x1024.png"),
        "show": false,
        "title": app.getName(),
        "webPreferences": {
            "defaultFontSize": Number(config.fontSize) || 14,
            "defaultMonospaceFontSize": Number(config.fontSize) || 14,
            "disableBlinkFeatures": "Auxclick",
            "preload": joinPath(__dirname, "renderer/index.js"),
            "sandbox": false,
            "spellcheck": false
        },
        "width": 1000
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.removeMenu()
    mainWindow.setMinimumSize(320, 320)
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
        if (config.debug) {
            delete config.debug
            mainWindow.webContents.openDevTools()
        }
        logCustomSettings(config)
        config.version = version
        config.configDir = configDir
        mainWindow.webContents.send("config", config)
        if (!config.dumpLyrics) {
            registerMediaKeys()
            mainWindow.show()
        }
    })
})

ipcMain.handle("toggle-devtools", () => mainWindow.webContents.toggleDevTools())
// #bug Setting the mainWindow will block interaction completely on second open,
// but only when using Linux and GNOME (and forks like Cinnamon),
// therefor we set it to null on linux to at least not break the app.
// The modal position is incorrect as well on all systems, no workarounds known.
// See this issue for more details:
// https://github.com/electron/electron/issues/32857
if (process.platform === "linux") {
    ipcMain.handle("dialog-open", (_, options) => dialog.showOpenDialog(
        null, options))
    ipcMain.handle("dialog-save", (_, options) => dialog.showSaveDialog(
        null, options))
} else {
    ipcMain.handle("dialog-open", (_, options) => dialog.showOpenDialog(
        mainWindow, options))
    ipcMain.handle("dialog-save", (_, options) => dialog.showSaveDialog(
        mainWindow, options))
}
ipcMain.on("destroy-window", (_, error) => {
    if (error) {
        try {
            dialog.showMessageBoxSync(mainWindow, {
                "buttons": ["Exit"],
                "message": String(error),
                "title": "Mpv failed to start",
                "type": "error"
            })
        } catch {
            // Error dialog shouldn't be a reason to fail to quit
        }
        console.error("Mpv failed to start with error:")
        console.error(error)
    }
    mainWindow.destroy()
    process.exit(0)
})
ipcMain.on("show-window", () => {
    if (mainWindow.isMinimized()) {
        mainWindow.restore()
    }
    mainWindow.focus()
})
