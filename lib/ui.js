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
            format: '[{bar}] {percentage}% | output: "{filename}" | ETA: {eta}s | {value}/{total}',
            align: "left",
            hideCursor: true,
            autopadding: true,
        }, cliProgress.Presets.shades_grey)

        this.settings = settings
        this.currentSetting = currentSetting
        this.settingsFile = settingsFile
    }
    /**
     * 
     * @param {Number} duration Duration of the encoded media
     * @param {String} filename name of the encoding file
     * @param {Boolean} isTwoPass is the encoded media two pass
     * @returns 
     */
    async newBar(encoderOutput) {
        let duration = encoderOutput[0]
        let filename = encoderOutput[1]
        let isTwoPass = encoderOutput[2]
        this.bars.push({
            "bar": this.multibar.create(duration, 0, { speed: "N/A" }),
            "isTwoPass": isTwoPass,
            "isPastHalf": false,
            "filename": filename,
            "duration": duration,
            "finished": false
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
        if (isVideo) {
            const currentTime = chunk.split("time=")[1]?.split(" ")[0]
            if (!currentTime) return
            const arr = currentTime.split(":")
            let seconds = Number.parseFloat(arr[0] * 3600 + arr[1] * 60 + (+arr[2])) // converting to s

            //If 2 pass divide bar into two parts to show both in progress in one progress
            if (this.bars[barIndex].isTwoPass) {
                if (seconds / 2 >= (this.bars[barIndex].duration - 0.2) / 2) this.bars[barIndex].isPastHalf = true

                if (this.bars[barIndex].isPastHalf) this.bars[barIndex].bar.update(Math.round(seconds * 50) / 100 + (this.bars[barIndex].duration / 2), { filename: `${this.bars[barIndex].filename}.webm` })
                else this.bars[barIndex].bar.update(Math.round(seconds * 50) / 100, { filename: `${this.bars[barIndex].filename}.webm` })
            }
            else {
                this.bars[barIndex].bar.update(Math.round(seconds * 100) / 100, { filename: `${this.bars[barIndex].filename}.webm` })
            }
        }
        else {
            const currentTime = chunk.split("time=")[1]?.split(" ")[0]
            if (!currentTime) return
            const arr = currentTime.split(":")
            let seconds = Number.parseFloat(arr[0] * 3600 + arr[1] * 60 + (+arr[2])) // converting to s
            this.bars[barIndex].bar.update(Math.round(seconds * 100) / 100, { filename: `${this.bars[barIndex].filename}.ogg` })
        }
    }

    encodeFinished(barIndex) {
        this.bars[barIndex].fininshed = true
        // if all are finished stop multibars and exit
        for (let i = 0; i < this.bars.length; i++) {
            if (this.bars[i].finished) return
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
    async #menu(settingsFile) {
        let menu = []
        for (let i = 0; i < this.settings.presets.length; i++) {
            menu.push(`${i}. ${this.settings.presets[i].name}`)
        }
        this.term("How to convert: [app] [optional: -preset {Index}] [filename.extension(s)]\n")
        this.term("examples: \n")
        this.term.italic("     DMC -preset 0 file.mp3 file4.mov img.jpg\n")
        this.term.italic("     DMC.exe file34.wav file2.mp3\n\n")
        this.term.yellow("Hello! This menu is for selecting performance/speed preset.\n")
        this.term.yellow("Currently using ").bgMagenta(`"${this.settings.presets[this.settings.currentSetting].name}"`).yellow(" preset")
        this.term.singleColumnMenu(menu, (error, response) => {
            this.settings.currentSetting = response.selectedIndex
            this.term.green("\n Using").green.bold(` ${this.settings.presets[this.settings.currentSetting].name} `).green("setting\n")
            fs.writeFileSync(path.resolve(this.settingsFile, "settings.json"), JSON.stringify(this.settings))
            this.term.grey("Press enter to exit...")
            this.term.inputField(() => { process.exit() })
        })
    }


}

module.exports = { UI }