const child_process = require("child_process")
const FileHound = require('filehound')

let exec = child_process.exec

let command = "npm run start"
let testFiles = FileHound.create()
    .path("testing ground")
    .findSync()

testFiles.forEach((value, index) => {
    console.log(value, index)
    command += ` "${value}"`
})
console.log(command)
let test = exec(command)
test.stdout.on("data", (chunk) => {
    console.log(chunk)
})
test.stderr.on("data", (chunk) => {
    console.log(chunk)
})

test.on("close", () => {
    console.log("finished")
})