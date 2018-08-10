/*jshint esversion: 6 */
var model = (function (){
    "use strict";

    var model = {};

    var lastfm_api_key = "2fc8f27dcf75355cf8294de2b6e01251";
    var lastfm_domain = "http://ws.audioscrobbler.com";

    var storage = chrome.storage.local;
    var video; // the player
    var playerReady = false;
    var videoId;


    var frontendPort;
    // listener for when a frontend view connects
    chrome.extension.onConnect.addListener(function (port){
        frontendPort = port;
        port.onDisconnect.addListener(function (){
            frontendPort = null;
        });
    });

    /* Taken from lab 6 */
    var doAjax = function (method, url, body, json, callback){
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function(e){
            switch(this.readyState){
                 case (XMLHttpRequest.DONE):
                    if (this.status === 200){
                        if(json) return callback(null, JSON.parse(this.responseText));
                        return callback(null, this.responseText);
                    }else{
                        return callback(this.responseText, null);
                    }
            }
        };
        xhttp.open(method, url, true);
        if (json && body){
            xhttp.setRequestHeader('Content-Type', 'application/json');
            xhttp.send(JSON.stringify(body));  
        }else{
            xhttp.send(body);  
        }        
    };

    model.searchResults = function (query, nextPageToken, callback){
        var query_settings = {
            part: "snippet",
            type: "video",
            q: query,
            maxResults: 20,
            order: "viewCount",
            // videoLicense: "creativeCommon"
           
            /* After everything is done, uncomment this so we only search for videos under category "Music"
            Reference: https://gist.github.com/dgp/1b24bf2961521bd75d6c
           videoCategoryId: "10" */
        };

        var request;
        if (nextPageToken){
            query_settings.pageToken = nextPageToken;

            request = gapi.client.youtube.search.list(query_settings);
        }
        else request = gapi.client.youtube.search.list(query_settings);

        request.execute(callback);
    };

    model.searchVideo = function (video_id, callback){
        var request = gapi.client.youtube.search.list({
            part: "id,snippet",
            type: "video",
            q: video_id,
            maxResults: 1,
            videoLicense: "creativeCommon"
            /* After everything is done, uncomment this so we only search for videos under category "Music"*/
            /* videoCategoryId: "10" */
        });

        request.execute(callback);
    };

    chrome.extension.onMessage.addListener(function (request, sender, sendResponse){
        var viewTabUrl = chrome.extension.getURL('background.html');
        switch (request.message){
            case "load":
                if (playerReady){
                    switch (video.getPlayerState()){
                        case YT.PlayerState.PLAYING:
                            sendResponse({ message: "playing" });
                            break;
                        case YT.PlayerState.PAUSED:
                            sendResponse({ message: "paused" });
                            break;
                        default:
                            sendResponse({ message: "other" });
                    }
                    updateProgressBar();
                } else sendResponse({ message: "player not ready" });
                break;
            case "play":
                // if playing a playlist song
                if (request.playlistName){
                    if (request.id !== videoId || request.different){
                        // play new video
                        playVideo(request.id, function(json){
                            sendResponse(json);
                        });
                    } else {
                        // same video, so play/pause it
                        toggleVideo(video, function (json){
                            sendResponse(json);
                        });
                    }
                    storage.set({"active_playlist": request.playlistName});
                } else if (request.mainPlay){
                    // otherwise, playing from main button or a searched video
                    toggleVideo(video, function (json){
                        sendResponse(json);
                    });
                } else {
                    // otherwise, playing from a searched video
                    if (request.id !== videoId){
                        // play new video
                        playVideo(request.id, function(json){
                            sendResponse(json);
                        });
                    } else {
                        // same video, so play/pause it
                        toggleVideo(video, function (json){
                            sendResponse(json);
                        });
                    }
                    // not playing a playlist song anymore
                    storage.remove(["active_playlist"]);
                }
                break;
            case "scrub":
                if (playerReady) changeTime(request.value);
                break;
            case "volume":
                if (playerReady){
                    video.setVolume(request.volume);
                    storage.set({ "volume": request.volume });
                }
                break;
            case "playNext":
                changeMusic(video, "next");
                break;
            case "playPrev":
                changeMusic(video, "prev");
                break;
            case "getState":
                if (playerReady){
                    sendResponse({ message: video.getPlayerState() });
                } else {
                    sendResponse({ message: -1 });
                }
                break;
            default:
                sendResponse({ message: "error: invalid message" });
        }
    });

    chrome.webRequest.onBeforeSendHeaders.addListener(function (details){

            var refererRequestHeader;
            var referer = "https://www.youtube.com/";

            details.requestHeaders.forEach(function(header){
                if (header.name === 'Referer'){
                    refererRequestHeader = header;
                }
            });

            if (typeof refererRequestHeader === "undefined"){
                details.requestHeaders.push({
                    name: "Referer",
                    value: referer
                });
            } else {
                refererRequestHeader.value = referer;
            }

            return {requestHeaders: details.requestHeaders};
            
        },
            { urls: ['<all_urls>'] },
            ['blocking', 'requestHeaders']
        );

    var playVideo = function (id, callback){
        if (!playerReady){
            var player;
            player = new YT.Player('player', {
                height: '390',
                width: '640',
                videoId: id,
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
            video = player;
        } else {
            // load new video into existing player
            video.loadVideoById(id);
        }
        videoId = id;
        storage.set({ "nowPlayingId": id });
        if(callback) callback({ message: "played"});
    };

    var toggleVideo = function (player, callback){
        if (playerReady){
            var state = player.getPlayerState();
            switch (state){
                case YT.PlayerState.PLAYING:
                    // playing
                    player.pauseVideo();
                    callback({ message: "paused" });
                    break;
                case -1:
                case YT.PlayerState.ENDED:
                case YT.PlayerState.PAUSED:
                case YT.PlayerState.BUFFERING:
                case YT.PlayerState.CUED:
                    // unstarted, ended, paused, buffering, or video cued
                    player.playVideo();
                    callback({ message: "played" });
                    break;
                default:
                    callback({ message: "error: invalid video state" });
            }
        } else {
            callback({ message: "error: no player" });
        }
    };

    var onPlayerReady = function (event){
        playerReady = true;
        event.target.playVideo();
        var data = event.target.getVideoData();
        var id = data.video_id;
        var title = data.title;
        storage.set({ "nowPlayingId": id, "nowPlayingTitle": title, "duration": video.getDuration() });
        var updateDisplays = setInterval(function (){
            if (video.getPlayerState() === YT.PlayerState.PLAYING) updateProgressBar();
            else if (video.getPlayerState() != YT.PlayerState.ENDED) updateTimeDisplay();
        }, 1000);
    };

    // update location of the progress bar's thumb and the current time
    var updateProgressBar = function(){
        var newTime = video.getCurrentTime() / video.getDuration() * 100;
        if (frontendPort && isFinite(newTime)) frontendPort.postMessage({ message: "increment", percentProgress: newTime, seconds: video.getCurrentTime()  });
    };

    // update only the current time
    var updateTimeDisplay = function(){
        var currTime = video.getCurrentTime();
        if (frontendPort && !isNaN(currTime)) frontendPort.postMessage({ message: "update time", seconds: currTime });
    };

    var onPlayerStateChange = function (event){
        // when video ends
        if (event.target.getPlayerState() === YT.PlayerState.ENDED) changeMusic(event, "next");
        // store id of currently playing video
        if (event.target.getPlayerState() === YT.PlayerState.PLAYING){
            var currentId = event.target.getVideoData().video_id;
            var title = event.target.getVideoData().title;
            // update video information
            storage.set({ "nowPlayingId": currentId, "nowPlayingTitle": title, "duration": event.target.getDuration() });
            if (frontendPort) frontendPort.postMessage({ message: "music state playing" });
        }
        if (event.target.getPlayerState() === YT.PlayerState.PAUSED){
            if (frontendPort) frontendPort.postMessage({ message: "music state paused" });
        }
    };

    var changeMusic = function (event, direction){
        var player;
        if (event && event.target) player = event.target;
        else if (event) player = event;
        if (player){
            // play next song in the playlist if there is one
            storage.get("playlist", function (item){
                // get the current playlist
                storage.get("active_playlist", function (current){
                    if (Object.keys(item).length !== 0 && Object.keys(current).length !== 0){
                        var list = item.playlist[current.active_playlist];
                        storage.get("nowPlayingId", function (item){
                            var videoId = item.nowPlayingId;
                            if (event){
                                var songFound = false;
                                for (var i = 0; i < list.length; i++){
                                    // find currentId in the playlist
                                    if (list[i].id === videoId){
                                        songFound = true;
                                        if (direction === "next"){
                                            // finds and plays video after current one
                                            if (i + 1 < list.length){
                                                playVideo(list[i + 1].id, null);
                                            }
                                            // or ends playing of current song
                                            else {
                                                player.seekTo(player.getDuration());
                                                if (frontendPort) frontendPort.postMessage({ message: "increment", percentProgress: 100, seconds: video.getDuration() });
                                            }
                                        } else if (direction === "prev"){
                                            // restarts song if song is less than 3 seconds in, otherwise, finds and plays video before current one
                                            if (i - 1 >= 0 && player.getCurrentTime() <= 3) playVideo(list[i - 1].id, null);
                                            // or restarts the current song if there is no song before this one
                                            else player.seekTo(0);
                                        }
                                    }
                                }
                                // end song if it's not in the active playlist
                                if (!songFound){
                                    player.seekTo(player.getDuration());
                                    if (frontendPort) frontendPort.postMessage({ message: "increment", percentProgress: 100, seconds: video.getDuration() });
                                }
                            }
                        });
                    } else {
                        // if there is no active playlist
                        if (direction === "next"){
                            player.seekTo(player.getDuration());
                            if (frontendPort) frontendPort.postMessage({ message: "increment", percentProgress: 100, seconds: video.getDuration() });
                        } else if (direction === "prev") player.seekTo(0);
                    }
                });
            });
        }
    };

    var changeTime = function (percentage){
        if(playerReady){
            var newTime = percentage/100 * video.getDuration();
            video.seekTo(newTime);
        }
    };

    model.getTopTracks = function(page, callback){
        doAjax('GET', lastfm_domain + "/2.0/?method=chart.gettoptracks&api_key=" + lastfm_api_key + "&format=json&page=" + page + "&limit=10", null, true, callback);
    };

    model.getSongsByArtist = function(page, artist, callback){
        doAjax('GET', lastfm_domain + "/2.0/?method=artist.gettoptracks&artist="+artist+"&api_key="+lastfm_api_key+"&page="+page+"&limit=10"+"&autocorrect=1&format=json", null, true, callback);
    };

    return model;

}());