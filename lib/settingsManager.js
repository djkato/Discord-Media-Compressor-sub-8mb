import fs from "fs"
import path from "path"
export class SettingsManager {

    settings
    currentSetting

    constructor() {
    }

    async start() {
        await this.#init()
    }


    async #init() {
        let settings
        settings = await this.#getSettings().catch(async (err) => {
            settings = undefined
        })
        if (!settings) settings = await this.#makeNewSettingsFile()
        this.settings = JSON.parse(settings.toString())
        this.currentSetting = this.settings.presets[this.settings.currentSetting]
    }
    async #getSettings() {
        const dir = __dirname
        console.log(dir)
        return new Promise((resolve, reject) => {
            const getSettings = fs.readFile(path.resolve(dir, "settings.json"), (err, data) => {
                if (err) reject(err)
                resolve(data)
            })
        })
    }
    async #makeNewSettingsFile() {
        const settings = `
        {
    "currentSetting": 3,
    "presets": [{
        "name": "Most efficient 8 megabytes of your life",
        "cpuUsed": 0,
        "deadline": "best",
        "bitrateError": 90,
        "crfMap": [{
            "resolution": 240,
            "crf": 1
        }, {
            "resolution": 360,
            "crf": 1
        }, {
            "resolution": 480,
            "crf": 1
        }, {
            "resolution": 720,
            "crf": 1
        }, {
            "resolution": 1080,
            "crf": 1
        }, {
            "resolution": 1440,
            "crf": 1
        }, {
            "resolution": 2160,
            "crf": 1
        }]
    }, {
        "name": "I have some time to kill",
        "cpuUsed": 1,
        "deadline": "good",
        "bitrateError": 90,
        "crfMap": [{
            "resolution": 240,
            "crf": 20
        }, {
            "resolution": 360,
            "crf": 20
        }, {
            "resolution": 480,
            "crf": 20
        }, {
            "resolution": 720,
            "crf": 20
        }, {
            "resolution": 1080,
            "crf": 17
        }, {
            "resolution": 1440,
            "crf": 15
        }, {
            "resolution": 2160,
            "crf": 10
        }]
    }, {
        "name": "Mid",
        "cpuUsed": 3,
        "deadline": "good",
        "bitrateError": 80,
        "crfMap": [{
            "resolution": 240,
            "crf": 30
        }, {
            "resolution": 360,
            "crf": 30
        }, {
            "resolution": 480,
            "crf": 30
        }, {
            "resolution": 720,
            "crf": 25
        }, {
            "resolution": 1080,
            "crf": 20
        }, {
            "resolution": 1440,
            "crf": 15
        }, {
            "resolution": 2160,
            "crf": 10
        }]
    }, {
        "name": "I don't like waiting",
        "cpuUsed": 4,
        "deadline": 100,
        "bitrateError": 70,
        "crfMap": [{
            "resolution": 240,
            "crf": 45
        }, {
            "resolution": 360,
            "crf": 42
        }, {
            "resolution": 480,
            "crf": 40
        }, {
            "resolution": 720,
            "crf": 35
        }, {
            "resolution": 1080,
            "crf": 30
        }, {
            "resolution": 1440,
            "crf": 25
        }, {
            "resolution": 2160,
            "crf": 20
        }]
    }, {
        "name": "I want it, NOW!",
        "cpuUsed": 4,
        "deadline": "realtime",
        "bitrateError": 60,
        "crfMap": [{
            "resolution": 240,
            "crf": 40
        }, {
            "resolution": 360,
            "crf": 35
        }, {
            "resolution": 480,
            "crf": 30
        }, {
            "resolution": 720,
            "crf": 25
        }, {
            "resolution": 1080,
            "crf": 20
        }, {
            "resolution": 1440,
            "crf": 15
        }, {
            "resolution": 2160,
            "crf": 10
        }]
    }]
}
        `
        return new Promise((resolve, reject) => {
            fs.writeFile("settings.json", settings, () => {
                resolve(settings)
            })
        })
    }
}