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

const queryMatch = (e, query) => e.composedPath().find(el => {
    try {
        return el.matches(query)
    } catch {
        return false
    }
})

const keyMatch = (e, opts) => e.key === opts.key && e.ctrlKey === !!opts.ctrl
    && e.shiftKey === !!opts.shift && e.altKey === !!opts.alt
    && e.metaKey === !!opts.meta

const formatTime = totalSeconds => {
    let hours = Math.floor(totalSeconds / 3600)
    let minutes = Math.floor((totalSeconds - hours * 3600) / 60)
    let seconds = Math.floor(totalSeconds - hours * 3600 - minutes * 60)
    if (hours < 10) {
        hours = `0${hours}`
    }
    if (minutes < 10) {
        minutes = `0${minutes}`
    }
    if (seconds < 10) {
        seconds = `0${seconds}`
    }
    if (hours === "00") {
        return `&nbsp;${minutes}:${seconds}&nbsp;`
    }
    return `&nbsp;${hours}:${minutes}:${seconds}&nbsp;`
}

module.exports = {queryMatch, keyMatch, formatTime}
