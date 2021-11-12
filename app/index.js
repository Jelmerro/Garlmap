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
const {
    app, BrowserWindow, systemPreferences, globalShortcut, ipcMain, dialog
} = require("electron")
const path = require("path")

const version = process.env.npm_package_version || app.getVersion()

let mainWindow = null
app.on("ready", () => {
    const windowData = {
        "closable": false,
        "frame": true,
        "height": 600,
        "show": true,
        "title": app.getName(),
        "webPreferences": {
            "contextIsolation": false,
            "disableBlinkFeatures": "Auxclick",
            "preload": path.join(__dirname, "renderer/index.js"),
            "sandbox": false
        },
        "width": 600
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.removeMenu()
    mainWindow.setMinimumSize(500, 500)
    mainWindow.loadURL(`file://${path.join(__dirname, "renderer/index.html")}`)
    mainWindow.webContents.once("did-finish-load", () => {
        mainWindow.webContents.on("new-window", e => e.preventDefault())
        mainWindow.webContents.on("will-navigate", e => e.preventDefault())
        mainWindow.webContents.on("will-redirect", e => e.preventDefault())
        registerMediaKeys()
    })
    mainWindow.show()
    // TODO handle CLI args:
    // --cache <ALL,song,lyrics,none>
    // --folder <folder>
    // maybe more?
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

ipcMain.handle("toggle-devtools", () => mainWindow.webContents.toggleDevTools())
ipcMain.on("dialog-dir", (e, options) => {
    e.returnValue = dialog.showOpenDialogSync(mainWindow, options)
})
