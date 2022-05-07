For all those who want to post memes that are just too big and surpass the 8mb free upload limit on discord, this is the app for you!

# Automatically converts any video into webm, makes sure its 8mb or less!


![multiencoding](https://user-images.githubusercontent.com/25299243/166849422-5a687ec5-c110-4de9-bbc3-1ded54bbeaa8.gif)

![cmd_7he2xYV2XK](https://user-images.githubusercontent.com/25299243/166849534-482cd9f0-6a57-4454-bbca-813167cb9ac2.gif)


How to install(Windows, Linux, MacOS):
1. get node.js from [here](https://nodejs.org)
2. get ffmpeg for your platform [here](https://ffmpeg.org/download.html), put into $PATH
3. run `npm install -g 8mb`
4. execute anywhere using the `8mb [optional: -preset {preset Index}] [file1] [file2] . . .` command!

*Known issues:*
    - videos with huge resolution (1080p+) and high framerate struggle to encode under 8mb even if less than a few minutes long
    - really long videos fail to get under 8mb





>*NOT WORKING RN, TERMKIT REFUSES TO COMPILE*
>How to install(Windows with binaries):
>1. make a folder in `C:\Program Files` called "DMC", put release binaries and [ffmpeg windows full-build executables](https://github.com/GyanD/codexffmpeg/releases/) into `C:\Program Files\DMC\`
>2. Add ffmpeg to PATH: `[Win BTN] + R`, type `SystemPropertiesAdvanced`, click `Environment Variables`, under "User variables for (user)" find variable Path, click on it and edit, in the now open window click `new`, and paste `C:\Program Files\DMC\`. 
>3. If the command `ffmpeg` in cmd works, you can now drag and drop files onto the binary and have it work!
>4. to set performance preset, doubleclick the binary
