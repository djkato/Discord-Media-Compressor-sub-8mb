#!/usr/bin/env node
const fs = require('fs')
const path = require("path")
const termkit = require("terminal-kit")
const { Encoder } = require("../lib/encoder.js")
const { UI } = require("../lib/ui.js")
const { SettingsManager } = require("../lib/settingsManager.js")
const { exec } = require('child_process')
let term = termkit.terminal

/**
 * TODO : FIND A WAY TO COMPILE THIS:..
 *        
 */

const inputList = process.argv.slice(2)
//if launched without params
if (!inputList[0]) {
    main(true)
}

//Parse file inputs (n Drag n drop or arguments)
let filePaths = [], fileNames = [], fileTypes = []
let presetIndexArg = undefined

for (let i = 0; i < inputList.length; i++) {
    let file
    file = path.resolve(inputList[i])

    filePaths.push(file)

    file = file.split("\\")
    file = file[file.length - 1]
    const dot_index = file.lastIndexOf(".")
    const file_name = file.slice(0, dot_index)
    const file_type = file.slice(dot_index + 1)

    fileTypes.push(file_type)
    fileNames.push(file_name)
}

main()

async function main(menu = false) {
    //get settings
    let settings = new SettingsManager()
    await settings.start(__dirname)
    //check if ffmpeg and ffprobe exist
    try {
        const check = await checkFF()
    } catch (reject) {
        process.exit()
    }
    const ui = new UI(settings.settings, settings.currentSetting, settings.settingsFile, filePaths?.length)

    //file checks
    let isListEncodable = true

    if (menu) {
        isListEncodable = false
        savesettings = await ui.startMenu()
    }

    //check if all files exist
    if (isListEncodable) {
        for (let i = 0; i < filePaths.length; i++) {
            if (!fs.existsSync(filePaths[i])) {
                term.italic(`${filePaths[i]}`).bold.red(" <- Path or File doesn't exist\n")
                term.grey("press enter to exit...")
                isListEncodable = false
                term.inputField(function () { process.exit() })
            }
        }
    }
    //check if all files are valid formats
    if (isListEncodable) {
        for (let i = 0; i < filePaths.length; i++) {
            const fileType = fileTypes[i].toLowerCase()
            if (fileType == "jpg" || fileType == "png" || fileType == "webp" || fileType == "exr" ||
                fileType == "webm" || fileType == "mp4" || fileType == "mov" || fileType == "mkv" || fileType == "avi" ||
                fileType == "ogg" || fileType == "mp3" || fileType == "aiff" || fileType == "wav" || fileType == "flac") {
            }
            else {
                term.italic(`${fileTypes[i]}`).bold.red(` <- Unsupported format\n`)
                term.grey("press enter to exit...")
                isListEncodable = false
                term.inputField(function () { process.exit() })
            }
        }
    }
    //start encoding all
    if (isListEncodable) {
        let encoder = []
        console.log(`Encoding to ${settings.settings.size_limit / 8000} Mb...`)
        for (let i = 0; i < filePaths.length; i++) {
            const fileType = fileTypes[i].toLowerCase()
            encoder.push(new Encoder(settings.settings))

            if (fileType == "jpg" || fileType == "png" || fileType == "webp" || fileType == "exr") {
                ui.newBar(await encoder[i].encodePicture(filePaths[i], fileNames[i]))
                encoder[i].on("update", (chunk) => { ui.updateBar(chunk, i, false, true) })
                encoder[i].on("close", () => { ui.encodeFinished(i) })
            }
            else if (fileType == "webm" || fileType == "mp4" || fileType == "mov" || fileType == "mkv" || fileType == "avi") {
                ui.newBar(await encoder[i].encodeVideo(filePaths[i], fileNames[i]))
                encoder[i].on("update", (chunk) => { ui.updateBar(chunk, i) })
                encoder[i].on("close", () => { ui.encodeFinished(i) })
            }
            else if (fileType == "ogg" || fileType == "mp3" || fileType == "aiff" || fileType == "wav" || fileType == "flac") {
                ui.newBar(await encoder[i].encodeAudio(filePaths[i], fileNames[i]))
                encoder[i].on("update", (chunk) => { ui.updateBar(chunk, i, false) })
                encoder[i].on("close", () => { ui.encodeFinished(i) })
            }
        }
    }
}

async function checkFF() {
    //check if ffmpeg installed and working
    return new Promise(async (resolve, reject) => {
        const test = exec(`ffprobe`)
        test.stderr.on("data", (chunk) => {
            if (chunk.substring(0, 15) == "ffprobe version") {
                resolve()
            }
            else {
                term.red("\nError using ffprobe, please make sure ffprobe is installed and working from terminal.\n")
                term.blue.underline("https://ffmpeg.org/download.html\n")
                term.grey("press enter to exit...")
                term.inputField(function () {
                    reject()
                })
            }
        })
        const test2 = exec(`ffmpeg`)
        test2.stderr.on("data", (chunk) => {
            if (chunk.substring(0, 14) == "ffmpeg version") {
                resolve()
            }
            else {
                term.red("\nError using ffmpeg, please make sure ffmpeg is installed and working from terminal.\n")
                term.blue.underline("https://ffmpeg.org/download.html\n")
                term.grey("press enter to exit...\n")
                term.inputField(function () {
                    reject()
                })
            }
        })
    })
}