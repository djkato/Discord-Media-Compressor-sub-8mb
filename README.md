For all those who want to post memes that are just too big and surpass the 8mb free upload limit on discord, this is the app for you!

# Automatically converts any video into webm, makes sure its 8mb or less!

Easy to use: Just drag a file on the executable and off it goes!

![explorer_e0Y0mYI4fH](https://user-images.githubusercontent.com/25299243/166175734-8e0a8783-3bac-4617-8762-db0ddfaa761a.gif)

How to install(Windows with binaries):
1. make a folder in `C:\Program Files` called "DMC", put release binaries and [ffmpeg windows full-build executables](https://github.com/GyanD/codexffmpeg/releases/) into `C:\Program Files\DMC\`
2. Add ffmpeg to PATH: `[Win BTN] + R`, type `SystemPropertiesAdvanced`, click `Environment Variables`, under "User variables for (user)" find variable Path, click on it and edit, in the now open window click `new`, and paste `C:\Program Files\DMC\`. 
3. If the command `ffmpeg` in cmd works, you can now drag and drop files onto the binary and have it work!
4. to set performance preset, doubleclick the binary

How to install(Windows, Linux, MacOS):
1. get node.js from [here](https://nodejs.org)
2. clone repo into any folder you like.
3. run `npm install --save` to get all dependencies
4. run `npm install -g {PATH_TO_PROJECT_FOLDER}`
*might have bugs, currently videos only and windows only. Future plans will include audio: .ogg, and photos: .webm*
