import fs from "fs"

export class SettingsManager {

    settings
    currentSetting

    constructor() {
    }

    async start() {
        await this.#init()
    }

    async #init() {
        this.settings = await this.#getSettings().catch(async (err) => {
            this.settings = undefined
        })
        if (!this.settings) this.settings = await this.#makeNewSettingsFile()
        this.settings = JSON.parse(this.settings.toString())
        this.currentSetting = this.settings.presets[this.settings.currentSetting]
    }
    async #getSettings() {
        return new Promise((resolve, reject) => {
            getSettings = fs.readFile("settings.json", (err, data) => {
                resolve(data)
                reject(err)
            })
        })
    }

    async #makeNewSettingsFile() {
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
}