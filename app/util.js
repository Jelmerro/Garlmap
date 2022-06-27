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

const queryMatch = (e, query) => e?.composedPath?.().find(el => {
    try {
        return el.matches(query)
    } catch {
        return false
    }
})

const formatTime = total => {
    if ([null, undefined].includes(total) || isNaN(Number(total))) {
        return ""
    }
    let hours = Math.floor(total / 3600)
    let minutes = Math.floor((total - hours * 3600) / 60)
    let seconds = Math.floor(total - hours * 3600 - minutes * 60)
    if (hours < 10) {
        hours = `0${hours}`
    }
    if (minutes < 10) {
        minutes = `0${minutes}`
    }
    if (seconds < 10) {
        seconds = `0${seconds}`
    }
    if (hours === "00") {
        return `${minutes}:${seconds}`
    }
    return `${hours}:${minutes}:${seconds}`
}

const displayNotificationStack = []
let notificationReady = true

const notify = (msg, type = "err", linger = true) => {
    let color = "var(--tertiary)"
    if (type.startsWith("info")) {
        color = "var(--primary)"
    }
    if (type.startsWith("success")) {
        color = "var(--secondary)"
    }
    const event = {color, msg, "time": new Date(), type}
    appendEventToHistory(event)
    if (linger) {
        displayNotificationStack.push(event)
        displayNotificationTimer()
    }
}

const displayNotificationTimer = () => {
    if (notificationReady) {
        notificationReady = false
    } else {
        return
    }
    const currentNotify = displayNotificationStack.shift()
    if (!currentNotify) {
        document.getElementById("status-notify").style.color = ""
        document.getElementById("status-notify").textContent
            = "No current events"
        notificationReady = true
        return
    }
    document.getElementById("status-notify").style.color = currentNotify.color
    document.getElementById("status-notify").textContent = currentNotify.msg
    setTimeout(() => {
        notificationReady = true
        displayNotificationTimer()
    }, 4000)
}

const appendEventToHistory = ev => {
    const event = document.createElement("div")
    event.classList.add("event")
    const eventDate = document.createElement("span")
    eventDate.classList.add("date")
    eventDate.textContent = formatDate(ev.time)
    event.appendChild(eventDate)
    const eventTitle = document.createElement("span")
    eventTitle.classList.add("title")
    eventTitle.style.color = ev.color
    eventTitle.textContent = ev.msg
    event.appendChild(eventTitle)
    document.getElementById("events-list").appendChild(event)
}

const padZero = num => {
    if (num < 10) {
        return `0${num}`
    }
    return num
}

const formatDate = d => `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${
    padZero(d.getDate())} ${padZero(d.getHours())}:${padZero(d.getMinutes())}:${
    padZero(d.getSeconds())}`

const isDirectory = loc => {
    const {statSync} = require("fs")
    try {
        return statSync(loc).isDirectory()
    } catch {
        return false
    }
}

const isFile = loc => {
    const {statSync} = require("fs")
    try {
        return statSync(loc).isFile()
    } catch {
        return false
    }
}

const joinPath = (...args) => {
    const {join, resolve} = require("path")
    if (process.platform === "win32") {
        return resolve(join(...args)).replace(/\\/g, "/")
    }
    return resolve(join(...args))
}

const dirName = (...args) => {
    const {dirname} = require("path")
    return dirname(...args)
}

const basePath = (...args) => {
    const {basename} = require("path")
    return basename(...args)
}

const readJSON = loc => {
    const {readFileSync} = require("fs")
    try {
        return JSON.parse(readFileSync(loc).toString())
    } catch {
        return null
    }
}

const readFile = loc => {
    const {readFileSync} = require("fs")
    try {
        return readFileSync(loc).toString()
    } catch {
        return null
    }
}

const writeJSON = (loc, data, indent = null) => {
    const {writeFileSync} = require("fs")
    try {
        writeFileSync(loc, JSON.stringify(data, null, indent))
        return true
    } catch {
        return false
    }
}

const writeFile = (loc, data) => {
    const {writeFileSync} = require("fs")
    try {
        writeFileSync(loc, data)
        return true
    } catch {
        return false
    }
}

const makeDir = loc => {
    try {
        const {mkdirSync} = require("fs")
        mkdirSync(loc, {"recursive": true})
        return true
    } catch {
        // Will return false as it was unsuccessful
    }
    return false
}

const deleteFile = loc => {
    try {
        const {unlinkSync} = require("fs")
        unlinkSync(loc)
        return true
    } catch {
        // Will return false as it was unsuccessful
    }
    return false
}

module.exports = {
    basePath,
    deleteFile,
    dirName,
    formatTime,
    isDirectory,
    isFile,
    joinPath,
    makeDir,
    notify,
    queryMatch,
    readFile,
    readJSON,
    writeFile,
    writeJSON
}
