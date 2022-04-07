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
const {compareTwoStrings} = require("string-similarity")
const musicMetadata = require("music-metadata")
const {Client} = require("genius-lyrics")
const genius = new Client()
const {
    readJSON,
    writeJSON,
    joinPath,
    resetWelcome,
    isFile,
    dirName,
    basePath,
    readFile
} = require("../util")

let configDir = null
let cache = "all"
let cachedSongs = []
let songs = []
let failures = []
let processedFiles = 0
const low = s => s.toLowerCase()

const processFile = async(folder, file, total, lyrics = null) => {
    document.getElementById("status-scan").textContent = `Reading ${file}`
    let details = await musicMetadata.parseFile(file, {"skipCovers": true})
        .catch(() => null)
    if (!details?.format?.duration) {
        details = await musicMetadata.parseFile(
            file, {"duration": true, "skipCovers": true}).catch(() => null)
    }
    if (!details) {
        failures.push(file)
        processedFiles += 1
        document.getElementById("status-files").textContent
            = `${processedFiles}/${total} songs`
        return
    }
    const song = {
        "album": details.common.album,
        "artist": details.common.artist,
        "bitrate": details.format.bitrate,
        "date": details.common.year,
        "disc": details.common.disk.no,
        "disc_total": details.common.disk.of,
        "duration": details.format.duration,
        "id": file.replace(folder, "").replace(/^[/\\]+/g, ""),
        lyrics,
        "path": file,
        "title": details.common.title,
        "track": details.common.track.no,
        "track_total": details.common.track.of
    }
    const existingCache = cachedSongs.find(
        s => s.id === song.id || s.path === song.path)
    if (existingCache) {
        cachedSongs[cachedSongs.indexOf(existingCache)] = song
    } else {
        cachedSongs.push(song)
    }
    const existingCurrent = songs.find(
        s => s.id === song.id || s.path === song.path)
    if (existingCurrent) {
        songs[songs.indexOf(existingCurrent)] = song
    } else {
        songs.push(song)
    }
    processedFiles += 1
    document.getElementById("status-files").textContent
        = `${processedFiles}/${total} songs`
}

const scanner = async folder => {
    processedFiles = 0
    songs = []
    failures = []
    document.getElementById("status-folder").textContent = folder
    document.getElementById("status-folder").style.color = "var(--primary)"
    document.getElementById("status-scan").textContent = ""
    document.getElementById("status-scan").style.color = ""
    document.getElementById("status-current").textContent = `Scanning`
    document.getElementById("status-current").style.color = "var(--primary)"
    const escapedFolder = folder.replace(/\[/g, "\\[")
    const {stopPlayback} = require("./player")
    await stopPlayback()
    const {clearPlaylist} = require("./playlist")
    await clearPlaylist()
    glob(joinPath(escapedFolder, "**/*.mp3"), async(_e, files) => {
        const useCache = ["all", "songs"].includes(cache)
        if (useCache !== "none") {
            songs = cachedSongs.filter(s => s.path?.startsWith(folder))
                .filter(s => isFile(s.path))
        }
        for (const f of files) {
            const match = songs.find(s => f.endsWith(s.id) || f === s.path)
            if (useCache && match) {
                match.id = f.replace(folder, "").replace(/^[/\\]+/g, "")
                match.path = f
                continue
            }
            await processFile(folder, f, files.length, match?.lyrics)
        }
        document.getElementById("status-current").textContent = `Ready`
        document.getElementById("status-current").style.color
            = "var(--secondary)"
        document.getElementById("status-files").textContent
            = `${songs.length} songs`
        if (failures.length) {
            document.getElementById("status-scan").textContent
                = `${failures.length} failures`
            document.getElementById("status-scan").style.color
                = "var(--tertiary)"
        } else {
            document.getElementById("status-scan").textContent = ""
        }
        setTimeout(() => updateCache(), 1)
    })
}

const updateCache = () => writeJSON(joinPath(configDir, "cache"), cachedSongs)

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
        .filter(f => !["order", "limit"].includes(f.name))
    let filtered = songs.filter(s => {
        for (const filter of searchableFilters) {
            if (!s[filter.name]) {
                return false
            }
            if (typeof s[filter.name] === "number" && filter.value.match(/\d+-\d/g)) {
                if (s[filter.name] < Number(filter.value.split("-")[0])
                || s[filter.name] > Number(filter.value.split("-")[1])) {
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
    const order = filters.find(f => low(f.name) === "order")?.value || "disk"
    if (order.endsWith("shuffle")) {
        filtered.sort(() => Math.random() - 0.5)
    }
    const albums = Array.from(new Set(filtered.map(s => s.album))).sort(
        () => Math.random() - 0.5)
    filtered.sort((a, b) => {
        if (order === "disk") {
            if (a.id > b.id) {
                return 1
            }
            return -1
        }
        if (order === "alpha") {
            if (a.title > b.title) {
                return 1
            }
            if (a.title < b.title) {
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

const fetchLyrics = async(req, force = false, originalReq = false) => {
    // Use cache
    const cachedLyrics = songs.find(s => s.id === req.id
        || s.path === req.path).lyrics
    if (cachedLyrics && !force) {
        document.getElementById("song-info").textContent = cachedLyrics
        return
    }
    if (!req.artist || !req.title) {
        return
    }
    // Find it in a local file
    const localFile = req.path.replace(/\.[^ .]+$/g, ".txt")
    const localLyrics = readFile(localFile)
    if (localLyrics) {
        document.getElementById("song-info").textContent = localLyrics
        return
    }
    const tracklistFile = joinPath(
        dirName(localFile), "Tracklists", basePath(localFile))
    const tracklistLyrics = readFile(tracklistFile)
    if (tracklistLyrics) {
        document.getElementById("song-info").textContent = tracklistLyrics
        return
    }
    // Fetch it from Genius
    const {currentAndNext} = require("./playlist")
    try {
        document.getElementById("status-scan").textContent
            = `Connecting to Genius to search for the right song lyrics`
        document.getElementById("status-scan").style.color = "var(--primary)"
        const results = await genius.songs.search(`${req.title} ${req.artist}`)
        results.forEach(s => {
            s.score = compareTwoStrings(low(s.title), low(req.title))
                + compareTwoStrings(low(s.artist.name), low(req.artist))
            if (originalReq) {
                const originalScore = compareTwoStrings(
                    low(s.title), low(originalReq.title))
                + compareTwoStrings(low(s.artist.name), low(originalReq.artist))
                if (originalScore > s.score) {
                    s.score = originalScore
                }
            }
        })
        results.sort((a, b) => b.score - a.score)
        const [song] = results
        if (song && song.score > 1.6) {
            const lyrics = await song.lyrics()
            if (currentAndNext().current?.id === req.id) {
                document.getElementById("song-info").textContent = lyrics
            }
            document.getElementById("status-scan").textContent = ""
            songs.find(s => s.id === req.id
                || s.path === req.path).lyrics = lyrics
            cachedSongs.find(s => s.id === req.id
                || s.path === req.path).lyrics = lyrics
            setTimeout(() => updateCache(), 1)
            return
        }
        console.warn("No matched song found, needs manual search", results)
        if (currentAndNext().current?.id === req.id) {
            document.getElementById("status-scan").textContent
                = "Failed to find matching song lyrics in results of Genius"
            document.getElementById("status-scan").style.color
                = "var(--tertiary)"
        } else {
            document.getElementById("status-scan").textContent = ""
        }
    } catch (e) {
        console.warn(e)
        if (currentAndNext().current?.id === req.id) {
            document.getElementById("status-scan").textContent
                = "Failed to fetch lyrics from Genius"
            document.getElementById("status-scan").style.color
                = "var(--tertiary)"
        } else {
            document.getElementById("status-scan").textContent = ""
        }
    }
    // Retry without text between brackets in song title and artist
    if (originalReq) {
        return
    }
    if (currentAndNext().current?.id === req.id) {
        const reqWithoutBrackets = JSON.parse(JSON.stringify(req))
        reqWithoutBrackets.artist = req.artist.replace(/\(.*\)/g, "").trim()
        reqWithoutBrackets.title = req.title.replace(/\(.*\)/g, "").trim()
        if (reqWithoutBrackets.artist !== req.artist) {
            fetchLyrics(reqWithoutBrackets, force, req)
        } else if (reqWithoutBrackets.title !== req.title) {
            fetchLyrics(reqWithoutBrackets, force, req)
        }
    } else {
        document.getElementById("status-scan").textContent = ""
    }
}

const showLyrics = async p => {
    resetWelcome()
    const {shouldAutoFetchLyrics} = require("./settings")
    const song = songById(p)
    if (song.lyrics) {
        document.getElementById("song-info").textContent = song.lyrics
    } else if (shouldAutoFetchLyrics()) {
        await fetchLyrics(song)
    }
}

const setCachePolicy = (dir, policy) => {
    configDir = dir
    cache = policy
    if (cache !== "none") {
        cachedSongs = readJSON(joinPath(configDir, "cache")) || []
        cachedSongs = cachedSongs.filter(s => s.id && s.path)
        if (cache === "songs") {
            cachedSongs = cachedSongs.map(s => ({...s, "lyrics": undefined}))
        }
        if (cache === "lyrics") {
            cachedSongs = cachedSongs.filter(s => s.id && s.lyrics).map(
                s => ({"id": s.id, "lyrics": s.lyrics}))
        }
    }
}

const songById = id => JSON.parse(JSON.stringify(
    songs.find(s => s.id === id) || {}))

module.exports = {
    coverArt,
    fetchLyrics,
    query,
    scanner,
    setCachePolicy,
    showLyrics,
    songById
}
