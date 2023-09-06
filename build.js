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
    /**
     * Remove all locales except English US from the build.
     * @param {import("electron-builder").AfterPackContext} context
     */
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
    if (a === "--help") {
        console.info("Basic Garlmap build script, these are its options:")
        console.info(" --all, --linux, --win, --mac")
        console.info("By default it will only build for the current platform.")
        process.exit(0)
    }
    if (a === "--linux" || a === "--all") {
        ebuilder.linux = []
    }
    if (a === "--win" || a === "--all") {
        ebuilder.win = []
    }
    if (a === "--mac" || a === "--all") {
        ebuilder.mac = []
    }
})
builder.build(ebuilder).then(e => console.info(e)).catch(e => console.error(e))
