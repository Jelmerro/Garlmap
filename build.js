/*
*  Garlmap - Gapless Almighty Rule-based Logical Mpv Audio Player
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

const builder = require("electron-builder")
const {rmSync, readdir, unlinkSync} = require("fs")
const ebuilder = {"config": {
    "afterPack": context => {
        const localeDir = `${context.appOutDir}/locales/`
        readdir(localeDir, (_err, files) => {
            files?.filter(f => !f.match(/en-US\.pak/))
                .forEach(f => unlinkSync(localeDir + f))
        })
    }
}}

rmSync("dist/", {"force": true, "recursive": true})
process.argv.slice(1).forEach(a => {
    if (a === "--linux") {
        ebuilder.linux = []
    }
    if (a === "--win") {
        ebuilder.win = []
    }
    if (a === "--mac") {
        ebuilder.mac = []
    }
})
builder.build(ebuilder).then(e => console.info(e)).catch(e => console.error(e))
