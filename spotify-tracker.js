console.log("[Green Extension] spotify tracker loaded");

let spotifySeconds = 0;

function isSpotifyPlaying() {
    //  play/pause button
    const btn = document.querySelector('[data-testid="control-button-playpause"]');
    if (!btn) return false;

    const label = (btn.getAttribute("aria-label") || "").toLowerCase();

    if (
        label.includes("pause") ||     // english
        label.includes("anhalten")     // german PLEASE CHECK IF ITS CORRECT WORD FOR PAUSE
    ) {
        return true; // playing
    }

    return false; // on pause
}

// check every 5 sec
setInterval(() => {
    const playing = isSpotifyPlaying();

    console.log("[Green Extension] spotify playing?", playing);

    if (playing) {
        spotifySeconds += 5;
        console.log("[Green Extension] spotify +5 sec =", spotifySeconds);
    }

    if (spotifySeconds >= 30) {
        chrome.runtime.sendMessage({
            type: "SPOTIFY_PLAY",
            seconds: spotifySeconds
        });

        console.log("[Green Extension] sent SPOTIFY_PLAY:", spotifySeconds, "sec");
        spotifySeconds = 0;
    }
}, 5000);
