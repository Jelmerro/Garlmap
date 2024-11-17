/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2023-2024 Jelmer van Arnhem
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
import {EventEmitter} from "events"
import {Socket} from "net"
import {platform} from "os"
import {spawn} from "child_process"

/**
 * Opens the socket to MPV at the location and send a signal on close.
 * @param {string} path
 * @param {(err?: Error) => void} close
 */
const MPVSocket = (path, close) => {
    /** @type {Socket&{
     *   send?: (event: string, ...args: any[]) => void
     * }|{
     *   send?: (get: "get_property", val: string) => string | Promise<string>
     * }} */
    const socket = new Socket()
    const requests = new Map()
    const start = Date.now()
    /** @type {string[]} */
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

    /**
     * Parsed message send back by the mpv IPC connection.
     * @param {{
     *   event?: string, request_id: number, error?: string, data?: string
     * }} m
     */
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
        return m.error === "success"
    }

    socket.on("data", data => data.toString().split(/\r?\n/g).filter(x => x)
        .map(x => JSON.parse(x.trim())).forEach(message))
    /**
     * Send a command to the mpv IPC socket.
     * @param {any[]} args
     */
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

/**
 * Stats an MPV instance with the provided MPV args, options and mpv path.
 * @param {{
 *   args?: string[],
 *   options?: {[key: string]: string|boolean},
 *   path?: string
 * }} config
 * @throws {Error}
 */
const Mpv = ({args = [], options = {}, path} = {}) => {
    if (!path) {
        throw Error("Path is required")
    }
    /** @type {EventEmitter&{
     *   command: (event: string, ...args: any[]) => void | Promise<void>
     *   set: (...args: any[]) => void | Promise<void>
     *   get: (val: string) => string | Promise<string> | null
     * }}
     */
    // @ts-expect-error EventEmitter type that has added attribute functions,
    // as such they are expected to be defined here, which is not possible,
    // even though they are always added, so I made then required in the type.
    const mpv = new EventEmitter()
    let socketPath = "/tmp/mpvsocket"
    if (platform() === "win32") {
        socketPath = "\\\\.\\pipe\\mpvsocket"
    }
    socketPath += Math.random().toString().slice(2)
    args.push(`--input-ipc-server=${socketPath}`)
    const proc = spawn(path, args, options)
    const signals = [
        "beforeExit",
        "uncaughtException",
        "SIGTSTP",
        "SIGQUIT",
        "SIGHUP",
        "SIGTERM",
        "SIGINT"
    ]
    signals.forEach(sig => process.on(sig, () => proc.kill()))
    let lastStdErr = ""
    proc.on("exit", x => x !== 0 && mpv.emit("error", lastStdErr || x))
    proc.stdout.setEncoding("utf8")
    proc.stderr.setEncoding("utf8")
    proc.stdout.on("data", x => {
        lastStdErr = x
    })
    proc.stderr.on("data", () => null)
    proc.on("error", x => mpv.emit("error", x))
    const socket = MPVSocket(socketPath, err => {
        proc.kill()
        mpv.emit("error", err)
    })
    socket.on("event", (eventName, data) => mpv.emit(eventName, data))
    mpv.command = socket.send ?? (() => null)
    /**
     * Set a property via the mpv IPC.
     * @param {any[]} a
     */
    mpv.set = (...a) => socket.send?.("set_property", ...a)
    /**
     * Get a property via the mpv IPC.
     * @param {string} val
     */
    mpv.get = val => socket.send?.("get_property", val) ?? null
    return mpv
}

export default Mpv
