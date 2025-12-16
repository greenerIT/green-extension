
let watchedBufferSeconds = 0;


setInterval(() => {
    const video = document.querySelector('video');

    if (video && !video.paused && !video.ended && video.currentTime > 0) {
        watchedBufferSeconds += 5;
    }


    if (watchedBufferSeconds >= 10) {
        chrome.runtime.sendMessage({
            type: 'YOUTUBE_WATCH',
            seconds: watchedBufferSeconds
        
        });

        watchedBufferSeconds = 0;
    }
}, 5000);
