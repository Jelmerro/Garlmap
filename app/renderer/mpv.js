/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2023 Jelmer van Arnhem
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

const {Socket} = require("net")
const {spawn} = require("child_process")
const {platform} = require("os")
const {EventEmitter} = require("events")

const MPVSocket = (path, close) => {
    const socket = new Socket()
    const requests = new Map()
    const start = Date.now()
    let queue = []
    let uuid = 0
    let open = false
    socket.setEncoding("utf8")
    socket.connect(path)
    socket.on("error", e => {
        if (!open && e.code === "ENOENT" && Date.now() - start < 10000) {
            setTimeout(() => socket.connect(path), 100)
        } else {
            close(e)
        }
    })
    socket.on("connect", () => {
        queue.forEach(msg => socket.write(msg))
        socket.on("close", () => close())
        queue = []
        open = true
    })

    const message = m => {
        if (m.event) {
            return socket.emit("event", m.event, m)
        }
        if (!requests.has(m.request_id)) {
            return m.error !== "success" && socket.emit(
                "error", Object.assign(new Error(m.error), m))
        }
        const request = requests.get(m.request_id)
        if (m.error === "success") {
            request.res(m.data)
        } else {
            request.rej(new Error(
                `${request.args.join(" ")} - failed with error: ${m.error}`))
        }
        requests.delete(m.request_id)
    }

    socket.on("data", data => data.split(/\r?\n/g).filter(x => x)
        .map(x => JSON.parse(x.trim())).forEach(message))
    socket.send = (...args) => new Promise((res, rej) => {
        uuid += 1
        const id = uuid
        const request = `${JSON.stringify({
            "command": args.filter(x => x !== undefined),
            "request_id": id
        })}\n`
        let result = null
        if (open) {
            result = socket.write(request)
        } else {
            result = queue.push(request)
        }
        if (result) {
            requests.set(id, {args, rej, res})
        } else {
            rej(new Error("Could not send command"))
        }
    })
    return socket
}

const Mpv = ({args = [], options = {}, path} = {}) => {
    args.shift()
    const mpv = new EventEmitter()

    const error = x => mpv.emit("error", x)

    let socketPath = "/tmp/mpvsocket"
    if (platform() === "win32") {
        socketPath = "\\\\.\\pipe\\mpvsocket"
    }
    socketPath += Math.random().toString().slice(2)
    args.push(`--input-ipc-server=${socketPath}`)
    mpv.process = spawn(path, args, options)
    const signals = [
        "beforeExit",
        "uncaughtException",
        "SIGTSTP",
        "SIGQUIT",
        "SIGHUP",
        "SIGTERM",
        "SIGINT"
    ]
    signals.forEach(sig => process.on(sig, () => mpv.process.kill()))
    let lastStdErr = ""
    mpv.process.on("exit", x => x !== 0 && error(lastStdErr || x))
    mpv.process.stdout.setEncoding("utf8")
    mpv.process.stderr.setEncoding("utf8")
    mpv.process.stdout.on("data", x => {
        lastStdErr = x
    })
    mpv.process.stderr.on("data", () => null)
    mpv.process.on("error", error)
    mpv.socket = MPVSocket(socketPath, err => {
        mpv.process.kill()
        error(err)
    })
    mpv.socket.on("event", (eventName, data) => mpv.emit(eventName, data))
    mpv.command = mpv.socket.send
    mpv.set = (...a) => mpv.socket.send("set_property", ...a)
    mpv.get = (...a) => mpv.socket.send("get_property", ...a)
    return mpv
}

module.exports = Mpv
