
# Automatically converts any video into webm, makes sure its 8mb or less!
For all those who want to post memes that are just too big and surpass the 8mb free upload limit on discord, this is the app for you!

This program outputs to following formats:
 - audio codec: opus .ogg
 - video codec: vp9 + opus .webm
 - image codec: vp8 .webp (for gifs too)

![multiencoding](https://user-images.githubusercontent.com/25299243/166849422-5a687ec5-c110-4de9-bbc3-1ded54bbeaa8.gif)

How to install(Windows, Linux, MacOS):
1. get node.js from [here](https://nodejs.org)
2. get ffmpeg for your platform [here](https://ffmpeg.org/download.html), put into $PATH
3. run `npm install -g 8mb` in your favourite terminal
4. execute anywhere using the `8mb [file1] [file2] . . .` command!

For an amazing read on how to optimize vp9 for file sizes I reccomend this read: https://codeberg.org/deterenkelt/Nadeshiko/wiki/Researches%E2%80%89%E2%80%93%E2%80%89VP9-and-overshooting