/*
*  Garlmap - Gapless Almighty Rule-based Logcal Mpv Audio Player
*  Copyright (C) 2021-2025 Jelmer van Arnhem
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
import {displayCurrentSong, load, queue, stopPlayback} from "./player.js"
import {
    formatTime,
    isDirectory,
    isHTMLInputElement,
    isInputChecked,
    notify,
    queryMatch,
    readFile,
    readJSON,
    writeFile,
    writeJSON
} from "../util.js"
import {generateSongElement, switchFocus} from "./dom.js"
import {getSong, query, scanner} from "./songs.js"
import {resetShowingLyrics, showLyrics} from "./lyrics.js"
import {ipcRenderer} from "electron"

/* eslint-disable jsdoc/require-jsdoc, no-use-before-define */
/** @typedef {import("./songs.js").Song&{
 *   upcoming?: boolean,
 *   stopAfter?: boolean
 * }} RuleSong
 */
/** @typedef {{
 *   rule: string,
 *   songs: RuleSong[],
 *   open: boolean,
 *   upcoming: boolean,
 *   duration?: number,
 * }} Rule
 */

/** @type {Rule[]} */
let rulelist = []
let ruleIdx = 0
let pathIdx = 0
/** @type {number|null} */
let selectedRuleIdx = null
/** @type {number|null} */
let selectedPathIdx = null
/** @type {number|null} */
let upcomingPlaybackRuleIdx = null
/** @type {number|null} */
let upcomingPlaybackPathIdx = null

const generatePlaylistView = () => {
    const playlistEl = document.getElementById("main-playlist")
    if (!playlistEl) {
        return
    }
    playlistEl.textContent = ""
    rulelist.forEach((item, index) => {
        // Main playlist row
        const mainContainer = document.createElement("div")
        mainContainer.className = "rule"
        mainContainer.setAttribute("rule-id", String(index))
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
        mainContainer.append(openImg)
        const title = document.createElement("span")
        title.textContent = item.rule
        mainContainer.append(title)
        const info = document.createElement("span")
        info.textContent = `${item.songs.length} songs - ${
            formatTime(item.duration)}`
        mainContainer.append(info)
        if (item.rule) {
            mainContainer.addEventListener("mousedown", e => {
                if (e.button === 1) {
                    switchFocus("playlist")
                    selectedRuleIdx = index
                    selectedPathIdx = null
                    deleteSelectedPlaylist()
                } else if (queryMatch(e, "img") || e.button === 2) {
                    item.open = !item.open
                    generatePlaylistView()
                } else {
                    switchFocus("playlist")
                    selectedRuleIdx = index
                    selectedPathIdx = null
                    playlistEl.querySelector(".selected")
                        ?.classList.remove("selected")
                    mainContainer.classList.add("selected")
                }
            })
            mainContainer.addEventListener("dblclick", () => {
                item.open = !item.open
                generatePlaylistView()
            })
            playlistEl.append(mainContainer)
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
                songInfo.setAttribute("rule-id", String(index))
                songInfo.setAttribute("path-id", String(songIdx))
                songInfo.addEventListener("mousedown", e => {
                    if (e.button === 1) {
                        switchFocus("playlist")
                        selectedRuleIdx = index
                        selectedPathIdx = songIdx
                        deleteSelectedPlaylist()
                    } else if (e.button === 2) {
                        song.stopAfter = !song.stopAfter
                        playFromPlaylist(false)
                    } else if (queryMatch(e, "img:first-child")) {
                        switchFocus("playlist")
                        if (index === ruleIdx && pathIdx === songIdx) {
                            return
                        }
                        ruleIdx = index
                        pathIdx = songIdx
                        playFromPlaylist()
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
                    if (index === ruleIdx && pathIdx === songIdx) {
                        return
                    }
                    ruleIdx = index
                    pathIdx = songIdx
                    playFromPlaylist()
                })
                if (song.stopAfter) {
                    const stopImg = document.createElement("img")
                    stopImg.src = "../img/eject.png"
                    songInfo.append(stopImg)
                }
                songContainer.append(songInfo)
            })
            playlistEl.append(songContainer)
        }
    })
}

export const playSelectedSong = async() => {
    if (selectedRuleIdx !== null && selectedPathIdx !== null) {
        ruleIdx = selectedRuleIdx
        pathIdx = selectedPathIdx
        await playFromPlaylist()
    }
}

export const currentAndNext = () => {
    const fallbackRule = document.getElementById("fallback-rule")?.textContent
        ?? "order=shuffle"
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
    if (current.stopAfter) {
        return {current, "next": null}
    }
    const playbackOrder = document.getElementById("fallback-rule")
        ?.getAttribute("playback-order")
    const moreThanOne = rulelist.length > 1 || rulelist[0]?.songs?.length > 1
    if (playbackOrder && moreThanOne) {
        const allSongs = rulelist.map((r, idx) => [...r.songs.map(s => {
            const song = JSON.parse(JSON.stringify(s))
            song.idx = idx
            return song
        })]).flat(1)
        if (playbackOrder === "list") {
            upcomingPlaybackRuleIdx = null
            upcomingPlaybackPathIdx = null
            const next = rulelist[ruleIdx]?.songs[pathIdx + 1]
                || rulelist[ruleIdx + 1]?.songs[0]
            return {current, next}
        }
        let next = rulelist[upcomingPlaybackRuleIdx]
            ?.songs?.[upcomingPlaybackPathIdx]
        if (next && next.id !== current.id) {
            return {current, next}
        }
        let randomSong = null
        while (!randomSong || randomSong.id === current.id) {
            randomSong = allSongs.at(Math.random() * allSongs.length)
        }
        upcomingPlaybackRuleIdx = randomSong.idx
        upcomingPlaybackPathIdx = rulelist[randomSong.idx].songs.indexOf(
            rulelist[randomSong.idx].songs.find(s => s.id === randomSong.id))
        next = rulelist[upcomingPlaybackRuleIdx].songs[upcomingPlaybackPathIdx]
        return {current, next}
    }
    let next = rulelist[ruleIdx]?.songs[pathIdx + 1]
        || rulelist[ruleIdx + 1]?.songs[0]
    if (!next) {
        const songs = query(fallbackRule)
        next = JSON.parse(JSON.stringify(songs[songs.indexOf(songs.find(
            s => s.id === current.id)) + 1] || songs[0] || {}))
        if (next?.id) {
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
    }
    return {current, next}
}

export const decrementSong = async() => {
    if (upcomingPlaybackRuleIdx !== null && upcomingPlaybackPathIdx !== null) {
        ruleIdx = upcomingPlaybackRuleIdx
        pathIdx = upcomingPlaybackPathIdx
    } else if (pathIdx > 0) {
        pathIdx -= 1
    } else if (ruleIdx > 0) {
        ruleIdx -= 1
        pathIdx = Math.max(rulelist[ruleIdx]?.songs.length - 1, 0)
    } else {
        return
    }
    await playFromPlaylist()
}

export const incrementSong = async(user = true) => {
    if (upcomingPlaybackRuleIdx !== null && upcomingPlaybackPathIdx !== null) {
        ruleIdx = upcomingPlaybackRuleIdx
        pathIdx = upcomingPlaybackPathIdx
    } else if (rulelist[ruleIdx]?.songs.length > pathIdx + 1) {
        pathIdx += 1
    } else if (rulelist.length > ruleIdx + 1) {
        ruleIdx += 1
        pathIdx = 0
    } else {
        return
    }
    await playFromPlaylist(user)
}

export const decrementSelectedPlaylist = () => {
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
    updateSelectedPlaylist()
}

export const incrementSelectedPlaylist = () => {
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
    updateSelectedPlaylist()
}

const updateSelectedPlaylist = () => {
    const playlistEl = document.getElementById("main-playlist")
    playlistEl?.querySelector(".selected")?.classList.remove("selected")
    if (selectedPathIdx === null) {
        playlistEl?.querySelector(`[rule-id="${selectedRuleIdx}"]`)
            ?.classList.add("selected")
    } else {
        playlistEl?.querySelector(`[rule-id="${selectedRuleIdx}"] [path-id="${
            selectedPathIdx}"]`)?.classList.add("selected")
    }
    playlistEl?.querySelector(".selected")?.scrollIntoView({"block": "nearest"})
}

export const topSelectedPlaylist = () => {
    selectedRuleIdx = null
    selectedPathIdx = null
    if (rulelist.length > 0) {
        selectedRuleIdx = 0
    }
    if (rulelist[selectedRuleIdx] && !rulelist[selectedRuleIdx].rule) {
        selectedPathIdx = 0
    }
    topScroll()
    updateSelectedPlaylist()
}

export const bottomSelectedPlaylist = () => {
    selectedRuleIdx = null
    selectedPathIdx = null
    if (rulelist.length > 0) {
        selectedRuleIdx = rulelist.length - 1
    }
    if (rulelist[selectedRuleIdx]?.songs) {
        if (rulelist[selectedRuleIdx].open || !rulelist[selectedRuleIdx].rule) {
            selectedPathIdx = rulelist[selectedRuleIdx].songs.length - 1
        }
    }
    bottomScroll()
    updateSelectedPlaylist()
}

export const topScroll = () => {
    document.getElementById("main-playlist")?.scrollTo(0, 0)
}

export const bottomScroll = () => {
    document.getElementById("main-playlist")?.scrollTo(
        0, Number.MAX_SAFE_INTEGER)
}

export const closeSelectedRule = () => {
    if (selectedRuleIdx === null) {
        selectedRuleIdx = 0
    }
    if (rulelist[selectedRuleIdx].rule) {
        rulelist[selectedRuleIdx].open = false
        selectedPathIdx = null
    }
    generatePlaylistView()
}

export const openSelectedRule = () => {
    if (selectedRuleIdx === null) {
        selectedRuleIdx = 0
    }
    if (rulelist[selectedRuleIdx].rule && selectedPathIdx === null) {
        rulelist[selectedRuleIdx].open = true
    }
    generatePlaylistView()
}

export const playFromPlaylist = async(switchNow = true) => {
    const {current, next} = currentAndNext()
    if (current) {
        if (switchNow) {
            await load(current.path)
            showLyrics(current.id)
        }
        await queue(next?.path)
        await displayCurrentSong(current)
        generatePlaylistView()
        if (switchNow) {
            autoPlayOpts()
        }
    }
    const upNextEl = document.getElementById("fs-up-next")
    const fullscreenEl = document.getElementById("fullscreen")
    if (next && !current?.stopAfter) {
        if (upNextEl) {
            if (next.title && next.artist) {
                upNextEl.textContent = `Up Next: ${
                    next.title} by ${next.artist}`
            } else {
                upNextEl.textContent = `Up Next: ${next.id}`
            }
        }
        fullscreenEl?.setAttribute("up-next", "yes")
    } else {
        if (upNextEl) {
            upNextEl.textContent = ""
        }
        fullscreenEl?.removeAttribute("up-next")
    }
}

/**
 * Append new a new rule to the queue, either at the end or as the next entry.
 * @param {Partial<Rule>} item
 * @param {boolean} upNext
 * @param {boolean} updateList
 */
export const append = (item, upNext = false, updateList = true) => {
    /** @type {Rule} */
    const rule = {
        "open": !item.rule,
        "rule": item.rule ?? "",
        "songs": item.songs?.map(s => ({...s})) ?? query(item.rule ?? "").map(
            s => ({...s, "stopAfter": false, "upcoming": false})),
        "upcoming": item.upcoming ?? false
    }
    if (rule.songs.length === 1 && !item.songs) {
        append({"songs": rule.songs})
        return
    }
    if (rule.songs.length === 0) {
        return
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
    rule.duration = rule.songs.map(s => s.duration)
        .reduce((p, n) => (p || 0) + (n || 0))
    if (upNext && ruleIdx !== rulelist.length) {
        rulelist.splice(ruleIdx + 1, 0, rule)
    } else {
        rulelist.push(rule)
    }
    if (updateList) {
        playFromPlaylist(false).then(() => {
            autoPlayOpts("scroll")
        })
    }
}

/**
 * Stop playback after either the selected track or the currently playing one.
 * @param {"selected"|null} track
 */
export const stopAfterTrack = async(track = null) => {
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
    await playFromPlaylist(false)
}

export const stopAfterLastTrackOfRule = () => {
    if (rulelist[ruleIdx]) {
        const song = rulelist[ruleIdx].songs.at(-1)
        if (song) {
            song.stopAfter = !song.stopAfter
        }
    }
    playFromPlaylist(false)
}

export const deleteSelectedPlaylist = () => {
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

/**
 * Set the fallback rule to a new query.
 * @param {string} rule
 */
export const setFallbackRule = rule => {
    const filters = rule.split(/(?= \w+[:=])/g).map(p => ({
        "name": p.trim().split(/[:=]/g)[0].toLowerCase(),
        "value": p.trim().split(/[:=]/g)[1]?.toLowerCase()
    }))
    const playback = filters.find(f => f.name === "playback")
    const fallbackEl = document.getElementById("fallback-rule")
    if (playback) {
        if (filters.length > 1) {
            notify("Fallback rule playback can not contain other fields")
        } else if (["shuffle", "list"].includes(playback.value)) {
            if (fallbackEl) {
                fallbackEl.setAttribute("playback-order", playback.value)
                fallbackEl.textContent = rule
            }
            playFromPlaylist(false)
        } else {
            notify("Fallback rule playback value must be shuffle or list")
        }
        return
    }
    if (query(rule).length < 2) {
        notify("Fallback rule must match at least 2 tracks or be playback")
        return
    }
    if (fallbackEl) {
        fallbackEl.removeAttribute("playback-order")
        fallbackEl.textContent = rule
    }
    playFromPlaylist(false)
}

export const toggleAutoScroll = () => {
    const el = document.getElementById("toggle-autoscroll")
    if (isHTMLInputElement(el)) {
        el.checked = !el.checked
    }
    if (isInputChecked("toggle-autoscroll")) {
        autoPlayOpts("scroll")
    }
}

export const toggleAutoClose = () => {
    const el = document.getElementById("toggle-autoclose")
    if (isHTMLInputElement(el)) {
        el.checked = !el.checked
    }
    if (isInputChecked("toggle-autoclose")) {
        autoPlayOpts("close")
    }
}

export const toggleAutoRemove = () => {
    const el = document.getElementById("toggle-autoremove")
    if (isHTMLInputElement(el)) {
        el.checked = !el.checked
    }
    if (isInputChecked("toggle-autoremove")) {
        autoPlayOpts("remove")
    }
}

/**
 * Update the list based on new automatic play options.
 * @param {"remove"|"close"|"scroll"|null} singleOpt
 */
export const autoPlayOpts = (singleOpt = null) => {
    const autoRemove = isInputChecked("toggle-autoremove")
    if (autoRemove && [null, "remove"].includes(singleOpt)) {
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
    const autoClose = isInputChecked("toggle-autoclose")
    if (autoClose && [null, "close"].includes(singleOpt)) {
        rulelist.forEach((rule, index) => {
            rule.open = index === ruleIdx || !rule.rule
        })
        if (rulelist[selectedRuleIdx] !== rulelist[ruleIdx]) {
            selectedPathIdx = null
        }
        generatePlaylistView()
    }
    const autoScroll = isInputChecked("toggle-autoscroll")
    if (autoScroll && [null, "scroll"].includes(singleOpt)) {
        [...document.querySelectorAll("#main-playlist .current")].pop()
            ?.scrollIntoView({"behavior": "smooth", "block": "center"})
    }
}

export const exportList = () => {
    const folder = document.getElementById("status-folder")?.textContent?.trim()
    if (!folder || folder === "No folder selected") {
        notify("No folder open yet, nothing to export")
        return
    }
    ipcRenderer.invoke("dialog-save", {
        "filters": [{
            "extensions": ["garlmap.json"], "name": "Garlmap JSON Playlist File"
        }, {
            "extensions": ["m3u", "m3u8"], "name": "M3U Playlist File"
        }],
        "title": "Export playlist"
    }).then(info => {
        if (!info || info?.canceled) {
            return
        }
        let file = String(info.filePath)
        if (file.endsWith("m3u") || file.endsWith("m3u8")) {
            const list = rulelist.map(r => r.songs).flat(1).map(s => s.path)
            const success = writeFile(file, `#EXTM3U\n${list.join("\n")}\n`)
            if (!success) {
                notify("Failed to save playlist, write error")
            }
            return
        }
        if (!file.endsWith(".garlmap.json")) {
            file += ".garlmap.json"
        }
        const list = rulelist.map(r => {
            if (r.upcoming) {
                return false
            }
            if (r.rule) {
                return {"rule": r.rule}
            }
            if (r.songs) {
                return {"songs": r.songs.map(
                    s => ({"id": s.id, "path": s.path}))}
            }
            return false
        }).filter(r => r)
        const success = writeJSON(file, {folder, list}, 4)
        if (!success) {
            notify("Failed to save playlist, write error")
        }
    })
}

export const clearPlaylist = async() => {
    rulelist = []
    ruleIdx = 0
    selectedRuleIdx = null
    selectedPathIdx = null
    pathIdx = 0
    generatePlaylistView()
    await displayCurrentSong(null)
    resetShowingLyrics()
}

export const importList = () => {
    ipcRenderer.invoke("dialog-open", {
        "filters": [{
            "extensions": ["m3u", "m3u8", "garlmap.json"],
            "name": "Garlmap JSON Playlist File or M3U Playlist File"
        }],
        "properties": ["openFile"],
        "title": "Import playlist"
    }).then(async info => {
        if (!info || info?.canceled) {
            return
        }
        if (info.filePaths[0]?.endsWith(".garlmap.json")) {
            /** @type {Partial<{folder: string, list: Rule[]}>} */
            const imported = readJSON(info.filePaths[0])
            if (!imported?.list || !imported?.folder) {
                notify("Not a valid Garlmap playlist file")
                return
            }
            if (!isDirectory(imported.folder)) {
                notify("Playlist base folder could not be found")
                return
            }
            const currentFolder = document.getElementById("status-folder")
            if (currentFolder?.textContent === imported.folder) {
                await stopPlayback()
                await clearPlaylist()
            } else {
                await scanner(imported.folder)
            }
            imported.list.filter(r => r?.rule || r?.songs).forEach(r => {
                const songs = r.songs?.filter(s => s?.id)
                    .map(s => getSong(s.id, s.path))?.flatMap(s => s ?? [])
                append({"rule": r.rule, songs}, false, false)
            })
            playFromPlaylist(isInputChecked("toggle-autoplay"))
        } else {
            const list = readFile(info.filePaths[0]) || ""
            await clearPlaylist()
            list.split("\n").filter(i => i && !i.startsWith("#")).forEach(i => {
                const song = getSong(i, i)
                if (song?.id) {
                    append({"songs": [song]}, false, false)
                }
            })
            playFromPlaylist(isInputChecked("toggle-autoplay"))
        }
    })
}
