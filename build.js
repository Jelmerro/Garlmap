/*
*  Garlmap - Gapless Almighty Rule-based Logical Mpv Audio Player
*  Copyright (C) 2021-2024 Jelmer van Arnhem
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
import {readdir, rmSync, unlinkSync} from "node:fs"
import {build} from "electron-builder"
import {execSync} from "node:child_process"

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
    },
    "appId": "com.github.Jelmerro.garlmap",
    "copyright": "Copyright @ Jelmer van Arnhem | "
        + "Licensed as free software (GPL-3.0 or later)",
    "deb": {
        "afterInstall": "./after-install.sh",
        "fpm": ["--after-upgrade=./after-install.sh", "-d mpv"]
    },
    "files": [
        "app/img/*.png",
        "app/img/icon/1024x1024.png",
        "app/*.js",
        "app/renderer/*"
    ],
    "linux": {
        "category": "Audio;AudioVideo;Player;",
        "executableArgs": ["--ozone-platform-hint=auto"],
        "executableName": "garlmap",
        "icon": "app/img/icon",
        "maintainer": "Jelmer van Arnhem",
        "publish": null,
        "target": [
            {"arch": ["arm64", "x64"], "target": "AppImage"},
            {"arch": ["arm64", "x64"], "target": "deb"},
            {"arch": ["arm64", "x64"], "target": "pacman"},
            {"arch": ["arm64", "x64"], "target": "rpm"},
            {"arch": ["x64"], "target": "snap"},
            {"arch": ["arm64", "x64"], "target": "tar.gz"}
        ]
    },
    "mac": {
        "category": "public.app-category.music",
        "icon": "app/img/icon",
        "publish": null,
        "target": [
            {"arch": ["arm64", "x64"], "target": "zip"}
        ]
    },
    "nsis": {
        "differentialPackage": false,
        "license": "LICENSE",
        "oneClick": false
    },
    "pacman": {"fpm": ["-d mpv"]},
    "productName": "Garlmap",
    "rpm": {
        "afterInstall": "./after-install.sh",
        "fpm": [
            "--rpm-rpmbuild-define=_build_id_links none",
            "--after-upgrade=./after-install.sh",
            "-d mpv"
        ]
    },
    "win": {
        "icon": "app/img/icon/512x512.png",
        "legalTrademarks": "Copyright @ Jelmer van Arnhem | "
            + "Licensed as free software (GPL-3.0 or later)",
        "publish": null,
        "target": [
            {"arch": ["x64"], "target": "nsis"},
            {"arch": ["x64"], "target": "portable"},
            {"arch": ["arm64", "x64"], "target": "zip"}
        ]
    }
}}
process.argv.slice(2).forEach(a => {
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
rmSync("dist/", {"force": true, "recursive": true})

/** Apply new buildroot argument to electron-builder's internal outdated fpm. */
const fixBuildrootRpmArgumentInFpm = async() => {
    try {
        console.info(">> PATCH buildroot arg missing in electron-builder's fpm")
        execSync(
            `sed -i -e 's/args = \\["rpmbuild", "-bb"\\]/args = \\["rpmbuild", `
            + `"-bb", "--buildroot", "#{build_path}\\/BUILD"\\]/g' ~/.cache/ele`
            + `ctron-builder/fpm/fpm*/lib/app/lib/fpm/package/rpm.rb`)
        console.info(">> PATCH done")
        return
    } catch {
        console.warn(">> PATCH failed, running dummy build to fetch fpm")
    }
    try {
        // Running dummy build that will fail due to incorrect outdated args.
        await build({
            "config": {
                ...ebuilder.config,
                "files": ebuilder.files,
                "linux": {
                    ...ebuilder.config.linux,
                    "target": {"arch": ["x64"], "target": "rpm"}
                }
            },
            "linux": []
        })
    } catch {
        // Applying fix again when dummy build fails.
        execSync(
            `sed -i -e 's/args = \\["rpmbuild", "-bb"\\]/args = \\["rpmbuild", `
            + `"-bb", "--buildroot", "#{build_path}\\/BUILD"\\]/g' ~/.cache/ele`
            + `ctron-builder/fpm/fpm*/lib/app/lib/fpm/package/rpm.rb`)
        console.info(">> PATCH done")
    } finally {
        rmSync("dist/", {"force": true, "recursive": true})
    }
}

const rpmConf = ebuilder.config.linux?.target?.find(t => t.target === "rpm")
if (rpmConf) {
    await fixBuildrootRpmArgumentInFpm(ebuilder)
}
build(ebuilder).then(e => console.info(e)).catch(e => console.error(e))
