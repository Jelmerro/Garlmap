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

/** @typedef {{
 *   album: string,
 *   artist: string,
 *   bitrate: number,
 *   date: string,
 *   disc: number | null,
 *   disctotal: number | null,
 *   duration: number,
 *   id: string,
 *   lyrics: string | null,
 *   path: string,
 *   title: string,
 *   track: number | null,
 *   tracktotal: number | null
 * }} MainSongProps
 */
/** @typedef {{
 *   genre?: string[],
 *   composer?: string[],
 *   lyricist?: string[],
 *   writer?: string[],
 *   conductor?: string[],
 *   remixer?: string[],
 *   arranger?: string[],
 *   engineer?: string[],
 *   producer?: string[],
 *   technician?: string[],
 *   djmixer?: string[],
 *   mixer?: string[],
 *   label?: string[],
 *   grouping?: string,
 *   subtitle?: string[],
 *   rating?: number,
 *   bpm?: number,
 *   mood?: string,
 *   releasetype?: string[],
 *   originalalbum?: string,
 *   originalartist?: string,
 *   originaldate?: string
 * }} ExtraSongProps
 */
/** @typedef {MainSongProps & Partial<ExtraSongProps>} Song */

import {
    dirName,
    getInputValue,
    isFile,
    isInputChecked,
    joinPath,
    listFiles,
    makeDir,
    notify,
    readJSON,
    watchFile,
    writeFile,
    writeJSON
} from "../util.js"
import {clearPlaylist} from "./playlist.js"
import {ipcRenderer} from "electron"
import {parseFile} from "music-metadata"
import {stopPlayback} from "./player.js"

/** @type {string|null} */
let configDir = null
let cache = "all"
let ownCacheChange = true
/** @type {Song[]} */
let cachedSongs = []
/** @type {Song[]} */
let songs = []
let failureCount = 0
let processedFiles = 0
/** @type {(keyof MainSongProps)[]} */
const mainProps = [
    "album",
    "artist",
    "bitrate",
    "date",
    "disc",
    "disctotal",
    "duration",
    "id",
    "lyrics",
    "path",
    "title",
    "track",
    "tracktotal"
]
/** @type {(keyof ExtraSongProps)[]} */
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
/** @type {(keyof Song | "order" | "limit" | "asc")[]} */
const validProps = [...mainProps, ...extraProps, "order", "limit", "asc"]
const queryRegex = RegExp(`(?= (?:${validProps.join("|")})[:=])`, "gi")

/**
 * Convert a string or number to an all-lowercase string.
 * @param {string|number} s
 */
const low = s => String(s).toLowerCase()

/**
 * Sanitize the lyrics by removing extra newlines and adding ones as needed.
 * @param {string|undefined|null} lyrics
 */
const sanitizeLyrics = lyrics => lyrics?.trim()
    .replace(/\n\[/g, "\n\n[").replace(/\n\n\n/g, "\n\n") || ""

/**
 * Process a file by path and id, then add it to the song data info.
 * @param {string} path
 * @param {string} id
 */
const processFile = async(path, id) => {
    /** @type {Song|null} */
    let song = null
    let cacheIndex = -1
    if (cache !== "none") {
        song = cachedSongs.find(s => path === s.path)
            || cachedSongs.find(s => id.endsWith(s.id))
            || cachedSongs.find(s => s.id.endsWith(id)) || null
        if (song) {
            cacheIndex = cachedSongs.indexOf(song)
        }
    }
    if (cache === "lyrics" || !song) {
        const statusScanEl = document.getElementById("status-scan")
        if (statusScanEl) {
            statusScanEl.textContent = `Reading ${path}`
        }
        let details = await parseFile(path, {"skipCovers": true})
            .catch(() => null)
        if (!details?.format?.duration) {
            details = await parseFile(
                path, {"duration": true, "skipCovers": true}).catch(() => null)
        }
        if (!details?.format?.duration) {
            failureCount += 1
            notify(`Failed to scan: ${id}`, "err", false)
            return
        }
        let date = details.common.date ?? String(details.common.year ?? "")
        const tagTypes = details.format.tagTypes ?? []
        const id3WithOldDate = tagTypes.some(
            t => t === "ID3v2.2" || t === "ID3v2.3")
        if (!details.common.date && id3WithOldDate) {
            const nativeTag = details.native[tagTypes[0]]
            const TYER = String(nativeTag.find(
                t => t.id.startsWith("TYE"))?.value ?? "").trim()
            const TDAT = String(nativeTag.find(
                t => t.id.startsWith("TDA"))?.value ?? "").trim()
            if (TYER.length >= 4 && TDAT.length === 4) {
                const day = TDAT.slice(0, 2)
                const month = TDAT.slice(2, 4)
                date = `${TYER}-${month}-${day}`
            } else if (TYER.length >= 4) {
                date = TYER
            }
        }
        song = {
            "album": details.common.album || "",
            "artist": details.common.artist || "",
            "bitrate": details.format.bitrate || 0,
            date,
            "disc": details.common.disk.no,
            "disctotal": details.common.disk.of,
            "duration": details.format.duration || 0,
            id,
            "lyrics": sanitizeLyrics(song?.lyrics),
            path,
            "title": details.common.title || "",
            "track": details.common.track.no,
            "tracktotal": details.common.track.of
        }
        for (const prop of extraProps) {
            let val = details.common[prop]
            if (!val) {
                continue
            }
            if (prop === "rating") {
                const rating = details.common.rating?.at(0)?.rating
                if (rating) {
                    song[prop] = rating
                }
                continue
            }
            if (prop === "bpm") {
                const {bpm} = details.common
                if (bpm) {
                    song[prop] = bpm
                }
                continue
            }
            val = details.common[prop]
            if (val) {
                song[prop] = val
            }
        }
        if (details.common.originaldate) {
            song.originaldate = details.common.originaldate
        } else if (details.common.originalyear) {
            song.originaldate = String(details.common.originalyear)
        }
    }
    if (cacheIndex === -1) {
        cachedSongs.push(song)
    } else {
        cachedSongs[cacheIndex] = song
    }
    songs.push(song)
}

/**
 * Dump the lyrics for each song into a "Lyrics" folder with the same structure.
 * @param {string} folder
 */
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

/** Update the cache file with new addition. */
export const updateCache = () => {
    ownCacheChange = true
    if (configDir) {
        writeJSON(joinPath(configDir, "cache.json"), cachedSongs)
    }
}

/**
 * Scan a folder, optionally dump it and store it in cache, ready for play.
 * @param {string} rawFolder
 * @param {boolean} dumpOnly
 */
export const scanner = async(rawFolder, dumpOnly = false) => {
    const folder = joinPath(rawFolder)
    processedFiles = 0
    songs = []
    failureCount = 0
    const statusCurrentEl = document.getElementById("status-current")
    if (statusCurrentEl) {
        statusCurrentEl.textContent = `Scanning`
        statusCurrentEl.style.display = "initial"
    }
    const statusFolderEl = document.getElementById("status-folder")
    if (statusFolderEl) {
        statusFolderEl.textContent = folder
        statusFolderEl.style.color = "var(--primary)"
    }
    const statusFilesEl = document.getElementById("status-files")
    if (statusFilesEl) {
        statusFilesEl.textContent = ""
    }
    const statusNotifyEl = document.getElementById("status-notify")
    if (statusNotifyEl) {
        statusNotifyEl.textContent = ""
    }
    await stopPlayback()
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
    const files = listFiles(folder)
        .filter(f => fileExts.includes(f.replace(/.*\./g, "")))
    for (const f of files) {
        const id = f.replace(folder, "").replace(/^[/\\]+/g, "")
        await processFile(f, id)
        processedFiles += 1
        if (statusFilesEl) {
            statusFilesEl.textContent
                = `${processedFiles}/${files.length} songs`
        }
    }
    if (dumpOnly) {
        dumpLyrics(folder)
        return
    }
    if (statusCurrentEl) {
        statusCurrentEl.textContent = `Ready`
        statusCurrentEl.style.display = ""
    }
    if (statusFilesEl) {
        statusFilesEl.textContent = `${songs.length} songs`
    }
    const statusScanEl = document.getElementById("status-scan")
    if (statusScanEl) {
        statusScanEl.textContent = ""
    }
    if (failureCount) {
        notify(`Total of ${failureCount} scan failures`)
    }
    setTimeout(() => updateCache(), 1)
}

/**
 * Check if a string is a valid song filter name.
 * @param {any} name
 * @returns {name is keyof Song}
 */
const isValidFilter = name => validProps.includes(name)

/**
 * Query the song data by string to find matching songs.
 * @param {string} search
 */
export const query = search => {
    if (!search.trim()) {
        return []
    }
    const filters = search.split(queryRegex).map(p => ({
        "cased": low(p.trim().split(/[:=]/g)[0]) !== p.trim().split(/[:=]/g)[0],
        "name": p.trim().split(/[:=]/g)[0],
        "part": p.trim(),
        "value": p.trim().split(/([:=])/g).slice(2).join("")
    }))
    /** @type {{"cased": boolean, "name": string, "part": string}|null} */
    let globalSearch = {"cased": false, "name": "", "part": ""}
    if (!isValidFilter(filters[0]?.name)) {
        globalSearch = filters.shift() ?? globalSearch
        globalSearch.cased = low(globalSearch.part) !== globalSearch.part
    }
    const searchableFilters = filters.map(f => ({...f, "name": low(f.name)}))
        .filter(f => !["order", "limit", "asc"].includes(f.name))
    let filtered = songs.filter(s => {
        for (const filter of searchableFilters) {
            if (!isValidFilter(filter.name)) {
                return false
            }
            const value = s[filter.name]
            if (!value) {
                return false
            }
            if (typeof value === "number" && filter.value.match(/^\d+-\d+$/g)) {
                if (value < Number(filter.value.split("-")[0])
                || value > Number(filter.value.split("-")[1])) {
                    return false
                }
            } else if (filter.name.endsWith("date") && filter.value.match(/^\d+-\d+$/g)) {
                const year = new Date(value
                    ?.toString?.() || "").getFullYear()
                if (year < Number(filter.value.split("-")[0])
                || year > Number(filter.value.split("-")[1]) || isNaN(year)) {
                    return false
                }
            } else if (Array.isArray(value)) {
                const presentInArray = value.find(field => {
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
                    if (!String(value).match(regex)) {
                        return false
                    }
                } catch {
                    if (filter.cased
                        && !String(value).includes(filter.value)) {
                        return false
                    }
                    if (!filter.cased && !String(low(value))
                        .includes(low(filter.value))) {
                        return false
                    }
                }
            }
        }
        if (globalSearch?.part) {
            let flags = "gi"
            if (globalSearch.cased) {
                flags = "g"
            }
            for (const word of globalSearch.part.split(/\s/g).filter(w => w)) {
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
    /** @type {string|boolean} */
    let asc = filters.find(f => low(f.name) === "asc")?.value ?? ""
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
                        return (a.track ?? 0) - (b.track ?? 0)
                    }
                    return a.disc - b.disc
                }
                return (a.track ?? 0) - (b.track ?? 0)
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

/**
 * Try parsing the file again but with cover art and return it if found.
 * @param {string} p
 */
export const coverArt = async p => {
    try {
        const details = await parseFile(p, {"skipCovers": false})
            .catch(() => null)
        const pic = details?.common?.picture?.[0]
        if (pic) {
            const str = Buffer.from(pic.data.buffer).toString("base64")
            return `data:${pic.format};base64,${str}`
        }
        return null
    } catch {
        return null
    }
}

/**
 * Apply the startup settings to the cache.
 * @param {string} dir
 */
export const setStartupSettings = dir => {
    configDir = dir
    cache = getInputValue("setting-cache") || "all"
    const cachePath = joinPath(configDir, "cache.json")
    if (cache !== "none") {
        cachedSongs = readJSON(cachePath) || []
        cachedSongs = cachedSongs.filter(s => s.id && s.path)
        if (isInputChecked("toggle-cache-clean")) {
            cachedSongs = cachedSongs.filter(s => isFile(s.path))
        }
        if (cache === "songs") {
            cachedSongs = cachedSongs.map(s => ({...s, "lyrics": null}))
        }
        if (cache === "lyrics") {
            cachedSongs = cachedSongs.filter(s => s.lyrics)
                .map(s => ({"id": s.id, "lyrics": s.lyrics, "path": s.path}))
        }
    }
    watchFile(cachePath, () => {
        if (ownCacheChange) {
            ownCacheChange = false
            return
        }
        cachedSongs = readJSON(cachePath) || cachedSongs
    })
}

/**
 * Find a song by its unique id.
 * @param {string} id
 * @returns {Song|{}}
 */
export const songById = id => JSON.parse(JSON.stringify(
    songs.find(s => s.id === id) || {}))

/**
 * Find a song by its unique id or path.
 * @param {string} id
 * @param {string} path
 * @returns {Song|null}
 */
export const songByIdOrPath = (id, path) => JSON.parse(JSON.stringify(
    songs.find(s => s.id === id || s.path === path) ?? null))

/**
 * Update the lyrics of a specific song by id or path.
 * @param {string} id
 * @param {string} path
 * @param {string} lyrics
 */
export const updateLyricsOfSong = (id, path, lyrics) => {
    const song = songs.find(s => s.id === id || s.path === path)
    if (song) {
        song.lyrics = lyrics
    }
    const cached = cachedSongs.find(s => s.id === id || s.path === path)
    if (cached) {
        cached.lyrics = lyrics
    }
    return new Promise(res => {
        setTimeout(() => {
            updateCache()
            res(null)
        }, 1)
    })
}
