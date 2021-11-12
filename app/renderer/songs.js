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

let songs = []
let failures = []

const processFile = async(file, total) => {
    document.getElementById("status-scan").textContent = `Reading ${file}`
    try {
        const details = await nm.parseFile(file, {"skipCovers": true})
        songs.push({
            "path": file,
            "title": details.common.title,
            "artist": details.common.artist,
            "album": details.common.album,
            "disc": details.common.disk.no,
            "disc_total": details.common.disk.of,
            "track": details.common.track.no,
            "track_total": details.common.track.of,
            "duration": details.format.duration,
            "date": details.common.year
        })
    } catch {
        failures.push(file)
    }
    document.getElementById("status-files").textContent = `${songs.length}/${total} songs`
}

const scanner = folder => {
    songs = []
    failures = []
    document.getElementById("status-folder").textContent = folder
    document.getElementById("status-folder").style.color = "var(--blue)"
    document.getElementById("status-scan").textContent = ""
    document.getElementById("status-scan").style.color = ""
    glob(path.join(folder, "**/*.mp3"), async(_e, files) => {
        document.getElementById("status-current").textContent = `Scanning`
        document.getElementById("status-current").style.color = "var(--blue)"
        for (const file of files) {
            await processFile(file, files.length)
        }
        document.getElementById("status-current").textContent = `Ready`
        document.getElementById("status-current").style.color = "var(--green)"
        document.getElementById("status-files").textContent = `${songs.length} songs`
        if (failures.length) {
            document.getElementById("status-scan").textContent = `${failures.length} failures`
            document.getElementById("status-scan").style.color = "var(--red)"
        } else {
            document.getElementById("status-scan").textContent = ""
        }
    })
}

const query = search => {
    if (!search.trim()) {
        return []
    }
    const filters = search.split(/(?= \w+:)/g).map(p => ({
        "name": p.trim().split(":")[0], "value": p.trim().split(":")[1]
    }))
    const skipSong = ["order", "count"]
    let filtered = songs.filter(s => {
        for (const filter of filters.filter(f => !skipSong.includes(f.name))) {
            if (filter.name in s && !s[filter.name]?.match(filter.value)) {
                return false
            }
        }
        return true
    })
    const order = filters.find(f => f.name === "order")?.value
    filtered.sort((a, b) => {
        if (order === "disk") {
            return 0
        } if (order === "alpha") {
            // TODO
            return 0
        } if (order === "albumshuffle") {
            if (b.album && a.album && b.album === a.album) {
                if (b.disc && a.disc) {
                    if (b.disc === a.disc) {
                        return a.track - b.track
                    }
                    return a.disc - b.disc
                }
                return a.track - b.track
            }
            // TODO figure out a way to sort albums randomly,
            // without spreading out songs over the playlist
            return 0
        }
        // Do default shuffle as default
        return Math.random() - 0.5
    })
    const requiresNewRule = ["disk", "alpha", "albumshuffle"].includes(order)
    const limitStr = filters.find(f => f.name === "limit")?.value
    if (limitStr) {
        const limit = Number(limitStr)
        if (!isNaN(limit)) {
            filtered = filtered.slice(0, limit)
        }
    }
    return {"songs": filtered, requiresNewRule, "paths": filtered.map(s => s.path)}
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

const fetchLyrics = async current => {
    if (current.lyrics) {
        document.getElementById("song-info").textContent = current.lyrics
        return
    }
    const results = await genius.songs.search(`${current.title} ${current.artist}`)
    const song = results.find(
        s => (s.title.toLowerCase().includes(current.title.toLowerCase())
            || current.title.toLowerCase().includes(s.title.toLowerCase()))
            && s.artist.name.toLowerCase().includes(current.artist.toLowerCase()))
    if (song) {
        const lyrics = await song.lyrics()
        current.lyrics = lyrics
        document.getElementById("song-info").textContent = lyrics
    } else {
        console.warn("No matched song found, this might be a bug", results)
    }
}

module.exports = {
    scanner,
    query,
    allSongs,
    randomSong,
    songForPath,
    coverArt,
    fetchLyrics
}
