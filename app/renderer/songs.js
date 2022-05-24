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
const {ipcRenderer} = require("electron")
const {
    readJSON,
    writeJSON,
    joinPath,
    resetWelcome,
    isFile,
    dirName,
    basePath,
    readFile,
    writeFile,
    makeDir,
    notify
} = require("../util")

let configDir = null
let cache = "all"
let cachedSongs = []
let songs = []
let failures = []
let processedFiles = 0
let shouldUseGenius = true
const low = s => s.toLowerCase()

const sanitizeLyrics = lyrics => lyrics?.trim()
    .replace(/\n\[/g, "\n\n[").replace(/\n\n\n/g, "\n\n") || ""

const processFile = async(folder, file, total, lyrics = null) => {
    document.getElementById("status-scan").textContent = `Reading ${file}`
    let details = await musicMetadata.parseFile(file, {"skipCovers": true})
        .catch(() => null)
    if (!details?.format?.duration) {
        details = await musicMetadata.parseFile(
            file, {"duration": true, "skipCovers": true}).catch(() => null)
    }
    if (!details?.format?.duration) {
        failures.push(file)
        processedFiles += 1
        notify(`Failed to scan: ${file.replace(folder, "")}`, "err", false)
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
        "lyrics": sanitizeLyrics(lyrics),
        "path": file,
        "title": details.common.title,
        "track": details.common.track.no,
        "track_total": details.common.track.of
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

const scanner = async(folder, dumpOnly = false) => {
    processedFiles = 0
    songs = []
    failures = []
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
    const normFolder = joinPath(folder)
    const escapedFolder = normFolder.replace(/\[/g, "\\[")
    glob(joinPath(escapedFolder, "**/*"), async(_e, all) => {
        const files = all.filter(f => fileExts.includes(f.replace(/.*\./g, "")))
            .filter(f => isFile(f))
        const useCache = ["all", "songs"].includes(cache)
        if (useCache !== "none") {
            songs = cachedSongs.filter(s => s.path?.startsWith(normFolder))
                .filter(s => isFile(s.path))
        }
        for (const f of files) {
            const match = songs.find(s => f.endsWith(s.id) || f === s.path)
            if (useCache && match) {
                match.id = f.replace(normFolder, "").replace(/^[/\\]+/g, "")
                match.path = f
                match.lyrics = sanitizeLyrics(match.lyrics)
                continue
            }
            await processFile(normFolder, f, files.length, match?.lyrics)
        }
        if (dumpOnly) {
            dumpLyrics(normFolder)
            return
        }
        document.getElementById("status-current").textContent = `Ready`
        document.getElementById("status-current").style.display = ""
        document.getElementById("status-files").textContent
            = `${songs.length} songs`
        document.getElementById("status-scan").textContent = ""
        if (failures.length) {
            notify(`Total of ${failures.length} scan failures`)
        }
        const {currentAndNext} = require("./playlist")
        currentAndNext()
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

let lyricsSearchCache = []

const decrementSelectedLyrics = () => {
    const selected = document.querySelector("#lyrics-results .selected")
    const {switchFocus} = require("./dom")
    if (!selected) {
        switchFocus("lyricssearch")
    }
    if (selected.previousSibling) {
        selected.classList.remove("selected")
        selected.previousSibling.classList.add("selected")
    } else {
        switchFocus("lyricssearch")
    }
}

const incrementSelectedLyrics = () => {
    const selected = document.querySelector("#lyrics-results .selected")
    if (selected) {
        if (selected.nextSibling) {
            selected.classList.remove("selected")
            selected.nextSibling.classList.add("selected")
        }
    } else {
        document.querySelector("#lyrics-results > *")
            ?.classList.add("selected")
    }
    const {switchFocus} = require("./dom")
    switchFocus("lyrics")
}

const searchLyrics = async searchString => {
    if (!searchString.trim()) {
        return
    }
    const resultsContainer = document.getElementById("lyrics-results")
    resultsContainer.textContent = "Searching Genius..."
    const results = await genius.songs.search(searchString.trim()).catch(() => {
        notify(`Failed to fetch lyrics from Genius for: ${searchString.trim()}`)
    })
    lyricsSearchCache = results || []
    resultsContainer.textContent = ""
    results?.forEach(result => {
        const el = document.createElement("div")
        el.textContent = `${result.title} - ${result.artist.name}`
        resultsContainer.appendChild(el)
        el.addEventListener("click", () => {
            resultsContainer.querySelector(".selected")
                ?.classList.remove("selected")
            el.classList.add("selected")
            const {switchFocus} = require("./dom")
            switchFocus("lyrics")
        })
        el.addEventListener("dblclick", () => selectLyricsFromResults())
    })
}

const saveLyrics = () => {
    const {currentAndNext} = require("./playlist")
    const {current} = currentAndNext()
    if (!current) {
        return
    }
    const editor = document.getElementById("lyrics-edit-field")
    songs.find(s => s.id === current.id
        || s.path === current.path).lyrics = editor.value
    cachedSongs.find(s => s.id === current.id
        || s.path === current.path).lyrics = editor.value
    setTimeout(() => {
        updateCache()
        showLyrics(current.id)
    }, 1)
}

const selectLyricsFromResults = async() => {
    const resultsContainer = document.getElementById("lyrics-results")
    const selected = resultsContainer.querySelector(".selected")
    const index = [...resultsContainer.children].indexOf(selected)
    if (lyricsSearchCache[index]) {
        const editor = document.getElementById("lyrics-edit-field")
        const previousLyrics = editor.value
        editor.value = "Fetching lyrics..."
        const cacheEntry = lyricsSearchCache[index]
        try {
            editor.value = sanitizeLyrics(await cacheEntry.lyrics())
        } catch {
            notify(`Failed to fetch lyrics from Genius for: ${
                cacheEntry.title} ${cacheEntry.artist.name}`)
            editor.value = previousLyrics
        }
        editor.scrollTo(0, 0)
    }
}

const fetchLyrics = async(req, force = false, originalReq = false) => {
    // Use cache
    const cachedLyrics = songs.find(s => s.id === req.id
        || s.path === req.path).lyrics
    if (cachedLyrics && !force) {
        document.getElementById("song-info").textContent = cachedLyrics
        document.getElementById("fs-lyrics").textContent = cachedLyrics
        document.getElementById("lyrics-edit-field").textContent = cachedLyrics
        return
    }
    if (!req.artist || !req.title) {
        return
    }
    // Find it in a local file
    const txtPath = req.path.replace(/\.[^ .]+$/g, ".txt")
    const txtId = req.id.replace(/\.[^ .]+$/g, ".txt")
    const files = [
        txtPath,
        joinPath(dirName(txtPath), "Lyrics", basePath(txtPath)),
        joinPath(dirName(txtPath), "Tracklists", basePath(txtPath)),
        joinPath(req.path.replace(req.id, ""), "Lyrics", txtId),
        joinPath(req.path.replace(req.id, ""), "Tracklists", txtId)
    ]
    const {currentAndNext} = require("./playlist")
    for (const file of files) {
        const lyrics = sanitizeLyrics(readFile(file))
        if (lyrics) {
            if (currentAndNext().current?.id === req.id) {
                document.getElementById("song-info").textContent = lyrics
                document.getElementById("fs-lyrics").textContent = lyrics
                document.getElementById("lyrics-edit-field").value = lyrics
            }
            songs.find(s => s.id === req.id
                || s.path === req.path).lyrics = lyrics
            cachedSongs.find(s => s.id === req.id
                || s.path === req.path).lyrics = lyrics
            setTimeout(() => updateCache(), 1)
            return
        }
    }
    // Fetch it from Genius
    if (!shouldUseGenius) {
        return
    }
    try {
        notify(`Searching Genius for the song lyrics of: ${
            req.title} ${req.artist}`, "info")
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
                const originalNameScore = compareTwoStrings(
                    low(s.title), low(originalReq.title))
                + compareTwoStrings(low(s.artist.name), low(req.artist))
                if (originalNameScore > s.score) {
                    s.score = originalNameScore
                }
                const originalArtistScore = compareTwoStrings(
                    low(s.title), low(req.title))
                + compareTwoStrings(low(s.artist.name), low(originalReq.artist))
                if (originalArtistScore > s.score) {
                    s.score = originalArtistScore
                }
            }
        })
        results.sort((a, b) => b.score - a.score)
        const [song] = results
        if (song && song.score > 1.6) {
            const lyrics = sanitizeLyrics(await song.lyrics())
            if (currentAndNext().current?.id === req.id) {
                document.getElementById("song-info").textContent = lyrics
                document.getElementById("fs-lyrics").textContent = lyrics
                document.getElementById("lyrics-edit-field").value = lyrics
            }
            songs.find(s => s.id === req.id
                || s.path === req.path).lyrics = lyrics
            cachedSongs.find(s => s.id === req.id
                || s.path === req.path).lyrics = lyrics
            setTimeout(() => updateCache(), 1)
            notify(`Found matching lyrics for: ${req.title} ${
                req.artist}`, "success", false)
            return
        }
        notify(`Failed to find matching song lyrics in Genius results for: ${
            req.title} ${req.artist}`)
    } catch (e) {
        notify(`Failed to fetch lyrics from Genius for: ${
            req.title} ${req.artist}`)
    }
    // Retry without text between brackets in song title and single artist
    if (originalReq) {
        return
    }
    if (currentAndNext().current?.id === req.id) {
        const reqWithoutExtraText = JSON.parse(JSON.stringify(req))
        reqWithoutExtraText.artist = req.artist.replace(/\(.*\)/g, "")
            .split("feat. ")[0].split("ft. ")[0].split(" & ")[0].trim()
        reqWithoutExtraText.title = req.title.replace(/\(.*\)/g, "").trim()
        if (reqWithoutExtraText.artist !== req.artist) {
            fetchLyrics(reqWithoutExtraText, force, req)
        } else if (reqWithoutExtraText.title !== req.title) {
            fetchLyrics(reqWithoutExtraText, force, req)
        }
    }
}

const showLyrics = async p => {
    resetWelcome()
    const {shouldAutoFetchLyrics} = require("./settings")
    const song = songById(p)
    if (song.lyrics) {
        document.getElementById("song-info").textContent = song.lyrics
        document.getElementById("fs-lyrics").textContent = song.lyrics
        document.getElementById("lyrics-edit-field").value = song.lyrics
    } else if (shouldAutoFetchLyrics()) {
        document.getElementById("lyrics-edit-field").value = ""
        await fetchLyrics(song)
    }
}

const switchToLyrics = async(forceFetch = false) => {
    const {isAlive} = require("./player")
    if (isAlive()) {
        const {currentAndNext} = require("./playlist")
        const {current} = currentAndNext()
        if (current) {
            await fetchLyrics(current, forceFetch)
            document.getElementById("song-info").scrollTo(0, 0)
        }
    }
}

const setStartupSettings = (dir, policy, removeMissing, enableGenius) => {
    configDir = dir
    cache = policy
    shouldUseGenius = enableGenius
    if (cache !== "none") {
        cachedSongs = readJSON(joinPath(configDir, "cache.json")) || []
        cachedSongs = cachedSongs.filter(s => s.id && s.path)
        if (removeMissing) {
            cachedSongs = cachedSongs.filter(s => isFile(s.path))
        }
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

const toggleGenius = () => {
    shouldUseGenius = !shouldUseGenius
    document.getElementById("toggle-genius").checked = shouldUseGenius
}

module.exports = {
    coverArt,
    decrementSelectedLyrics,
    fetchLyrics,
    incrementSelectedLyrics,
    query,
    saveLyrics,
    scanner,
    searchLyrics,
    selectLyricsFromResults,
    setStartupSettings,
    showLyrics,
    songById,
    switchToLyrics,
    toggleGenius
}
