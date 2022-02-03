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

let rulelist = []
let ruleIdx = 0
let selectedRuleIdx = null
let selectedPathIdx = null
let pathIdx = 0
let shouldAutoScrollTrack = false
let shouldAutoClose = false
let shouldAutoRemove = false

const {ipcRenderer} = require("electron")
const {
    formatTime, queryMatch, writeJSON, readJSON, resetWelcome, isDirectory
} = require("../util")

const generatePlaylistView = () => {
    document.getElementById("main-playlist").textContent = ""
    rulelist.forEach((item, index) => {
        // Main playlist row
        const mainContainer = document.createElement("div")
        mainContainer.className = "rule"
        if (index === ruleIdx) {
            mainContainer.classList.add("current")
        }
        if (index === selectedRuleIdx && selectedPathIdx === null) {
            mainContainer.classList.add("selected")
        }
        const openImg = document.createElement("img")
        if (item.open) {
            openImg.src = "../img/down.png"
        } else {
            openImg.src = "../img/right.png"
        }
        mainContainer.appendChild(openImg)
        const title = document.createElement("span")
        title.textContent = item.rule
        mainContainer.appendChild(title)
        const info = document.createElement("span")
        info.textContent = `${item.songs.length} songs - ${
            formatTime(item.duration)}`
        mainContainer.appendChild(info)
        const {switchFocus, generateSongElement} = require("./dom")
        if (item.rule) {
            mainContainer.addEventListener("mousedown", e => {
                if (e.button === 1) {
                    switchFocus("playlist")
                    selectedRuleIdx = index
                    selectedPathIdx = null
                    deleteSelected()
                } else if (queryMatch(e, "img") || e.button === 2) {
                    item.open = !item.open
                    generatePlaylistView()
                } else {
                    switchFocus("playlist")
                    selectedRuleIdx = index
                    selectedPathIdx = null
                    document.querySelector("#main-playlist .selected")
                        ?.classList.remove("selected")
                    mainContainer.classList.add("selected")
                }
            })
            mainContainer.addEventListener("dblclick", () => {
                item.open = !item.open
                generatePlaylistView()
            })
            document.getElementById("main-playlist").appendChild(mainContainer)
        }
        if (item.open) {
            // Song dropdown
            const songContainer = document.createElement("div")
            if (item.rule) {
                songContainer.className = "songs-of-rule"
            }
            item.songs.forEach((song, songIdx) => {
                const songInfo = generateSongElement(song)
                const currentImg = document.createElement("img")
                currentImg.src = "../img/play.png"
                songInfo.insertBefore(currentImg, songInfo.firstChild)
                if (index === ruleIdx && songIdx === pathIdx) {
                    songInfo.classList.add("current")
                }
                if (index === selectedRuleIdx
                && songIdx === selectedPathIdx) {
                    songInfo.classList.add("selected")
                }
                if (song.upcoming) {
                    songInfo.classList.add("upcoming")
                }
                songInfo.addEventListener("mousedown", e => {
                    if (e.button === 1) {
                        switchFocus("playlist")
                        selectedRuleIdx = index
                        selectedPathIdx = songIdx
                        deleteSelected()
                    } else if (e.button === 2) {
                        song.stopAfter = !song.stopAfter
                        playFromPlaylist(false)
                    } else if (queryMatch(e, "img:first-child")) {
                        switchFocus("playlist")
                        ruleIdx = index
                        pathIdx = songIdx
                        playFromPlaylist(true)
                    } else {
                        switchFocus("playlist")
                        selectedRuleIdx = index
                        selectedPathIdx = songIdx
                        document.querySelector("#main-playlist .selected")
                            ?.classList.remove("selected")
                        songInfo.classList.add("selected")
                    }
                })
                songInfo.addEventListener("dblclick", () => {
                    ruleIdx = index
                    pathIdx = songIdx
                    playFromPlaylist(true)
                })
                if (song.stopAfter) {
                    const stopImg = document.createElement("img")
                    stopImg.src = "../img/eject.png"
                    songInfo.appendChild(stopImg)
                }
                songContainer.appendChild(songInfo)
            })
            document.getElementById("main-playlist").appendChild(songContainer)
        }
    })
}

const playSelectedSong = async() => {
    if (selectedRuleIdx !== null && selectedPathIdx !== null) {
        ruleIdx = selectedRuleIdx
        pathIdx = selectedPathIdx
        await playFromPlaylist(true)
    }
}

const currentAndNext = () => {
    const {query} = require("./songs")
    const fallbackRule = document.getElementById("fallback-rule").textContent
    let current = rulelist[ruleIdx]?.songs[pathIdx]
    if (!current) {
        const songs = JSON.parse(JSON.stringify(
            query(fallbackRule).slice(0, 2)))
        ;[current] = songs
        if (!current) {
            return {}
        }
        append({
            "rule": fallbackRule,
            "songs": [current,
                {...songs[songs.indexOf(current) + 1], "upcoming": true}]
        })
        ruleIdx = rulelist.length - 1
        pathIdx = 0
    }
    rulelist[ruleIdx].upcoming = false
    current.upcoming = false
    let next = rulelist[ruleIdx]?.songs[pathIdx + 1]
        || rulelist[ruleIdx + 1]?.songs[0]
    if (!next) {
        const songs = query(fallbackRule)
        next = JSON.parse(JSON.stringify(songs[songs.indexOf(songs.find(
            s => s.id === current.id) + 1)] || songs[0]))
        next.upcoming = true
        if (rulelist[ruleIdx]?.rule === fallbackRule) {
            rulelist[ruleIdx].duration = rulelist[ruleIdx].songs
                .map(s => s.duration).reduce((p, n) => (p || 0) + (n || 0))
            rulelist[ruleIdx].songs.push(next)
            playFromPlaylist(false)
        } else {
            append({"rule": fallbackRule,
                "songs": [{...next, "upcoming": true}]})
        }
    }
    if (current.stopAfter) {
        next = null
    }
    return {current, next}
}

const decrement = async() => {
    if (pathIdx > 0) {
        pathIdx -= 1
    } else if (ruleIdx > 0) {
        ruleIdx -= 1
        pathIdx = Math.max(rulelist[ruleIdx]?.songs.length - 1, 0)
    } else {
        return
    }
    await playFromPlaylist()
}

const increment = async(user = true) => {
    if (rulelist[ruleIdx]?.songs.length > pathIdx + 1) {
        pathIdx += 1
    } else if (rulelist.length > ruleIdx + 1) {
        ruleIdx += 1
        pathIdx = 0
    } else {
        return
    }
    await playFromPlaylist(user)
}

const decrementSelected = () => {
    if (selectedPathIdx > 0) {
        selectedPathIdx -= 1
    } else if (selectedPathIdx === 0 && rulelist[selectedRuleIdx]?.rule) {
        selectedPathIdx = null
    } else if (selectedRuleIdx > 0) {
        selectedRuleIdx -= 1
        if (rulelist[selectedRuleIdx].open) {
            selectedPathIdx = rulelist[selectedRuleIdx].songs.length - 1
        } else {
            selectedPathIdx = null
        }
    } else if (selectedRuleIdx === null && selectedPathIdx === null) {
        selectedRuleIdx = 0
    } else {
        return
    }
    if (!rulelist[selectedRuleIdx]?.rule) {
        selectedPathIdx = 0
    }
    generatePlaylistView()
    document.querySelector("#playlist-container .selected")?.scrollIntoView({
        "block": "nearest"
    })
}

const incrementSelected = () => {
    if (selectedRuleIdx === null && selectedPathIdx === null) {
        selectedRuleIdx = 0
    } else if (selectedPathIdx === null
    && rulelist[selectedRuleIdx]?.open) {
        selectedPathIdx = 0
    } else if (rulelist[selectedRuleIdx]?.songs.length > selectedPathIdx + 1
    && rulelist[selectedRuleIdx].open) {
        selectedPathIdx += 1
    } else if (rulelist.length > selectedRuleIdx + 1) {
        selectedRuleIdx += 1
        selectedPathIdx = null
    } else {
        return
    }
    if (!rulelist[selectedRuleIdx]?.rule) {
        selectedPathIdx = 0
    }
    generatePlaylistView()
    document.querySelector("#playlist-container .selected")?.scrollIntoView({
        "block": "nearest"
    })
}

const closeSelectedRule = () => {
    if (selectedRuleIdx === null) {
        selectedRuleIdx = 0
    }
    if (rulelist[selectedRuleIdx].rule) {
        rulelist[selectedRuleIdx].open = false
        selectedPathIdx = null
    }
    generatePlaylistView()
}

const openSelectedRule = () => {
    if (selectedRuleIdx === null) {
        selectedRuleIdx = 0
    }
    if (rulelist[selectedRuleIdx].rule && selectedPathIdx === null) {
        rulelist[selectedRuleIdx].open = true
    }
    generatePlaylistView()
}

const playFromPlaylist = async(switchNow = true) => {
    const {current, next} = currentAndNext()
    const {load, queue} = require("./player")
    if (current) {
        if (switchNow) {
            await load(current.path)
            document.getElementById("status-scan").textContent = ""
            const {showLyrics} = require("./songs")
            showLyrics(current.id)
        }
        await queue(next?.path)
        const {displayCurrentSong} = require("./dom")
        await displayCurrentSong(current)
        generatePlaylistView()
        if (switchNow) {
            autoPlayOpts()
        }
    }
}

const append = (item, upNext = false) => {
    if (!item.songs) {
        const {query} = require("./songs")
        item.songs = JSON.parse(JSON.stringify(query(item.rule)))
        if (item.songs.length === 0) {
            return
        }
    }
    if (rulelist.length > 0) {
        if (!upNext || ruleIdx === rulelist.length - 1) {
            rulelist[rulelist.length - 1].songs = rulelist[rulelist.length - 1]
                .songs.filter(s => !s.upcoming)
            if (rulelist[rulelist.length - 1].songs.length === 0) {
                rulelist.pop()
            }
        }
    }
    if (!item.rule) {
        item.open = true
    }
    item.duration = item.songs.map(s => s.duration)
        .reduce((p, n) => (p || 0) + (n || 0))
    if (upNext && ruleIdx !== rulelist.length) {
        rulelist.splice(ruleIdx + 1, 0, item)
    } else {
        rulelist.push(item)
    }
    playFromPlaylist(false)
}

const stopAfterTrack = (track = null) => {
    if (rulelist.length === 0) {
        return
    }
    if (track === "selected") {
        rulelist[selectedRuleIdx].songs[selectedPathIdx].stopAfter
            = !rulelist[selectedRuleIdx].songs[selectedPathIdx].stopAfter
    } else {
        rulelist[ruleIdx].songs[pathIdx].stopAfter
            = !rulelist[ruleIdx].songs[pathIdx].stopAfter
    }
    playFromPlaylist(false)
}

const deleteSelected = () => {
    if (selectedRuleIdx === null) {
        return
    }
    if (selectedRuleIdx === ruleIdx) {
        if (selectedPathIdx === pathIdx || selectedPathIdx === null) {
            return
        }
    }
    if (selectedRuleIdx !== null && selectedPathIdx !== null) {
        if (rulelist[selectedRuleIdx].songs.length === 1) {
            rulelist = rulelist.filter((_, i) => i !== selectedRuleIdx)
            if (ruleIdx > selectedRuleIdx) {
                ruleIdx -= 1
            }
            selectedRuleIdx = Math.max(0, selectedRuleIdx -= 1)
            if (rulelist[selectedRuleIdx]?.open) {
                selectedPathIdx = rulelist[selectedRuleIdx].songs.length - 1
            }
        } else {
            rulelist[selectedRuleIdx].songs = rulelist[
                selectedRuleIdx].songs.filter((_, i) => i !== selectedPathIdx)
            rulelist[selectedRuleIdx].duration = rulelist[
                selectedRuleIdx].songs.map(s => s.duration)
                .reduce((p, n) => (p || 0) + (n || 0))
            if (selectedRuleIdx === ruleIdx && pathIdx > selectedPathIdx) {
                pathIdx -= 1
            }
            selectedPathIdx = Math.max(0, selectedPathIdx -= 1)
        }
    } else if (selectedRuleIdx !== null) {
        rulelist = rulelist.filter((_, i) => i !== selectedRuleIdx)
        if (ruleIdx > selectedRuleIdx) {
            ruleIdx -= 1
        }
        selectedRuleIdx = Math.max(0, selectedRuleIdx -= 1)
        if (rulelist[selectedRuleIdx]?.open) {
            selectedPathIdx = rulelist[selectedRuleIdx].songs.length - 1
        }
    }
    if (!rulelist[selectedRuleIdx]?.open) {
        selectedPathIdx = null
    }
    playFromPlaylist(false)
}

const setFallbackRule = rule => {
    const scanEl = document.getElementById("status-scan")
    if (!` ${rule} `.includes(" order:shuffle ")
    && !` ${rule} `.includes(" order:albumshuffle ")) {
        scanEl.textContent = "Fallback rule "
            + "must have a shuffling order so it can continue forever"
        scanEl.style.color = "var(--tertiary)"
        return
    }
    const {query} = require("./songs")
    const {length} = query(rule)
    if (length < 2) {
        scanEl.textContent
            = "Fallback rule must match at least 2 tracks to work properly"
        scanEl.style.color = "var(--tertiary)"
        return
    }
    if (scanEl.textContent.startsWith("Fallback")) {
        scanEl.textContent = ""
    }
    document.getElementById("fallback-rule").textContent = rule
}

const toggleAutoScroll = () => {
    shouldAutoScrollTrack = !shouldAutoScrollTrack
    document.getElementById("toggle-autoscroll").checked = shouldAutoScrollTrack
    if (shouldAutoScrollTrack) {
        autoPlayOpts("scroll")
    }
}

const toggleAutoClose = () => {
    shouldAutoClose = !shouldAutoClose
    document.getElementById("toggle-autoclose").checked = shouldAutoClose
    if (shouldAutoClose) {
        autoPlayOpts("close")
    }
}

const toggleAutoRemove = () => {
    shouldAutoRemove = !shouldAutoRemove
    document.getElementById("toggle-autoremove").checked = shouldAutoRemove
    if (shouldAutoRemove) {
        autoPlayOpts("remove")
    }
}

const autoPlayOpts = (singleOpt = false) => {
    if (shouldAutoRemove && [false, "remove"].includes(singleOpt)) {
        rulelist = rulelist.filter((_, index) => index >= ruleIdx)
        if (selectedRuleIdx) {
            selectedRuleIdx -= ruleIdx
            if (selectedRuleIdx < 0) {
                selectedRuleIdx = null
                selectedPathIdx = null
            }
            if (!rulelist[selectedRuleIdx]?.open) {
                selectedPathIdx = null
            }
        }
        ruleIdx = 0
        generatePlaylistView()
    }
    if (shouldAutoClose && [false, "close"].includes(singleOpt)) {
        rulelist.forEach((rule, index) => {
            rule.open = index === ruleIdx || !rule.rule
        })
        if (rulelist[selectedRuleIdx] !== rulelist[ruleIdx]) {
            selectedPathIdx = null
        }
        generatePlaylistView()
    }
    if (shouldAutoScrollTrack && [false, "scroll"].includes(singleOpt)) {
        [...document.querySelectorAll("#playlist-container .current")].pop()
            ?.scrollIntoView({"behavior": "smooth", "block": "center"})
    }
}

const exportList = () => {
    const folder = document.getElementById("status-folder").textContent.trim()
    if (folder === "No folder selected") {
        document.getElementById("status-scan").textContent
            = "No folder open yet, nothing to export"
        document.getElementById("status-scan").style.color = "var(--tertiary)"
        return
    }
    let file = ipcRenderer.sendSync("dialog-save", {
        "filters": [{
            "extensions": ["garlmap.json"], "name": "Garlmap JSON Playlist File"
        }],
        "title": "Export playlist"
    })
    if (!file) {
        return
    }
    if (!file.endsWith(".garlmap.json")) {
        file += ".garlmap.json"
    }
    const list = rulelist.map(r => {
        if (r.rule) {
            return {"rule": r.rule}
        }
        return {"songs": r.songs}
    })
    const success = writeJSON(file, {folder, list}, 4)
    if (success) {
        document.getElementById("status-scan").textContent = ""
        document.getElementById("status-scan").style.color = "var(--primary)"
    } else {
        document.getElementById("status-scan").textContent
            = "Failed to save playlist, write error"
        document.getElementById("status-scan").style.color = "var(--tertiary)"
    }
}

const importList = async() => {
    const file = ipcRenderer.sendSync("dialog-open", {
        "filters": [{
            "extensions": ["garlmap.json"], "name": "Garlmap JSON Playlist File"
        }],
        "properties": ["openFile"],
        "title": "Import playlist"
    })?.[0]
    if (!file) {
        return
    }
    const imported = readJSON(file)
    if (!imported?.list || !imported?.folder) {
        document.getElementById("status-scan").textContent
            = "Not a valid Garlmap playlist file"
        document.getElementById("status-scan").style.color = "var(--tertiary)"
        return
    }
    if (!isDirectory(imported.folder)) {
        document.getElementById("status-scan").textContent
            = "Playlist base folder could not be found"
        document.getElementById("status-scan").style.color = "var(--tertiary)"
        return
    }
    const {scanner} = require("./songs")
    await scanner(imported.folder)
    imported.list.filter(r => r?.rule || r?.songs).forEach(append)
}

const clearPlaylist = async() => {
    rulelist = []
    ruleIdx = 0
    selectedRuleIdx = null
    selectedPathIdx = null
    pathIdx = 0
    generatePlaylistView()
    const {displayCurrentSong} = require("./dom")
    await displayCurrentSong({})
    resetWelcome()
}

module.exports = {
    append,
    autoPlayOpts,
    clearPlaylist,
    closeSelectedRule,
    currentAndNext,
    decrement,
    decrementSelected,
    deleteSelected,
    exportList,
    importList,
    increment,
    incrementSelected,
    openSelectedRule,
    playFromPlaylist,
    playSelectedSong,
    setFallbackRule,
    stopAfterTrack,
    toggleAutoClose,
    toggleAutoRemove,
    toggleAutoScroll
}
