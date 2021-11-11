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
    // TODO query logic
    return songs.filter(song => true)
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

module.exports = {scanner, query, allSongs, randomSong, songForPath, coverArt}
