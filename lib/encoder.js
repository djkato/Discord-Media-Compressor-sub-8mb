const { exec } = require('child_process')

class Encoder {
    currentSetting
    settings
    encoder
    encodePresetIndexArg
    constructor(settings, currentSetting, encodePresetIndexArg = undefined) {
        this.settings = settings
        this.currentSetting = currentSetting
        this.encodePresetIndexArg = encodePresetIndexArg
    }

    /**
     * 
     * @param {String} path absolute path to file
     * @param {String} out output filename
     * @returns [duration, isTwoPass]
     */
    async encodeVideo(path, out) {
        //create progress bar
        const [command, duration, isTwoPass] = await this.#constructVideoCommand(path, out)
        this.encoder = exec(command)
        return [duration, out, isTwoPass]
    }

    /**
     * 
     * @param {String} path absolute path to file
     * @param {String} out output filename
     * @returns duration
     */
    async encodeAudio(path, out) {
        let [duration, resolution] = await this.#getDurationAndResolution(path)
        const videoBitRate = Math.round(62000 / duration)
        this.encoder = exec(`ffmpeg -y -i "${path}" -c:a libvorbis -b:a ${videoBitRate}k ${out}.ogg`)
        return [duration, out, undefined]
    }

    /**
     * 
     * @param {String} path absolute path to file
     * @param {String} out output filename
     */
    async encodePicture(path, out) {
        this.encoder = exec(`ffmpeg -y -i "${path}" -qscale 80 -compression_level 6 ${out}.webp`)
        return [1, out, undefined]
    }

    async #constructVideoCommand(path, out) {
        let [duration, resolutionHeight] = await this.#getDurationAndResolution(path)

        //Calculates video bitrate to fit right under 8mb 2:6 audio:video
        const audioBitRate = Math.round(62000 / 8 * 2 / duration)
        const videoBitRate = Math.round(62000 / 8 * 6 / duration)

        //if command had argument of anotehr quality setting change to use that setting
        if (this.encodePresetIndexArg) {
            this.currentSetting = this.settings.presets[this.encodePresetIndexArg]
        }

        let command = ""
        let crfIndex = 0
        let isTwoPass = true
        //Compares current video height to CRFMAP to determine optimal CRF
        while (resolutionHeight > this.currentSetting.crfMap[crfIndex].resolution) {
            crfIndex++
            //if the resolution is still higher, just use highest res
            if (!this.currentSetting.crfMap[crfIndex]?.resolution) {
                crfIndex--
                break
            }
        }

        for (let pass = 1; pass <= 2; pass++) {
            command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libvorbis `
            command += `-deadline ${this.currentSetting.deadline} `
            command += `-cpu-used ${this.currentSetting.cpuUsed} `
            if (this.currentSetting?.bitrateError) {
                command += `-b:v ${Math.round(videoBitRate / 100 * this.currentSetting.bitrateError)}k `
                command += `-minrate ${Math.round(videoBitRate)}k `
                command += `-maxrate ${videoBitRate}k `
            }
            else {
                command += `-b:v ${videoBitRate}k `
                command += `-b:a ${audioBitRate}k `
                command += `-crf ${this.currentSetting.crfMap[crfIndex].crf} `
            }
            //realtime doesnt support two pass
            if (this.currentSetting.deadline == "realtime") {
                command += `-row-mt 1 "${out}.webm"`
                isTwoPass = false
                break
            }
            pass == 1 ? command += `-pass 1 -row-mt 1 -f webm NUL && ` : command += `-pass 2 -row-mt 1 "${out}.webm" `
        }
        return [command, duration, isTwoPass]
    }

    async #getDurationAndResolution(file) {
        let query = await this.#ffprobe(file)
        //duration in seconds
        const duration = query.split("Duration: ")[1].split(",")[0]
        const arr = duration.split(":") // splitting the string by colon
        const seconds = arr[0] * 3600 + arr[1] * 60 + (+arr[2]) // converting to s

        //resolution height
        const resolutionHeight = query.split("Stream #0:0")[1]?.split(",")[2].split(" ")[1].split("x")[1]

        return [Number.parseFloat(seconds), resolutionHeight]
    }

    #ffprobe(file) {
        return new Promise((resolve, reject) => {
            exec(`ffprobe "${file}"`, (error, stdout, stderr) => {
                resolve(stderr)
            })
        })
    }

    on(channel, callback) {
        switch (channel) {
            case "close":
                this.encoder.on("close", () => {
                    callback(true)
                })
                break
            case "update":
                this.encoder.stderr.on("data", (chunk) => {
                    callback(chunk)
                })
                break
            default:
                throw new Error("Incorrect Channel")
        }

    }
}

module.exports = { Encoder }