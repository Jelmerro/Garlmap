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

let rulelist = []
let ruleIdx = 0
let selectedRuleIdx = null
let selectedPathIdx = null
let pathIdx = 0

const {formatTime, queryMatch} = require("../util")

const generatePlaylistView = () => {
    document.getElementById("main-playlist").textContent = ""
    rulelist.forEach((item, index) => {
        // Main playlist row
        const mainContainer = document.createElement("div")
        mainContainer.className = "rule"
        if (index === ruleIdx) {
            mainContainer.className = "rule current"
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
                    // TODO delete rule
                } else if (queryMatch(e, "img") || e.button === 2) {
                    item.open = !item.open
                    generatePlaylistView()
                } else {
                    switchFocus("playlist")
                    selectedRuleIdx = index
                    selectedPathIdx = null
                    generatePlaylistView()
                }
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
                        // TODO delete song
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
                        generatePlaylistView()
                    }
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
            "songs": [current,
                {...songs[songs.indexOf(current) + 1], "upcoming": true}],
            "rule": fallbackRule
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
            s => s.path === current.path) + 1)] || songs[0]))
        next.upcoming = true
        if (rulelist[ruleIdx]?.rule === fallbackRule) {
            rulelist[ruleIdx].duration = rulelist[ruleIdx].songs
                .map(s => s.duration).reduce((p, n) => (p || 0) + (n || 0))
            rulelist[ruleIdx].songs.push(next)
            playFromPlaylist(false)
        } else {
            append({"songs": [{...next, "upcoming": true}],
                "rule": fallbackRule})
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
    if (rulelist[selectedRuleIdx].rule) {
        rulelist[selectedRuleIdx].open = false
        selectedPathIdx = null
    }
    generatePlaylistView()
}

const openSelectedRule = () => {
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
        }
        await queue(next?.path)
        const {displayCurrentSong} = require("./dom")
        await displayCurrentSong(current)
        generatePlaylistView()
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

module.exports = {
    playFromPlaylist,
    increment,
    decrement,
    incrementSelected,
    decrementSelected,
    closeSelectedRule,
    openSelectedRule,
    currentAndNext,
    append,
    playSelectedSong,
    stopAfterTrack,
    deleteSelected,
    setFallbackRule
}
