const { exec } = require('child_process')
const termkit = require('terminal-kit')

class Encoder {
    settings
    encoder
    #maxOpusBitrate = 256 //kbits
    #minOpusBitrate = 50 //kbits
    constructor(settings, currentSetting) {
        this.settings = settings
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
        let audioBitRate = Math.round(this.settings.size_limit / duration)
        if (audioBitRate > this.#maxOpusBitrate) {
            audioBitRate = this.#maxOpusBitrate
        }
        this.encoder = exec(`ffmpeg -y -i "${path}" -c:a libvorbis -b:a ${audioBitRate}k "${out}.ogg"`)
        console.log(`ffmpeg -y -i "${path}" -c:a libvorbis -b:a ${audioBitRate}k "${out}.ogg"`)
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

        //Calculates video bitrate to fit right under 8mb 1:7 audio:video. 8Mb * 8 = 64000(8mb) - 1000 for overhead, *0.95 to leave space for container.

        let audioBitRate = Math.round((this.settings.size_limit / 8 * 1 / duration) * 0.95)
        let videoBitRate = Math.round((this.settings.size_limit / 8 * 7 / duration) * 0.95)
        //if this.#maxOpusBitrate reached, cap the audio bit rate and give the rest of the bits to video
        if (audioBitRate > this.#maxOpusBitrate) {
            videoBitRate += audioBitRate - this.#maxOpusBitrate
            audioBitRate = this.#maxOpusBitrate
        }
        else if (audioBitRate < this.#minOpusBitrate) {
            videoBitRate = Math.round(((this.settings.size_limit - this.#minOpusBitrate * duration) / duration) * 0.95)
            audioBitRate = this.#minOpusBitrate
        }

        let command = ""
        let outputHeight
        //resolution limiter based on video length.
        resolutionHeight >= 480 && duration > 900 ?
            outputHeight = 480 :
            resolutionHeight >= 720 && duration > 600 ?
                outputHeight = 720 :
                resolutionHeight >= 1080 && duration > 150 ?
                    outputHeight = 1080 : outputHeight = resolutionHeight

        //realtime doesnt support two pass, so just use real time settings
        /**
         * REMOVING SUPPORT FOR REALTIME, IMPOSSIBLE TO HAVE RT SPEED AND AIM AT 8MB
         * 
         */
        // if (this.currentSetting.deadline == "realtime") {
        //     command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libopus `
        //     command += `-deadline ${this.currentSetting.deadline} `
        //     command += `-quality ${this.currentSetting.deadline} `
        //     command += `-cpu-used ${this.currentSetting.cpuUsed} `
        //     command += `-undershoot-pct 0 -overshoot-pct 0 `
        //     command += `-b:v ${Math.round(videoBitRate / 100 * this.currentSetting.bitrateError)}k `
        //     command += `-minrate ${Math.round(videoBitRate * 0.5)}k `
        //     command += `-maxrate ${Math.floor(videoBitRate * 1.4)}k `
        //     command += `-b:a ${audioBitRate}k `
        //     command += `-tile-columns 2 -threads 6 `
        //     command += `-qmax 60 `
        //     command += `-g 240 `
        //     command += `-row-mt 1 "${out}.webm" `
        //     //console.log(command)
        //     return [command, duration, false]
        // }

        //Pass 1 force to have good deadline and cpu-used 1
        command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libopus `
        command += `-vf scale=-1:${outputHeight} `
        command += `-deadline good `
        command += `-quality good `
        command += `-cpu-used 0 `
        command += `-undershoot-pct 0 -overshoot-pct 0 `
        command += `-b:v ${Math.round(videoBitRate)}k `
        command += `-minrate ${Math.round(videoBitRate * 0.5)}k `
        command += `-maxrate ${Math.floor(videoBitRate * 1.45)}k `
        command += `-b:a ${audioBitRate}k `
        command += `-row-mt 1 -tile-rows 2 `
        command += `-tile-columns 4 -threads 32 `
        command += `-auto-alt-ref 6 `
        command += `-qmax 60 `
        command += `-g 240 `

        command += `-pass 1 -f webm NUL && `

        //Pass 2 take in settings
        command += `ffmpeg -y -i "${path}" -vcodec libvpx-vp9 -acodec libopus `
        command += `-vf scale=-1:${outputHeight} `
        command += `-deadline good `
        command += `-quality good `
        command += `-cpu-used 0 `
        command += `-undershoot-pct 0 -overshoot-pct 0 `
        command += `-b:v ${Math.round(videoBitRate)}k `
        command += `-minrate ${Math.round(videoBitRate * 0.5)}k `
        command += `-maxrate ${Math.floor(videoBitRate * 1.45)}k `
        command += `-b:a ${audioBitRate}k `
        command += `-row-mt 1 -tile-rows 2 `
        command += `-tile-columns 4 -threads 32 `
        command += `-auto-alt-ref 6 `
        command += `-qmax 60 `
        command += `-g 240 `

        command += `-pass 2 "${out}.webm" `
        return [command, duration]
    }

    async #getDurationAndResolution(file) {
        let query = await this.#ffprobe(file)
        //duration in seconds
        const duration = query.split("Duration: ")[1].split(",")[0]
        const arr = duration.split(":") // splitting the string by colon
        const seconds = arr[0] * 3600 + arr[1] * 60 + (+arr[2]) // converting to s

        //resolution height
        let resolutionHeight = query.split("Stream #0:0")[1].split("kb/s")[0].split(",")
        resolutionHeight = Number.parseInt(resolutionHeight[resolutionHeight.length - 2].split("x")[1])
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