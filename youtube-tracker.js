
let watchedBufferSeconds = 0;

// every 5 sec check if video is running
setInterval(() => {
    const video = document.querySelector('video');

    if (video && !video.paused && !video.ended && video.currentTime > 0) {
        watchedBufferSeconds += 5;
    }

    // update total number every 30 sec
    if (watchedBufferSeconds >= 30) {
        chrome.runtime.sendMessage({
            type: 'YOUTUBE_WATCH',
            seconds: watchedBufferSeconds
        });

        watchedBufferSeconds = 0;
    }
}, 5000);
