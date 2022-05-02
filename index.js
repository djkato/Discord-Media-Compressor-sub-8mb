const fs = require('fs')
const { exec, execSync } = require('child_process')
const readline = require("readline")
const { stdout, stderr } = require('process')
const cliProgress = require('cli-progress')
const { finished } = require('stream')

//Create terminal readlines

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

//Parse file inputs (Drag n drop or arguments)
inputList = process.argv.slice(2)
input = inputList[0]

file = input.split("\\")
file = file[file.length - 1]

fileType = file.split(".")[1]

if (fileType == "jpg" || fileType == "JPG" || fileType == "png" || fileType == "PNG" || fileType == "webp") {
    //encodePicture(input)
}
else if (fileType == "webm" || fileType == "mp4" || fileType == "mov" || fileType == "mkv" || fileType == "avi") {
    encodeVideo(input, file.split(".")[0])
}
else {
    console.log("Unsupported format")
    rl.question("press enter to exit...", () => { process.exit() })
    process.exit()
}

//create progress bar
const bar1 = new cliProgress.SingleBar({
    synchronousUpdate: true,
    align: "left",
    hideCursor: true
}, cliProgress.Presets.shades_classic)


async function getDuration(file) {
    let result = await ffprobe(file)
    result = result.split("Duration: ")[1].split(",")[0]
    const arr = result.split(":") // splitting the string by colon
    const seconds = arr[0] * 3600 + arr[1] * 60 + (+arr[2]) // converting to s
    return Number.parseFloat(seconds)
}

function ffprobe(file) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe "${file}"`, (error, stdout, stderr) => {
            resolve(stderr)
        })
    })
}

async function encodeVideo(path, out) {
    //Calculates video bitrate to fit right under 8mb @224kb vorbis audio bitrate
    duration = await getDuration(input)
    bitrateLimit = Math.round(7776 / duration)
    console.log(`compressing ${path} to ${out}.webm at ${bitrateLimit}K's`)
    const encoder = exec(`ffmpeg.exe -y -i "${path}" -vcodec libvpx-vp9 -acodec libvorbis -qscale:a 7 -cpu-used 3 -crf 20 -b:v ${bitrateLimit}k -pass 1 -f webm NUL && ffmpeg.exe -y -i "${path}" -vcodec libvpx-vp9 -acodec libvorbis -qscale:a 7 -cpu-used 3 -crf 20 -b:v ${bitrateLimit}k -pass 2 "${out}.webm"`)
    bar1.start(duration, 0, { speed: "N/A" })

    let isPastHalf = false
    encoder.stderr.on("data", (chunk) => {
        currentTime = chunk.split("time=")[1]?.split(" ")[0]
        if (currentTime) {
            const arr = currentTime.split(":") // splitting the string by colon
            let seconds = Number.parseFloat(arr[0] * 3600 + arr[1] * 60 + (+arr[2])) // converting to s

            console.clear()
            console.log(`Encoding ${out}.webm...`)
            //If 2nd pass add that portion in
            if (seconds / 2 >= (duration - 0.2) / 2) isPastHalf = true
            isPastHalf ? bar1.update(Math.round(seconds * 50) / 100 + (duration / 2)) : bar1.update(Math.round(seconds * 50) / 100)
        }
    })
    encoder.on("close", () => {
        console.clear()
        bar1.stop()
        fs.rm("ffmpeg2pass-0.log", (error) => { error })
        console.log("Finished!")
        rl.question("press enter to exit...", () => { process.exit() })
    })
    encoder.on("exit", () => {
        console.clear()
        bar1.stop()
        fs.rm("ffmpeg2pass-0.log", (error) => { error })
        console.log("Finished!")
        rl.question("press enter to exit...", () => { process.exit() })
    })
}
