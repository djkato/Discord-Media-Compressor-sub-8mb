const { exec } = require('child_process')
const termkit = require('terminal-kit')

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
        const audioBitRate = Math.round(62000 / duration)
        this.encoder = exec(`ffmpeg -y -i "${path}" -c:a libvorbis -b:a ${audioBitRate}k "${out}.ogg"`)
        return [duration, out, undefined]
    }

    /**
     * 
     * @param {String} path absolute path to file
     * @param {String} out output filename
     */
    async encodePicture(path, out) {
        this.encoder = exec(`ffmpeg -y -i "${path}" -qscale 80 -compression_level 6 "${out}.webp"`)
        return [1, out, undefined]
    }

    async #constructVideoCommand(path, out) {
        let [duration, resolutionHeight] = await this.#getDurationAndResolution(path)

        //Calculates video bitrate to fit right under 8mb 1:7 audio:video. 8Mb * 8 = 64000(8mb) - 1000 for overhead, *0.97 to leave space for container.
        const maxOpusBitrate = 256 //kbits

        let audioBitRate = Math.round((62000 / 8 * 1 / duration) * 0.97)
        let videoBitRate = Math.round((62000 / 8 * 7 / duration) * 0.97)

        //if maxOpusBitrate reached, cap the audio bit rate and give the rest of the bits to video
        if (audioBitRate > maxOpusBitrate) {
            videoBitRate += audioBitRate - maxOpusBitrate
            audioBitRate = maxOpusBitrate
        }
        //if command had argument of anotehr quality setting change to use that setting
        if (this.encodePresetIndexArg) {
            this.currentSetting = this.settings.presets[this.encodePresetIndexArg]
        }

        let command = ""
        let isTwoPass = true
        /* REMOVING CRF AS ITS NO LONGER USED -- REPLACE WITH -qmin equivalent

        //Compares current video height to CRFMAP to determine optimal CRF
        while (resolutionHeight > this.currentSetting.crfMap[crfIndex].resolution) {
            crfIndex++
            //if the resolution is still higher, just use highest res
            if (!this.currentSetting.crfMap[crfIndex]?.resolution) {
                crfIndex--
                break
            }
        }
        */
        //realtime doesnt support two pass, so just use  real time settings
        if (this.currentSetting.deadline == "realtime") {
            command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libopus `
            command += `-deadline ${this.currentSetting.deadline} `
            command += `-quality ${this.currentSetting.deadline} `
            command += `-cpu-used ${this.currentSetting.cpuUsed} `
            command += `-undershoot-pct 0 -overshoot-pct 0 `
            command += `-b:v ${Math.round(videoBitRate / 100 * this.currentSetting.bitrateError)}k `
            command += `-minrate ${Math.round(videoBitRate * 0.5)}k `
            command += `-maxrate ${Math.floor(videoBitRate * 1.4)}k `
            command += `-b:a ${audioBitRate}k `
            command += `-tile-columns 2 -threads 6 `
            command += `-qmax 60 `
            command += `-g 240 `
            command += `-row-mt 1 "${out}.webm" `
            //console.log(command)
            return [command, duration, false]
        }

        //Pass 1 force to have good deadline and cpu-used 1
        command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libopus `
        command += `-deadline good `
        command += `-quality good `
        command += `-cpu-used 1 `
        command += `-undershoot-pct 0 -overshoot-pct 0 `
        command += `-b:v ${Math.round(videoBitRate / 100 * this.currentSetting.bitrateError)}k `
        command += `-minrate ${Math.round(videoBitRate * 0.5)}k `
        command += `-maxrate ${Math.floor(videoBitRate * 1.2)}k `
        command += `-b:a ${audioBitRate}k `
        command += `-auto-alt-ref 6 `
        command += `-qmax 60 `
        command += `-g 240 `

        command += `-row-mt 1 -pass 1 -f webm NUL && `

        //Pass 2 take in settings
        command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libopus `
        command += `-deadline ${this.currentSetting.deadline} `
        command += `-quality ${this.currentSetting.deadline} `
        command += `-cpu-used ${this.currentSetting.cpuUsed} `
        command += `-undershoot-pct 0 -overshoot-pct 0 `
        command += `-b:v ${Math.round(videoBitRate / 100 * this.currentSetting.bitrateError)}k `
        command += `-minrate ${Math.round(videoBitRate * 0.5)}k `
        command += `-maxrate ${Math.floor(videoBitRate * 1.4)}k `
        command += `-b:a ${audioBitRate}k `
        command += `-tile-columns 2 -threads 6 `
        command += `-auto-alt-ref 6 `
        command += `-qmax 60 `
        command += `-g 240 `

        command += `-row-mt 1 -pass 2 "${out}.webm" `
        //console.log(command)
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