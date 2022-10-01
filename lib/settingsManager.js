const fs = require("fs")
const path = require("path")

class SettingsManager {

    settings
    currentSetting
    settingsFile = __dirname
    constructor() {
    }

    async start() {
        await this.#init()
    }


    async #init() {
        let settings
        try {
            settings = await this.#getSettings()
        } catch (error) {
            settings = await this.#makeNewSettingsFile()
        }
        this.settings = JSON.parse(settings.toString())
        this.currentSetting = this.settings.size_limit
    }
    async #getSettings() {
        return new Promise((resolve, reject) => {
            const getSettings = fs.readFile(path.resolve(this.settingsFile, "settings.json"), (err, data) => {
                if (err) reject(err)
                resolve(data)
            })
        })
    }
    async #makeNewSettingsFile() {
        const settings = `{
        "size_limit": 64000
        }
        `
        /*const settings = `
{
    "currentSetting": 2,
    "presets": [{
        "name": "Most efficient 8 megabytes of your life",
        "cpuUsed": 0,
        "deadline": "good",
        "bitrateError": 95
    }, {
        "name": "I have some time to kill",
        "cpuUsed": 1,
        "deadline": "good",
        "bitrateError": 95
    }, {
        "name": "Mid",
        "cpuUsed": 3,
        "deadline": "realtime",
        "bitrateError": 90
    }, {
        "name": "I don't like waiting",
        "cpuUsed": 5,
        "deadline": "realtime",
        "bitrateError": 80
    }, {
        "name": "I want it, NOW!",
        "cpuUsed": 6,
        "deadline": "realtime",
        "bitrateError": 70
    }]
}
        `*/
        return new Promise((resolve, reject) => {
            fs.writeFile(path.resolve(this.settingsFile, "settings.json"), settings, (err) => {
                if (err) return
                resolve(settings)
            })
        })
    }
}

module.exports = { SettingsManager }