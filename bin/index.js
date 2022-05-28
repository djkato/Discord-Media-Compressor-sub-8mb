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
//if preset argument go through list from 2 and add argument
if (inputList[0] == "-preset") {
    presetIndexArg = inputList[1]

    for (let i = 2; i < inputList.length; i++) {
        let file
        file = path.resolve(inputList[i])

        filePaths.push(file)

        file = file.split("\\")
        file = file[file.length - 1]
        file = file.split(".")

        fileTypes.push(file[file.length - 1])
        fileNames.push(file[0])
    }
}
else {
    for (let i = 0; i < inputList.length; i++) {
        let file
        file = path.resolve(inputList[i])

        filePaths.push(file)

        file = file.split("\\")
        file = file[file.length - 1]
        file = file.split(".")

        fileTypes.push(file[file.length - 1])
        fileNames.push(file[0])
    }
}


main()

async function main(menu = false) {
    //check if ffmpeg and ffprobe exist
    //get settings
    let settings = new SettingsManager()
    await settings.start(__dirname)
    await checkFF()
    const ui = new UI(settings.settings, settings.currentSetting, settings.settingsFile, filePaths?.length)

    //file checks
    let isListEncodable = true

    if (menu) { savesettings = await ui.startMenu(); isListEncodable = false }

    //check if all files exist
    for (let i = 0; i < filePaths.length; i++) {
        if (!fs.existsSync(filePaths[i])) {
            term.italic(`${filePaths[i]}`).bold.red(" <- Path or File doesn't exist\n")
            term.grey("press enter to exit...")
            isListEncodable = false
            term.inputField(function () { process.exit() })
        }
    }

    //check if all files are valid formats
    if (isListEncodable) {
        for (let i = 0; i < filePaths.length; i++) {
            const fileType = fileTypes[i].toLowerCase()
            if (fileType == "jpg" || fileType == "png" || fileType == "webp" ||
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
        console.log(`Encoding with "${settings.currentSetting.name}" preset...`)
        for (let i = 0; i < filePaths.length; i++) {
            const fileType = fileTypes[i].toLowerCase()
            encoder.push(new Encoder(settings.settings, settings.currentSetting, presetIndexArg))

            if (fileType == "jpg" || fileType == "png" || fileType == "webp") {
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
                    process.exit()
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
                    process.exit()
                    reject()
                })
            }
        })
    })
}