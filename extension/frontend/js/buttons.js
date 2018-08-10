var storage = chrome.storage.local;

/* Plays audio with given id.
playlist is the name of the playlist which the audio belongs to, or null if it
is not a playlist song.
mainPlay is true iff the audio was played by pressing the main play button. */
var playAudio = function(id, playlist, mainPlay){
    storage.get("active_playlist", function (current){
        var diffPlaylists = true;
        if (Object.keys(current).length !== 0 && playlist === current.active_playlist){
            diffPlaylists = false;
        }
        chrome.extension.sendMessage({message: "play", id: id, playlistName: playlist, mainPlay: mainPlay, different: diffPlaylists}, function(response){
            switch (response.message){
                case "played":
                    changePlayButton(id, "pause");
                    break;
                case "paused":
                    changePlayButton(id, "play");
                    break;
            }
            document.getElementById("scrubber").removeAttribute("style");
            updateDisplay();
        });
    });
};

var changePlayButton = function(id, changeTo){
    var items = document.getElementsByClassName("item");
    var main_play_button = document.getElementById("main_play");
    var classes;
    for (var i = 0; i < items.length; i++){
        var button = items[i].getElementsByTagName("div")[0];
        if(button.getAttribute("code") === id){
            if (changeTo === "pause"){
                classes = "pause_button music_button";
                button.className = classes;
            } else if (changeTo === "play"){
                classes = "play_button music_button";
                button.className = classes;
            }
        }
    }
    if (changeTo === "pause") main_play_button.className = "pause_button music_button";
    else main_play_button.className = "play_button music_button";
};

// updates the current playing title and its duration
var updateDisplay = function(){
    storage.get("nowPlayingTitle", function(title){
        var slider = document.getElementById("now_playing").getElementsByTagName("p")[0];
        if (title.nowPlayingTitle){
            slider.visibility = "visible";
            slider.innerHTML = title.nowPlayingTitle;
        } else {
            slider.visibility = "hidden";
        }
    });
    storage.get("duration", function(result){
        var duration = document.getElementById("duration");
        var videoTime = document.getElementById("video_time");
        if (result.duration){
            videoTime.visibility = "visible";
            duration.innerHTML = " / " + timeFormat(result.duration);
            var currentTime = document.getElementById("current_time").innerHTML;
            if (currentTime === "") document.getElementById("current_time").innerHTML = "0:00";
        } else {
            videoTime.visibility = "hidden";
        }
    });
};

var updateScrubber = function(percent){
    document.getElementById("scrubber").value = percent;
};

var updateCurrentTimeDisplay = function(seconds){
    if (document.getElementById("duration").innerHTML !== ""){
        var currentTime = document.getElementById("current_time");
        currentTime.innerHTML = timeFormat(seconds);
    }
};

// converts seconds into hrs:min:secs
var timeFormat = function (timeInSeconds){
    var remainingSeconds = Math.round(timeInSeconds);
    var seconds = remainingSeconds % 60;
    var secondsStr = seconds < 10 ? "0" + seconds : seconds;
    remainingSeconds -= seconds;

    var minutes = remainingSeconds / 60 % 60;
    remainingSeconds -= minutes * 60;
    
    var hours = remainingSeconds / 60 / 60;

    var minsStr = minutes < 10 && hours > 0 ? "0" + minutes : minutes;
    var hoursStr = hours > 0 ? hours + ":" : "";

    return hoursStr + minsStr + ":" + secondsStr;
};

var updateAllButtons = function(){
    var currentlyPlaying = false;
    var playButtons = document.getElementsByClassName("play_button");
    var pauseButtons = document.getElementsByClassName("pause_button");
    var buttons = [];
    buttons.push.apply(buttons, playButtons);
    buttons.push.apply(buttons, pauseButtons);
    // remove the main play button from the array
    var mainButton = document.getElementById("main_play");
    var index = buttons.indexOf(mainButton);
    buttons.splice(index, 1);
    storage.get("nowPlayingId", function(nowPlaying){
        var playingId = null;
        if (Object.keys(nowPlaying).length !== 0){
            playingId = nowPlaying.nowPlayingId;
            // update play/pause buttons
            for (var i = 0; i < buttons.length; i++){
                var thisId = buttons[i].getAttribute("code");
                if (playingId !== thisId) buttons[i].className = "play_button music_button";
                else {
                    buttons[i].className = "pause_button music_button";
                    currentlyPlaying = true;
                }
            }
            if (currentlyPlaying) mainButton.className = "pause_button music_button";
            else mainButton.className = "play_button music_button";
        } else {
            changePlayButton(null, "play");
            for (var i = 0; i < buttons.length; i++){
                buttons[i].className = "play_button music_button";
            }
        }
    });
};

document.getElementById("vol_control").onchange = function(e){
    var volume = e.target.valueAsNumber;
    chrome.extension.sendMessage({message: "volume", volume: volume});
};

document.getElementById("vol_control").oninput = function(e){
    var volume = e.target.valueAsNumber;
    chrome.extension.sendMessage({message: "volume", volume: volume});
};

document.getElementById("scrubber").onchange = function(e){
    var value = e.target.valueAsNumber;
    chrome.extension.sendMessage({message: "scrub", value: value});
};

document.getElementById("main_play").onclick = function(){
    storage.get("nowPlayingId", function(id){
        if (id.nowPlayingId){
            playAudio(id.nowPlayingId, null, true);
            updateAllButtons();
        }
    });
};

document.getElementsByClassName("skip_button")[0].onclick = function(){
    chrome.extension.sendMessage({message: "playNext"});
};

document.getElementsByClassName("previous_button")[0].onclick = function(){
    chrome.extension.sendMessage({message: "playPrev"});
};

// create port with background to receive messages
var port = chrome.extension.connect({name: "background"});
port.onMessage.addListener(function(json){
    switch (json.message){
        case "music state playing":
            updateDisplay();
            updateAllButtons();
            storage.get("nowPlayingId", function(nowPlaying){
                if (Object.keys(nowPlaying).length !== 0){
                    changePlayButton(nowPlaying.nowPlayingId, "pause");
                }
            });
            break;
        case "music state paused":
            updateAllButtons();
            storage.get("nowPlayingId", function(nowPlaying){
                if (Object.keys(nowPlaying).length !== 0){
                    changePlayButton(nowPlaying.nowPlayingId, "play");
                }
            });
            break;
        case "increment":
            updateScrubber(json.percentProgress);
            updateCurrentTimeDisplay(json.seconds);
            break;
        case "update time":
            updateCurrentTimeDisplay(json.seconds);
            break;
    }
});

// runs every page load
chrome.extension.sendMessage({ message: "load" }, function(response){
    switch (response.message){
        case "playing":
            changePlayButton(null, "pause");
            break;
        case "paused":
            changePlayButton(null, "play");
            break;
        case "player not ready":
            document.getElementById("scrubber").style.display = "none";
            break;
    }
});
storage.get("volume", function (item){
    if (Object.keys(item).length !== 0) document.getElementById("vol_control").value = item.volume;
});