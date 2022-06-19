const termkit = require("terminal-kit")
const cliProgress = require("cli-progress")
const fs = require("fs")
const path = require("path")
class UI {
    term
    bars = []
    multibar
    settings
    currentSetting
    settingsFile
    constructor(settings, currentSetting, settingsFile) {
        this.term = termkit.terminal

        this.multibar = new cliProgress.MultiBar({
            format: '[{bar}] {percentage}% | output: "{filename}" | ETA: {eta_formatted} | Elapsed: {duration_formatted} | {value}s/{total}s ',
            align: "left",
            hideCursor: true,
            autopadding: true,
        }, cliProgress.Presets.shades_grey)

        this.settings = settings
        this.settingsFile = settingsFile
    }
    /**
     * 
     * @param {Number} duration Duration of the encoded media
     * @param {String} filename name of the encoding file
     * @returns 
     */
    async newBar(encoderOutput) {
        let duration = encoderOutput[0]
        let filename = encoderOutput[1]
        let isTwoPass = encoderOutput[2]
        this.bars.push({
            "bar": this.multibar.create(duration, 0, { speed: "N/A" }),
            "isPastHalf": false,
            "filename": filename,
            "duration": duration,
            "finished": false,
            "isVideo": false
        }
        )
        const barIndex = this.bars.length - 1
        return barIndex
    }

    async updateBar(chunk, barIndex = 0, isVideo = true, isImage = false) {
        if (!chunk) return
        if (isImage) {
            this.bars[barIndex]?.bar.update(1, { filename: `${this.bars[barIndex].filename}.webp` })
            return
        }
        this.bars[barIndex].isVideo = isVideo
        if (isVideo) {
            const currentTime = chunk.split("time=")[1]?.split(" ")[0]
            if (!currentTime) return
            const arr = currentTime.split(":")
            let seconds = Number.parseFloat(arr[0] * 3600 + arr[1] * 60 + (+arr[2])) // converting to s

            if (seconds / 2 >= (this.bars[barIndex].duration - 0.2) / 2) this.bars[barIndex].isPastHalf = true

            if (this.bars[barIndex].isPastHalf) this.bars[barIndex].bar.update(Math.round(seconds * 50) / 100 + (this.bars[barIndex].duration / 2), { filename: `${this.bars[barIndex].filename}.webm` })
            else this.bars[barIndex].bar.update(Math.round(seconds * 50) / 100, { filename: `${this.bars[barIndex].filename}.webm` })

        }
        else {
            const currentTime = chunk.split("time=")[1]?.split(" ")[0]
            if (!currentTime) return
            const arr = currentTime.split(":")
            let seconds = Number.parseFloat(arr[0] * 3600 + arr[1] * 60 + (+arr[2])) // converting to s
            this.bars[barIndex].bar.update(Math.round(seconds * 100) / 100, { filename: `${this.bars[barIndex].filename}.ogg` })
        }
    }

    async encodeFinished(barIndex) {
        this.bars[barIndex].finished = true
        //sets bar to 100%
        const chunk = new Date(this.bars[barIndex].duration * 1000).toISOString().substr(11, 8)
        this.updateBar(chunk, barIndex, this.bars[barIndex].isVideo)
        // if all are finished stop multibars and exit
        for (let i = 0; i < this.bars.length; i++) {
            if (!this.bars[i].finished) return
        }
        this.multibar.stop()
        fs.rm("ffmpeg2pass-0.log", (error) => { error })
        this.term.bold.green("Finished!\n")
        this.term.grey("press enter to exit...\n")
        this.term.inputField(() => { process.exit() })
    }

    async startMenu() {
        await this.#menu()
    }
    #menu() {
        return new Promise(resolve => {
            const menu = ["8 Megabytes", "50 Megabytes (Nitro Classic)", "100 Megabytes (Nitro)"]
            this.term.grey("How to convert: 8mb [filename.extension(s)]\n")
            this.term.grey("examples: \n")
            this.term.italic.grey("     8mb -preset 0 file.mp3 file4.mov img.jpg\n")
            this.term.italic.grey("     8mb file34.wav file2.mp3\n\n")
            this.term.yellow("Hello! This menu is for selecting filesize limit (if using discord nitro)\n")
            this.term.yellow("Currently using ").bgMagenta(`${this.settings.size_limit / 8000} Mb`).yellow(" filesize limit\n")
            this.term.singleColumnMenu(menu, (error, response) => {
                switch (response.selectedIndex) {
                    case 0:
                        this.settings.size_limit = 64000
                        break
                    case 1:
                        this.settings.size_limit = 400000
                        break
                    case 2:
                        this.settings.size_limit = 800000
                        break
                    default:
                        this.settings.size_limit = 64000
                        break
                }
                this.term.green("\n Using").green.bold(` ${this.settings.size_limit / 8000} Mb `).green("setting\n")
                fs.writeFileSync(path.resolve(this.settingsFile, "settings.json"), JSON.stringify(this.settings))
                this.term.grey("Press enter to exit...")
                this.term.inputField(() => { process.exit() })
                resolve()
            })
        })
    }


}

module.exports = { UI }