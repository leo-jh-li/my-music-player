/*jshint esversion: 6 */

(function(model){
    "use strict";

    window.onload = function(){

        gapi.client.setApiKey("AIzaSyA0pzM8vB3EYN8zKefZv4e7V_qUl9Alsx8");
        gapi.client.load("youtube", "v3", function(){
            var default_playlist = "My Playlist";
            storage.get("active_playlist", function (current){
                if (Object.keys(current).length !== 0) default_playlist = current.active_playlist;
                var playlist_dropdown = document.getElementById("playlist_dropdown");
                playlist_dropdown.getElementsByTagName("button")[0].innerHTML = default_playlist;
                loadVideos(default_playlist);
                noSongMessage(default_playlist);
            });
        });
        updateDisplay();
        loadPlaylistDropdown();
    };

    function loadVideos(playlist){
        document.getElementById("playlist").innerHTML = "";
        storage.get("playlist", function(result){
            storage.get("nowPlayingId", function(nowPlaying){
                storage.get("active_playlist", function (current){
                    var container = document.getElementById("playlist");
                    var list = result.playlist[playlist];
                    var pl_name = document.getElementById("active_playlist").innerHTML;
                    chrome.extension.sendMessage({message: "getState"}, function(response){
                        if (list){
                            for (let i = 0; i < list.length; i++){
                                var vid_title = list[i].title;
                                var vid_id = list[i].id;

                                var item = document.createElement("li");
                                item.className = "item container";
                                
                                    // set button to pause if that song is currently playing and it is from
                                    // the current playlist
                                    var button_type = "play_button";
                                    if (Object.keys(nowPlaying).length !== 0 &&
                                        nowPlaying.nowPlayingId === vid_id &&
                                        pl_name === current.active_playlist &&
                                        response.message === YT.PlayerState.PLAYING)
                                        button_type = "pause_button";

                                    // create the play button
                                    item.innerHTML = `<p>${vid_title}</p>
                                    <div code="${vid_id}" class="${button_type} music_button"></div>
                                    <div class="delete_button music_button"></div>`;

                                    container.appendChild(item);
                            }
                        }
                    });
                });
            });
        });
    }

    document.getElementById("playlist").onmouseenter = function(){
        var items = document.getElementsByClassName("item");
        for (var i = 0; i < items.length; i++){
            /* play and pause */
            items[i].getElementsByTagName("div")[0].onclick = function(){
                for (var j = 0; j < items.length; j++){
                    // toggle this button and reset all other play buttons
                    if (items[j] === this.parentNode){
                        var vid_id = this.getAttribute("code");
                        var pl_name = document.getElementById("active_playlist").innerHTML;
                        playAudio(vid_id, pl_name, false);
                    } else items[j].getElementsByTagName("div")[0].className = "play_button music_button";
                }
            };
            /* remove from playlist */
            items[i].getElementsByClassName("delete_button")[0].onclick = function(){
                var playlist_name = document.getElementById("playlist_dropdown").getElementsByTagName("button")[0].innerHTML;
                for (var j = 0; j < items.length; j++){
                    var index;
                    if (items[j] === this.parentNode){
                        index = j;
                        storage.get("playlist", function(item){
                            var all_playlist = item.playlist;
                            var list = all_playlist[playlist_name];
                            var deletedId = items[index].getElementsByTagName("div")[0].getAttribute("code");
                            list.splice(index, 1);
                            storage.set({"playlist": all_playlist}, function(){
                                items[index].remove();
                                showNotification(true, "Removed from Playlist!");
                            });
                            storage.get("nowPlayingId", function (nowPlaying){
                                storage.get("active_playlist", function (current){
                                    // remove the active playlist if the deleted song is currently playing and
                                    // is a part of the active playlist
                                    if(Object.keys(nowPlaying).length !== 0 &&
                                        Object.keys(current).length !== 0 &&
                                        current.active_playlist === playlist_name &&
                                        nowPlaying.nowPlayingId === deletedId){
                                        storage.remove(["active_playlist"]);
                                    }
                                });
                            });
                        });
                    }
                }
            };
        }
    };

    /* Create a new playlist */
    var submit_playlist = document.getElementById("submit_playlist");
    submit_playlist.onsubmit = function(e){
        e.preventDefault();
        var name = document.getElementById("playlist_name");
        var form_err = submit_playlist.getElementsByTagName("span")[0];
        var playlist_name = name.value.trim();

        if (playlist_name.length === 0) form_err.innerHTML = "Please enter a playlist name!";
        else {
            storage.get("playlist", function(item){
                var close = document.getElementById("create_playlist_modal").getElementsByClassName("close")[0];
                var list = [];
                // close modal
                close.click();

                if (item.playlist[playlist_name]){
                    // playlist already exist
                    showNotification(false, "Playlist name already exist!");
                } else {
                    // playlist not found, create it
                    list = item.playlist;
                    list[playlist_name] = [];
                    storage.set({"playlist":list}, function (){
                        showNotification(true, "Created new playlist: '" + playlist_name + "'");
                    });
                }
                // reset form
                submit_playlist.reset();
                clearPlaylistDropdown();
                loadPlaylistDropdown();
            });            
        }
    };

    function loadPlaylistDropdown(){
        storage.get("playlist", function(item){
            var playlists = Object.keys(item.playlist);
            var content = document.getElementById("playlist_dropdown").getElementsByClassName("dropdown-content")[0];
            for (var i = 0; i < playlists.length; i ++){
                var name = document.createElement("a");
                name.innerHTML = playlists[i];
                content.appendChild(name);
            }
        });
    }

    function clearPlaylistDropdown(){
        var playlist_dropdown = document.getElementById("playlist_dropdown");
        playlist_dropdown.getElementsByClassName("dropdown-content")[0].innerHTML = ``;
    }


    var export_modal = document.getElementById("export_modal");
    var create_playlist_modal = document.getElementById("create_playlist_modal");
    var import_playlist_modal = document.getElementById("import_playlist_modal");

    document.getElementById("share_playlist").onclick = function(){
        export_modal.style.display = "block";
        // populate dropdown
        storage.get("playlist", function(result){
            var playlists = Object.keys(result.playlist);
            var dropdown = export_modal.getElementsByClassName("dropdown-content")[0];
            dropdown.innerHTML = ``;
            for (var i = 0; i < playlists.length; i ++){
                var item = document.createElement("a");
                item.innerHTML = playlists[i];
                dropdown.appendChild(item);
            }
        });
    };

    document.getElementById("create_playlist").onclick = function (){
        create_playlist_modal.style.display = "block";
        this.parentNode.style.display = "block";
    };

    document.getElementById("import_playlist").onclick = function (){
        import_playlist_modal.style.display = "block";
        this.parentNode.style.display = "block";
    };

    var close = document.getElementsByClassName("close");
    for (var i = 0; i < close.length; i++){
       close[i].onclick = function(){
            this.parentNode.parentNode.style.display = "none";
            this.parentNode.parentNode.parentNode.removeAttribute("style");
        };
    }

    /* selecting playlist in export modal */
    var dropdown = export_modal.getElementsByClassName("dropdown-content")[0];
    export_modal.onmouseenter = function(){
        var content = dropdown.getElementsByTagName("a");
        for (var i = 0; i < content.length; i ++){
            content[i].onclick = function(){
                var playlist_name = this.innerHTML;
                // change select playlist string
                export_modal.getElementsByTagName("input")[0].value = playlist_name;
            };
        }
    };

    /* Export playlist */
    export_modal.getElementsByTagName("input")[1].onclick = function(){
        // get selected playlist
        var name = export_modal.getElementsByTagName("input")[0].value;
        if (name !== "Select Playlist"){
             storage.get("playlist", function(item){
                var playlist = item.playlist[name];
                var textarea = document.getElementById("export_json");
                if (playlist.length !== 0){
                    var playlist_json = JSON.stringify(playlist);
                    // display json
                    textarea.innerHTML = playlist_json;
                } else {
                    textarea.innerHTML = "There are no songs in this playlist!";
                }
                textarea.style.display = "block";
            });       
        }
    };

    /* Import playlist */
    var form = document.getElementById("import_playlist_form");
    form.onsubmit = function(e){
        e.preventDefault();
        var name = document.getElementById("new_playlist_name").value.trim();
        var json_str = document.getElementById("import_json").value;
        var form_err = form.getElementsByTagName("span")[0];
        
        try {
            var json = JSON.parse(json_str);
        } catch (e){
            form_err.innerHTML = "Invalid code! Try again!";
        }

        if (name.length === 0){
            // show err
            form_err.innerHTML = "Please enter a playlist name! Try again!";
        } else {
            // check if playlist already exist
            storage.get("playlist", function(item){
                if (item.playlist[name]){
                    form_err.innerHTML = "Playlist already exist! Try again!";
                } else {
                    // create new playlist
                    var all_playlist = item.playlist;
                    all_playlist[name] = json;
                    storage.set({ "playlist": all_playlist}, function (){
                        showNotification(true, "Imported New Playlist!");
                        clearPlaylistDropdown();
                        loadPlaylistDropdown();
                    });
                }
            });
        }
    };

    /* Loading different playlists */
    var playlist_dropdown = document.getElementById("playlist_dropdown");
    playlist_dropdown.onmouseenter = function(){
        var dropdown_content = playlist_dropdown.getElementsByTagName("a");
        for (var i = 0; i < dropdown_content.length; i ++){
            dropdown_content[i].onclick = function(){
                var playlist_name = this.innerHTML;
                // change button string
                playlist_dropdown.getElementsByTagName("button")[0].innerHTML = playlist_name;
                loadVideos(playlist_name);
                noSongMessage(playlist_name);
            };
        }        
    };

    function noSongMessage(name){
        storage.get("playlist", function(data){
            if (data.playlist[name].length === 0){
                var playlist = document.getElementById("playlist");
                playlist.innerHTML = `<p class=err> There are no songs in this playlist! </p>`;
            }
        });

    }




}(model));