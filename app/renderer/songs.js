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

const glob = require("glob")
const musicMetadata = require("music-metadata")
const {ipcRenderer} = require("electron")
const {
    readJSON,
    writeJSON,
    joinPath,
    isFile,
    dirName,
    writeFile,
    makeDir,
    notify
} = require("../util")

let configDir = null
let cache = "all"
let cachedSongs = []
let songs = []
let failureCount = 0
let processedFiles = 0
const low = s => s.toLowerCase()
const sanitizeLyrics = lyrics => lyrics?.trim()
    .replace(/\n\[/g, "\n\n[").replace(/\n\n\n/g, "\n\n") || ""

const processFile = async(path, id) => {
    let song = null
    let cacheIndex = null
    if (cache !== "none") {
        song = cachedSongs.find(s => path === s.path)
            || cachedSongs.find(s => id.endsWith(s.id))
            || cachedSongs.find(s => s.id.endsWith(id))
        cacheIndex = cachedSongs.indexOf(song)
    }
    if (cache === "lyrics" || !song) {
        document.getElementById("status-scan").textContent = `Reading ${path}`
        let details = await musicMetadata.parseFile(path, {"skipCovers": true})
            .catch(() => null)
        if (!details?.format?.duration) {
            details = await musicMetadata.parseFile(
                path, {"duration": true, "skipCovers": true}).catch(() => null)
        }
        if (!details?.format?.duration) {
            failureCount += 1
            notify(`Failed to scan: ${id}`, "err", false)
            return
        }
        song = {
            "album": details.common.album,
            "artist": details.common.artist,
            "bitrate": details.format.bitrate,
            "date": details.common.date || details.common.year,
            "disc": details.common.disk.no,
            "disctotal": details.common.disk.of,
            "duration": details.format.duration,
            id,
            "lyrics": sanitizeLyrics(song?.lyrics),
            path,
            "title": details.common.title,
            "track": details.common.track.no,
            "tracktotal": details.common.track.of
        }
        const extraProps = [
            "genre",
            "composer",
            "lyricist",
            "writer",
            "conductor",
            "remixer",
            "arranger",
            "engineer",
            "producer",
            "technician",
            "djmixer",
            "mixer",
            "label",
            "grouping",
            "subtitle",
            "rating",
            "bpm",
            "mood",
            "releasetype",
            "originalalbum",
            "originalartist"
        ]
        for (const prop of extraProps) {
            if (details.common[prop]) {
                song[prop] = details.common[prop]
            }
        }
        if (details.common.originaldate) {
            song.originaldate = details.common.originaldate
        } else if (details.common.originalyear) {
            song.originaldate = details.common.originalyear
        }
    }
    if (cacheIndex >= 0) {
        cachedSongs[cacheIndex] = song
    } else {
        cachedSongs.push(song)
    }
    songs.push(song)
}

const dumpLyrics = folder => {
    const lyricsDir = joinPath(folder, "Lyrics")
    for (const song of songs) {
        if (song.lyrics) {
            const txtId = song.id.replace(/\.[^ .]+$/g, ".txt")
            const lyricsPath = joinPath(lyricsDir, txtId)
            makeDir(dirName(lyricsPath))
            writeFile(lyricsPath, song.lyrics)
        }
    }
    ipcRenderer.send("destroy-window")
}

const scanner = async(rawFolder, dumpOnly = false) => {
    const folder = joinPath(rawFolder)
    processedFiles = 0
    songs = []
    failureCount = 0
    document.getElementById("status-current").textContent = `Scanning`
    document.getElementById("status-current").style.display = "initial"
    document.getElementById("status-folder").textContent = folder
    document.getElementById("status-folder").style.color = "var(--primary)"
    document.getElementById("status-files").textContent = ""
    document.getElementById("status-notify").textContent = ""
    const {stopPlayback} = require("./player")
    await stopPlayback()
    const {clearPlaylist} = require("./playlist")
    await clearPlaylist()
    const fileExts = [
        "3gp",
        "aac",
        "aif",
        "aifc",
        "aiff",
        "alac",
        "ape",
        "asf",
        "bwf",
        "flac",
        "m4a",
        "m4b",
        "m4p",
        "m4r",
        "mka",
        "mkv",
        "mogg",
        "mp2",
        "mp3",
        "mp4",
        "mpc",
        "mpp",
        "mp+",
        "oga",
        "ogg",
        "opus",
        "wav",
        "wave",
        "webm",
        "wma",
        "wmv",
        "wv"
    ]
    const escapedFolder = folder.replace(/\[/g, "\\[")
    glob(joinPath(escapedFolder, "**/*"), async(_e, all) => {
        const files = all.filter(f => fileExts.includes(f.replace(/.*\./g, "")))
            .filter(f => isFile(f))
        for (const f of files) {
            const id = f.replace(folder, "").replace(/^[/\\]+/g, "")
            await processFile(f, id)
            processedFiles += 1
            document.getElementById("status-files").textContent
                = `${processedFiles}/${files.length} songs`
        }
        if (dumpOnly) {
            dumpLyrics(folder)
            return
        }
        document.getElementById("status-current").textContent = `Ready`
        document.getElementById("status-current").style.display = ""
        document.getElementById("status-files").textContent
            = `${songs.length} songs`
        document.getElementById("status-scan").textContent = ""
        if (failureCount) {
            notify(`Total of ${failureCount} scan failures`)
        }
        setTimeout(() => updateCache(), 1)
    })
}

const updateCache = () => writeJSON(joinPath(
    configDir, "cache.json"), cachedSongs)

const query = search => {
    if (!search.trim()) {
        return []
    }
    const filters = search.split(/(?= \w+[:=])/g).map(p => ({
        "cased": low(p.trim().split(/[:=]/g)[0]) !== p.trim().split(/[:=]/g)[0],
        "name": p.trim().split(/[:=]/g)[0],
        "value": p.trim().split(/[:=]/g)[1]
    }))
    let globalSearch = {"cased": false, "name": null}
    if (filters[0]?.value === undefined) {
        globalSearch = filters.shift()
    }
    const searchableFilters = filters.map(f => ({...f, "name": low(f.name)}))
        .filter(f => !["order", "limit", "asc"].includes(f.name))
    let filtered = songs.filter(s => {
        for (const filter of searchableFilters) {
            if (!s[filter.name]) {
                return false
            }
            if (typeof s[filter.name] === "number" && filter.value.match(/^\d+-\d+$/g)) {
                if (s[filter.name] < Number(filter.value.split("-")[0])
                || s[filter.name] > Number(filter.value.split("-")[1])) {
                    return false
                }
            } else if (filter.name.endsWith("date") && filter.value.match(/^\d+-\d+$/g)) {
                const year = new Date(s[filter.name]
                    ?.toString?.() || "").getFullYear()
                if (year < Number(filter.value.split("-")[0])
                || year > Number(filter.value.split("-")[1]) || isNaN(year)) {
                    return false
                }
            } else if (Array.isArray(s[filter.name])) {
                const presentInArray = s[filter.name].find(field => {
                    let flags = "gi"
                    if (filter.cased) {
                        flags = "g"
                    }
                    try {
                        const regex = RegExp(filter.value, flags)
                        if (!String(field).match(regex)) {
                            return false
                        }
                    } catch {
                        if (filter.cased
                        && !String(field).includes(filter.value)) {
                            return false
                        }
                        if (!filter.cased && !String(low(field))
                            .includes(low(filter.value))) {
                            return false
                        }
                    }
                    return true
                })
                if (!presentInArray) {
                    return false
                }
            } else {
                let flags = "gi"
                if (filter.cased) {
                    flags = "g"
                }
                try {
                    const regex = RegExp(filter.value, flags)
                    if (!String(s[filter.name]).match(regex)) {
                        return false
                    }
                } catch {
                    if (filter.cased
                        && !String(s[filter.name]).includes(filter.value)) {
                        return false
                    }
                    if (!filter.cased && !String(low(s[filter.name]))
                        .includes(low(filter.value))) {
                        return false
                    }
                }
            }
        }
        if (globalSearch?.name) {
            let flags = "gi"
            if (globalSearch.cased) {
                flags = "g"
            }
            for (const word of globalSearch.name.split(/\s/g).filter(w => w)) {
                try {
                    const regex = RegExp(word, flags)
                    if (!Object.values(s).find(
                        val => String(val).match(regex))) {
                        return false
                    }
                } catch {
                    if (globalSearch.cased && !Object.values(s).find(
                        val => String(val).includes(word))) {
                        return false
                    }
                    if (!Object.values(s).find(val => low(String(val))
                        .includes(low(word)))) {
                        return false
                    }
                }
            }
        }
        return true
    })
    let order = filters.find(f => low(f.name) === "order")?.value || "disk"
    if (!["shuffle", "albumshuffle", "disk", "alpha", "date"].includes(order)) {
        order = "disk"
    }
    if (order.endsWith("shuffle")) {
        filtered.sort(() => Math.random() - 0.5)
    }
    let asc = filters.find(f => low(f.name) === "asc")?.value
    if (["true", "1", "yes", "0", "false", "no"].includes(asc)) {
        asc = asc === "true" || asc === "1" || asc === "yes"
    } else {
        asc = true
    }
    const albums = Array.from(new Set(filtered.map(s => s.album))).sort(
        () => Math.random() - 0.5)
    filtered.sort((a, b) => {
        if (order === "disk") {
            if (asc) {
                if (a.id > b.id) {
                    return 1
                }
                return -1
            }
            if (a.id < b.id) {
                return 1
            }
            return -1
        }
        if (order === "date") {
            if (a.date && !b.date) {
                return -1
            }
            if (!a.date && b.date) {
                return 1
            }
            const dateA = new Date(String(a.date))
            const dateB = new Date(String(b.date))
            const diff = dateA.getTime() - dateB.getTime()
            if (isNaN(diff)) {
                return 0
            }
            if (asc) {
                return diff
            }
            return -diff
        }
        if (order === "alpha") {
            if (asc) {
                if (a.title > b.title) {
                    return 1
                }
                if (a.title < b.title) {
                    return -1
                }
            }
            if (a.title < b.title) {
                return 1
            }
            if (a.title > b.title) {
                return -1
            }
            return 0
        }
        if (order === "albumshuffle") {
            if (b.album && a.album && b.album === a.album) {
                if (b.disc && a.disc) {
                    if (b.disc === a.disc) {
                        return a.track - b.track
                    }
                    return a.disc - b.disc
                }
                return a.track - b.track
            }
            return albums.indexOf(a.album) - albums.indexOf(b.album)
        }
        return 0
    })
    const limitStr = filters.find(f => low(f.name) === "limit")?.value
    if (limitStr) {
        const limit = Number(limitStr)
        if (!isNaN(limit)) {
            filtered = filtered.slice(0, limit)
        }
    }
    return filtered
}

const coverArt = async p => {
    try {
        const details = await musicMetadata.parseFile(p, {"skipCovers": false})
            .catch(() => null)
        const pic = details?.common?.picture?.[0]
        if (pic) {
            const str = Buffer.from(pic.data, "binary").toString("base64")
            return `data:${pic.format};base64,${str}`
        }
        return null
    } catch {
        return null
    }
}

const setStartupSettings = dir => {
    configDir = dir
    cache = document.getElementById("setting-cache").value || "all"
    if (cache !== "none") {
        cachedSongs = readJSON(joinPath(configDir, "cache.json")) || []
        cachedSongs = cachedSongs.filter(s => s.id && s.path)
        if (document.getElementById("toggle-cache-clean").checked) {
            cachedSongs = cachedSongs.filter(s => isFile(s.path))
        }
        if (cache === "songs") {
            cachedSongs = cachedSongs.map(s => ({...s, "lyrics": undefined}))
        }
        if (cache === "lyrics") {
            cachedSongs = cachedSongs.filter(s => s.lyrics)
                .map(s => ({"id": s.id, "lyrics": s.lyrics, "path": s.path}))
        }
    }
}

const songById = id => JSON.parse(JSON.stringify(
    songs.find(s => s.id === id) || {}))

const songByIdOrPath = (id, path) => JSON.parse(JSON.stringify(
    songs.find(s => s.id === id || s.path === path) || {}))

const updateLyricsOfSong = (id, path, lyrics) => {
    songs.find(s => s.id === id || s.path === path).lyrics = lyrics
    cachedSongs.find(s => s.id === id || s.path === path).lyrics = lyrics
    return new Promise(res => {
        setTimeout(() => {
            updateCache()
            res()
        }, 1)
    })
}

module.exports = {
    coverArt,
    query,
    scanner,
    setStartupSettings,
    songById,
    songByIdOrPath,
    updateCache,
    updateLyricsOfSong
}
