/*jshint esversion: 6 */

(function (model){
    "use strict";

    // videos currently displayed
    var videos_shown = [];

    window.onload = function (){
        createDefaultPlaylist();
        gapi.client.setApiKey("AIzaSyA0pzM8vB3EYN8zKefZv4e7V_qUl9Alsx8");
        gapi.client.load("youtube", "v3", function (){
            handleAPILoaded();
            // check if something needs to be auto searched from charts page
            storage.get("search", function(data){
                if (data.search){
                    document.getElementById("search_string").value = data.search;
                    document.getElementById("search_submit").click();
                }
                storage.remove("search");
            });
        });
        updateDisplay();
    };

    function handleAPILoaded(){
        document.getElementById("search_submit").disabled = false;
    }

    function clearResults(){
        document.getElementById("search_result").innerHTML = ``;
        videos_shown = [];
    }

    var Video = function (title, id){
        this.title = title;
        this.id = id;
    };

    function createDefaultPlaylist(){
        storage.get("playlist", function(item){
            if (Object.keys(item).length === 0){
                storage.set({"playlist":{"My Playlist": []}});
            }
        });
    }

    function populateSearchPage(res, nowPlaying, search_results){
        res = JSON.parse(res);
        var videos = res[0].result.items;
        chrome.extension.sendMessage({message: "getState"}, function(response){
            for (var i = 0; i < videos.length; i++){
                // get the video id and title
                var vid_title = videos[i].snippet.title;
                var vid_id = videos[i].id.videoId;

                var item = document.createElement("li");
                item.className = "item container";

                // set button to pause if that song is currently playing
                var button_type = "play_button";
                if (Object.keys(nowPlaying).length !== 0 &&
                    nowPlaying.nowPlayingId === vid_id &&
                    response.message === YT.PlayerState.PLAYING) button_type = "pause_button";

                // main play button in controller
                document.getElementById("main_play").className = button_type + " music_button";

                //create the play button
                item.innerHTML = `<p>${vid_title}</p>
                            <div code="${vid_id}" class="${button_type} music_button"></div>
                            <div code="${vid_id}" class="add_button music_button"></div>`;

                var node = document.createElement("div");
                node.id = videos_shown.length.toString();

                item.appendChild(node);
                search_results.appendChild(item);

                var video = new Video(vid_title, vid_id);
                videos_shown.push(video);
            }
        });
        return res[0].result.nextPageToken; //return nextPageToken so we can load next page if uses chooses to do so
    }

    document.getElementById("search_form").onsubmit = function (e){
        e.preventDefault();
        clearResults();
        document.getElementById("load_more").style.display = "flex";
        var query = document.getElementById("search_string").value;
        var search_results = document.getElementById("search_result");


        storage.get("nowPlayingId", function (nowPlaying){
            if (query.length > 0){
                //want nextPageToken to be empty as user is making a new search
                model.searchResults(query, "", function (err, res){
                    var nextPageToken = populateSearchPage(res, nowPlaying, search_results);


                    document.getElementById("load_more").onclick = function (){
                        model.searchResults(query, nextPageToken, function (err, res){
                            nextPageToken = populateSearchPage(res, nowPlaying, search_results);
                        });

                    };
                });
            }
        });
    };

    document.getElementById("search_result").onmouseenter = function (){
        var items = document.getElementsByClassName("item");
        for (var i = 0; i < items.length; i++){
            /* play and pause */
            items[i].getElementsByTagName("div")[0].onclick = function (){
                for (var j = 0; j < items.length; j++){
                    // toggle this button and reset all other play buttons
                    if (items[j] === this.parentNode){
                        var vid_id = this.getAttribute("code");
                        playAudio(vid_id, null, false);
                    } else items[j].getElementsByTagName("div")[0].className = "play_button music_button";
                }
            };
            /* add to playlist */
            items[i].getElementsByClassName("add_button")[0].onclick = function (){
                clearPlaylistResult();
                addToPlaylistModal(this);
            };
        }
    };

    function addToPlaylistModal(object){
        var vid_title = object.parentNode.getElementsByTagName("p")[0].innerHTML;
        var vid_id = object.getAttribute("code");
        var vid = new Video(vid_title, vid_id);
        var add_to_playlist_modal = document.getElementById("add_to_playlist_modal");
        add_to_playlist_modal.style.display = "block";
        storage.get("playlist", function(result){
            var playlists_html = document.getElementsByClassName("display_playlist")[0];
            var playlists = Object.keys(result.playlist);
            // show playlists to choose from
            for (var i = 0; i < playlists.length; i ++){
                var item = document.createElement("p");
                item.innerHTML = playlists[i];
                playlists_html.appendChild(item);
            }

            // find out which playlist user selected, returns name of playlist 
            document.getElementById("add_to_playlist_modal").onmouseenter = function(){
                var list = document.getElementsByTagName("p");
                for (var i = 0; i < list.length; i ++){
                    list[i].onclick = function (){
                        var playlist_name = this.innerHTML;
                        addToPlaylist(playlist_name, vid);
                    };
                }
            };
        });
    }

    /* adds selected music to selected playlist */
    function addToPlaylist(name, video){

        storage.get("playlist", function(item){
            var all_playlist = item.playlist;
            var list = all_playlist[name];
            var close = document.getElementById("add_to_playlist_modal").getElementsByClassName("close")[0];
            
            // close modal;
            close.click();
            
            if (list.some(function (e){ return e.id === video.id; })){
                showNotification(false, "Already in Playlist!");
            }
            else {
                list.push(video);
                storage.set({ "playlist": all_playlist}, function (){
                    showNotification(true, "Added to Playlist!");
                });
            }
        });
    }

    function clearPlaylistResult(){
        document.getElementsByClassName("display_playlist")[0].innerHTML = ``;
    }

    var close = document.getElementsByClassName("close");
    for (var i = 0; i < close.length; i++){
       close[i].onclick = function(){
            this.parentNode.parentNode.style.display = "none";
        };
    } 

}(model));