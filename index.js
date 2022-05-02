const fs = require('fs')
const { exec, execSync } = require('child_process')
const cliProgress = require('cli-progress')
const term = require("terminal-kit").terminal

/**
 * TODO : Adapt audio quality as well to accomodate long videos(Currently 5m is too much)
 *        FIND A WAY TO COMPILE THIS:..
 */

//Parse file inputs (Drag n drop or arguments)
inputList = process.argv.slice(2)
input = inputList[0]
let file, fileType, bar1
//if launched without params
if (!input) {
    startMenu()
}
else {
    file = input.split("\\")
    file = file[file.length - 1]

    fileType = file.split(".")[1]

    if (!fs.existsSync(input)) {
        term.italic(`${input}`).bold.red(" <- Path or File doesn't exist\n")
        term.grey("press enter to exit...")
        term.inputField(function () { process.exit() })
    }
    else {
        bar1 = new cliProgress.SingleBar({
            synchronousUpdate: true,
            align: "left",
            hideCursor: true
        }, cliProgress.Presets.shades_classic)

        if (fileType == "jpg" || fileType == "JPG" || fileType == "png" || fileType == "PNG" || fileType == "webp") {
            encodePicture(input, file.split(".")[0])
        }
        else if (fileType == "webm" || fileType == "mp4" || fileType == "mov" || fileType == "mkv" || fileType == "avi") {
            encodeVideo(input, file.split(".")[0])
        }
        else if ("ogg" || "mp3" || "aiff" || "wav" || "flac") {
            encodeAudio(input, file.split(".")[0])
        }
        else {
            term.italic(`${file}`).bold.red(` <- Unsupported format\n`)
            term.grey("press enter to exit...")
            term.inputField(function () { process.exit() })
        }
    }
}

async function encodeVideo(path, out) {
    //create progress bar

    const [command, presetName, duration, isTwoPass] = await constructVideoCommand(path, out)
    bar1.start(duration, 0, { speed: "N/A" })
    let isPastHalf = false
    let encoder = exec(command)
    encoder.stderr.on("data", (chunk) => {
        currentTime = chunk.split("time=")[1]?.split(" ")[0]
        if (currentTime) {
            const arr = currentTime.split(":") // splitting the string by colon
            let seconds = Number.parseFloat(arr[0] * 3600 + arr[1] * 60 + (+arr[2])) // converting to s

            console.clear()
            //If 2nd pass add that portion in
            console.log(`Encoding ${out}.webm with "${presetName}" preset...`)
            if (isTwoPass) {
                if (seconds / 2 >= (duration - 0.2) / 2) isPastHalf = true
                isPastHalf ? bar1.update(Math.round(seconds * 50) / 100 + (duration / 2)) : bar1.update(Math.round(seconds * 50) / 100)
            }
            else {
                bar1.update(Math.round(seconds * 100) / 100)
            }
        }
    })

    encoder.on("close", () => {
        console.clear()
        bar1.stop()
        fs.rm("ffmpeg2pass-0.log", (error) => { error })
        term.bold.green("Finished!\n")
        term.grey("press enter to exit...\n")
        term.inputField(() => { process.exit() })
    })
}
async function encodeAudio(path, out) {
    let [duration, resolution] = await getDurationAndResolution(path)
    const bitrateLimit = Math.round(62000 / duration)

    bar1.start(duration, 0, { speed: "N/A" })

    const encoder = exec(`ffmpeg -y -i "${path}" -c:a libvorbis -b:a ${bitrateLimit}k ${out}.ogg`)

    encoder.stderr.on("data", (chunk) => {
        currentTime = chunk.split("time=")[1]?.split(" ")[0]
        if (currentTime) {
            const arr = currentTime.split(":")
            let seconds = Number.parseFloat(arr[0] * 3600 + arr[1] * 60 + (+arr[2])) // converting to s
            console.clear()
            console.log(`Encoding ${out}.ogg`)
            bar1.update(Math.round(seconds * 100) / 100)
        }
    })
    encoder.on("close", () => {
        console.clear()
        term.bold.green("Finished!\n")
        term.grey("press enter to exit...\n")
        term.inputField(() => { process.exit() })
    })
}

async function encodePicture(path, out) {
    const encoder = exec(`ffmpeg -y -i "${path}" -qscale 80 -compression_level 6 ${out}.webp`)
    encoder.stderr.on("data", (chunk) => {
        console.clear()
        term.yellow(`Encoding ${out}.webp...`)

    })
    encoder.on("close", () => {
        console.clear()
        term.bold.green("Finished!\n")
        term.grey("press enter to exit...\n")
        term.inputField(() => { process.exit() })
    })
}

async function constructVideoCommand(path, out) {

    //gets settings file, if doesnt exist makes a new file and uses those defaults
    let settings = await getSettings().catch(async (err) => {
        settings = undefined
    })
    if (!settings) settings = await makeNewSettingsFile()
    settings = JSON.parse(settings.toString())
    settings = settings.presets[settings.currentSetting]

    let [duration, resolutionHeight] = await getDurationAndResolution(path)
    //Calculates video bitrate to fit right under 8mb @224kb vorbis audio bitrate
    const bitrateLimit = Math.round((62000 - (224 * duration)) / duration)

    let command = ""
    let crfIndex = 0
    let isTwoPass = true
    while (resolutionHeight > settings.crfMap[crfIndex].resolution) {
        crfIndex++
        //if the resolution is still higher, just use highest res
        if (!settings.crfMap[crfIndex]?.resolution) {
            crfIndex--
            break
        }
    }

    for (pass = 1; pass <= 2; pass++) {
        command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libvorbis -qscale:a 7 `
        command += `-deadline ${settings.deadline} `
        command += `-cpu-used ${settings.cpuUsed} `
        if (settings?.minrate) {
            command += `-b:v ${Math.round(bitrateLimit * 0.95)}k `
            command += `-minrate ${Math.round(bitrateLimit / 100 * settings.minrate)}k `
            command += `-maxrate ${bitrateLimit}k `
        }
        else {
            command += `-b:v ${bitrateLimit}k `
            command += `-crf ${settings.crfMap[crfIndex].crf} `
        }
        //realtime doesnt support two pass
        if (settings.deadline == "realtime") {
            command += `-row-mt 1 "${out}.webm"`
            isTwoPass = false
            break
        }
        pass == 1 ? command += `-pass 1 -row-mt 1 -f webm NUL && ` : command += `-pass 2 -row-mt 1 "${out}.webm" `
    }
    return [command, settings.name, duration, isTwoPass]
}

async function getDurationAndResolution(file) {
    let query = await ffprobe(file)
    //duration in seconds
    duration = query.split("Duration: ")[1].split(",")[0]
    const arr = duration.split(":") // splitting the string by colon
    const seconds = arr[0] * 3600 + arr[1] * 60 + (+arr[2]) // converting to s

    //resolution height
    resolutionHeight = query.split("Stream #0:0")[1]?.split(",")[2].split(" ")[1].split("x")[1]

    return [Number.parseFloat(seconds), resolutionHeight]
}

function ffprobe(file) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe "${file}"`, (error, stdout, stderr) => {
            resolve(stderr)
        })
    })
}

function getSettings() {
    return new Promise((resolve, reject) => {
        getSettings = fs.readFile("settings.json", (err, data) => {
            resolve(data)
            reject(err)
        })
    })
}

async function startMenu() {
    console.clear()
    //gets settings file, if doesnt exist makes a new file and uses those defaults
    let settings = await getSettings().catch(async (err) => {
        settings = undefined
    })
    if (!settings) settings = await makeNewSettingsFile()

    settings = JSON.parse(settings.toString())
    let menu = []
    for (i = 0; i < settings.presets.length; i++) {
        menu.push(`${i}. ${settings.presets[i].name}`)
    }
    term.italic("How to convert: [app] [filename.extension]\n")
    term.yellow("Hello! This menu is for selecting performance/speed preset.\n")
    term.yellow("Currently using ").bgMagenta(`"${settings.presets[settings.currentSetting].name}"`).yellow(" preset")
    term.singleColumnMenu(menu, (error, response) => {
        settings.currentSetting = response.selectedIndex
        fs.writeFileSync("settings.json", JSON.stringify(settings))
        term.green("\n Using").green.bold(` ${settings.presets[settings.currentSetting].name} `).green("setting\n")
        term.grey("Press enter to exit...")
        term.inputField(() => { process.exit() })
    })
}

function makeNewSettingsFile() {
    const settings = `
        {
    "currentSetting": 2,
    "presets": [{
            "name": "Most efficient 8 megabytes of your life",
            "cpuUsed": 0,
            "deadline": "best",
            "minrate": 90,
            "crfMap": [{
                    "resolution": 240,
                    "crf": 1
                },
                {
                    "resolution": 360,
                    "crf": 1
                },
                {
                    "resolution": 480,
                    "crf": 1
                },
                {
                    "resolution": 720,
                    "crf": 1
                },
                {
                    "resolution": 1080,
                    "crf": 1
                },
                {
                    "resolution": 1440,
                    "crf": 1
                },
                {
                    "resolution": 2160,
                    "crf": 1
                }
            ]
        },
        {
            "name": "I have some time to kill",
            "cpuUsed": 1,
            "deadline": "good",
            "minrate": 75,
            "crfMap": [{
                    "resolution": 240,
                    "crf": 20
                },
                {
                    "resolution": 360,
                    "crf": 20
                },
                {
                    "resolution": 480,
                    "crf": 20
                },
                {
                    "resolution": 720,
                    "crf": 20
                },
                {
                    "resolution": 1080,
                    "crf": 17
                },
                {
                    "resolution": 1440,
                    "crf": 15
                },
                {
                    "resolution": 2160,
                    "crf": 10
                }
            ]
        },
        {
            "name": "Mid",
            "cpuUsed": 3,
            "deadline": "good",
            "minrate":75,
            "crfMap": [{
                    "resolution": 240,
                    "crf": 30
                },
                {
                    "resolution": 360,
                    "crf": 30
                },
                {
                    "resolution": 480,
                    "crf": 30
                },
                {
                    "resolution": 720,
                    "crf": 25
                },
                {
                    "resolution": 1080,
                    "crf": 20
                },
                {
                    "resolution": 1440,
                    "crf": 15
                },
                {
                    "resolution": 2160,
                    "crf": 10
                }
            ]
        },
        {
            "name": "I don't like waiting",
            "cpuUsed": 4,
            "deadline": 100,
            "minrate": 90,
            "crfMap": [{
                    "resolution": 240,
                    "crf": 45
                },
                {
                    "resolution": 360,
                    "crf": 42
                },
                {
                    "resolution": 480,
                    "crf": 40
                },
                {
                    "resolution": 720,
                    "crf": 35
                },
                {
                    "resolution": 1080,
                    "crf": 30
                },
                {
                    "resolution": 1440,
                    "crf": 25
                },
                {
                    "resolution": 2160,
                    "crf": 20
                }
            ]
        },
        {
            "name": "I want it, NOW!",
            "cpuUsed": 4,
            "deadline": "realtime",
            "minrate": 50,
            "crfMap": [{
                    "resolution": 240,
                    "crf": 40
                },
                {
                    "resolution": 360,
                    "crf": 35
                },
                {
                    "resolution": 480,
                    "crf": 30
                },
                {
                    "resolution": 720,
                    "crf": 25
                },
                {
                    "resolution": 1080,
                    "crf": 20
                },
                {
                    "resolution": 1440,
                    "crf": 15
                },
                {
                    "resolution": 2160,
                    "crf": 10
                }
            ]
        }

    ]
}
        `
    return new Promise((resolve, reject) => {
        fs.writeFile("settings.json", settings, () => {
            resolve(settings)
        })
    })
}