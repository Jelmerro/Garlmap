/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
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

const glob = require("glob")
const path = require("path")
const nm = require("music-metadata")
const {Client} = require("genius-lyrics")
const genius = new Client()
const {readJSON, writeJSON, joinPath} = require("../util")

let configDir = null
let cache = "all"
let cachedSongs = []
let songs = []
let failures = []
let processedFiles = 0
const low = s => s.toLowerCase()

const processFile = async(file, total, lyrics = null) => {
    document.getElementById("status-scan").textContent = `Reading ${file}`
    try {
        let details = await nm.parseFile(file, {"skipCovers": true})
        if (!details.format.duration) {
            details = await nm.parseFile(
                file, {"skipCovers": true, "duration": true})
        }
        const song = {
            "path": file,
            "title": details.common.title,
            "artist": details.common.artist,
            "album": details.common.album,
            "disc": details.common.disk.no,
            "disc_total": details.common.disk.of,
            "track": details.common.track.no,
            "track_total": details.common.track.of,
            "duration": details.format.duration,
            "date": details.common.year,
            lyrics
        }
        songs.push(song)
        const existing = cachedSongs.find(s => s.path === song.path)
        if (existing) {
            cachedSongs[cachedSongs.indexOf(existing)] = song
        } else {
            cachedSongs.push(song)
        }
    } catch {
        failures.push(file)
    }
    processedFiles += 1
    document.getElementById("status-files").textContent
        = `${processedFiles}/${total} songs`
}

const scanner = folder => {
    processedFiles = 0
    songs = []
    failures = []
    document.getElementById("status-folder").textContent = folder
    document.getElementById("status-folder").style.color = "var(--primary)"
    document.getElementById("status-scan").textContent = ""
    document.getElementById("status-scan").style.color = ""
    const escapedFolder = folder.replace(/\[/g, "\\[")
    glob(path.join(escapedFolder, "**/*.mp3"), async(_e, files) => {
        songs = cachedSongs.filter(s => files.includes(s.path))
        document.getElementById("status-current").textContent = `Scanning`
        document.getElementById("status-current").style.color = "var(--primary)"
        const useCache = ["all", "songs"].includes(cache)
        for (const file of files) {
            const match = songs.find(s => s.path === file)
            if (useCache && match) {
                continue
            }
            await processFile(file, files.length, match?.lyrics)
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
    })
}

const updateCache = () => writeJSON(joinPath(configDir, "cache"), cachedSongs)

const query = search => {
    if (!search.trim()) {
        return []
    }
    const filters = search.split(/(?= \w+:)/g).map(p => ({
        "name": p.trim().split(":")[0],
        "value": p.trim().split(":")[1],
        "cased": low(p.trim().split(":")[0]) !== p.trim().split(":")[0]
    }))
    let globalSearch = {"name": null, "cased": false}
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
            if (a.path > b.path) {
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

const allSongs = () => songs

const randomSong = () => songs.at(Math.random() * songs.length)

const songForPath = p => songs.find(song => song.path === p)

const coverArt = async p => {
    try {
        const details = await nm.parseFile(p, {"skipCovers": false})
        const pic = details.common.picture?.[0]
        if (pic) {
            const str = Buffer.from(pic.data, "binary").toString("base64")
            return `data:${pic.format};base64,${str}`
        }
        return null
    } catch {
        return null
    }
}

const fetchLyrics = async req => {
    if (req.lyrics) {
        document.getElementById("song-info").textContent = req.lyrics
        return
    }
    const low = s => s.toLowerCase()
    try {
        document.getElementById("status-scan").textContent
            = `Connecting to Genius to search for the right song lyrics`
        document.getElementById("status-scan").style.color = "var(--primary)"
        const [mainArtist] = low(req.artist)
            .split(/ ?\(?feat. /g)[0].split(/ ?\(?ft. /g)[0].split(" & ")
        const results = await genius.songs.search(`${req.title} ${mainArtist}`)
        let song = results.find(
            s => (low(s.title).includes(low(req.title))
                || low(req.title).includes(low(s.title)))
                && low(s.artist.name).includes(mainArtist))
        if (!song && results.length === 1) {
            [song] = results
        }
        if (song) {
            const lyrics = await song.lyrics()
            document.getElementById("song-info").textContent = lyrics
            document.getElementById("status-scan").textContent = ""
            songs.find(s => s.path === req.path).lyrics = lyrics
            cachedSongs.find(s => s.path === req.path).lyrics = lyrics
            setTimeout(() => updateCache(), 1)
        } else {
            console.warn("No matched song found, this might be a bug", results)
            document.getElementById("status-scan").textContent
                = `Failed to find matching song lyrics in results of Genius`
            document.getElementById("status-scan").style.color
                = "var(--tertiary)"
        }
    } catch (e) {
        console.warn(e)
        document.getElementById("status-scan").textContent
            = `Failed to fetch lyrics from Genius`
        document.getElementById("status-scan").style.color = "var(--tertiary)"
    }
}

const setCachePolicy = (dir, policy) => {
    configDir = dir
    cache = policy
    if (cache !== "none") {
        cachedSongs = readJSON(joinPath(configDir, "cache")) || []
        if (cache === "songs") {
            cachedSongs = cachedSongs.map(s => ({...s, "lyrics": undefined}))
        }
        if (cache === "lyrics") {
            cachedSongs = cachedSongs.filter(s => s.lyrics).map(
                s => ({"path": s.path, "lyrics": s.lyrics}))
        }
    }
}

module.exports = {
    scanner,
    query,
    allSongs,
    randomSong,
    songForPath,
    coverArt,
    fetchLyrics,
    setCachePolicy
}
