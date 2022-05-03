import fs from 'fs'
import { Encoder } from "../lib/encoder.js"
import { UI } from "../lib/ui.js"
import termkit from "terminal-kit"
import { SettingsManager } from "../lib/settingsManager.js"
import path from "path"
//get settings
let settings = new SettingsManager()
await settings.start()
let resolve = path.resolve
let term = termkit.terminal
const ui = new UI(settings.settings, settings.currentSetting)


/**
 * TODO : Adapt audio quality as well to accomodate long videos(Currently 5m is too much)
 *        FIND A WAY TO COMPILE THIS:..
 */

const inputList = process.argv.slice(2)
//if launched without params
if (!inputList[0]) {
    ui.startMenu() //stops program here
}

//Parse file inputs (n Drag n drop or arguments)
let filePaths = [], fileNames = [], fileTypes = []
let presetIndexArg = undefined
//if preset argument go through list from 2 and add argument
if (inputList[0] == "-preset") {
    presetIndexArg = inputList[1]

    for (let i = 2; i < inputList.length; i++) {
        let file
        file = resolve(inputList[i])

        filePaths.push(file)

        file = file.split("\\")
        file = file[file.length - 1]
        file = file.split(".")

        fileTypes.push(file[1])
        fileNames.push(file[0])
    }
}
else {
    for (let i = 0; i < inputList.length; i++) {
        let file
        file = resolve(inputList[i])

        filePaths.push(file)

        file = file.split("\\")
        file = file[file.length - 1]
        file = file.split(".")

        fileTypes.push(file[1])
        fileNames.push(file[0])
    }
}
main()

async function main() {

    //file checks
    let isListEncodable = true
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
            if (fileTypes[i] == "jpg" || fileTypes[i] == "JPG" || fileTypes[i] == "png" || fileTypes[i] == "PNG" || fileTypes[i] == "webp" ||
                fileTypes[i] == "webm" || fileTypes[i] == "mp4" || fileTypes[i] == "mov" || fileTypes[i] == "mkv" || fileTypes[i] == "avi" ||
                fileTypes[i] == "ogg" || fileTypes[i] == "mp3" || fileTypes[i] == "aiff" || fileTypes[i] == "wav" || fileTypes[i] == "flac") {
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
        for (let i = 0; i < filePaths.length; i++) {
            encoder.push(new Encoder(settings.settings, settings.currentSetting, presetIndexArg))
            console.log(`Encoding with "${settings.currentSetting.name}" preset...`)

            if (fileTypes[i] == "jpg" || fileTypes[i] == "JPG" || fileTypes[i] == "png" || fileTypes[i] == "PNG" || fileTypes[i] == "webp") {
                ui.newBar(await encoder[i].encodePicture(filePaths[i], fileNames[i]))
                ui.updateBar("time=00:00:01", i, false, true)
                encoder[i].on("close", () => { ui.encodeFinished(i) })
            }
            else if (fileTypes[i] == "webm" || fileTypes[i] == "mp4" || fileTypes[i] == "mov" || fileTypes[i] == "mkv" || fileTypes[i] == "avi") {
                ui.newBar(await encoder[i].encodeVideo(filePaths[i], fileNames[i]))
                encoder[i].on("update", (chunk) => { ui.updateBar(chunk, i) })
                encoder[i].on("close", () => { ui.encodeFinished(i) })
            }
            else if (fileTypes[i] == "ogg" || fileTypes[i] == "mp3" || fileTypes[i] == "aiff" || fileTypes[i] == "wav" || fileTypes[i] == "flac") {
                ui.newBar(await encoder[i].encodeAudio(filePaths[i], fileNames[i]))
                encoder[i].on("update", (chunk) => { ui.updateBar(chunk, i, false) })
                encoder[i].on("close", () => { ui.encodeFinished(i) })
            }
        }
    }


}