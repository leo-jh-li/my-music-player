/*jshint esversion: 6 */

(function (model) {
    "use strict";
    /* number of songs on the page */
    var count = 1;
    /* used to paginate load more */
    var top_songs_page = 1;
    var artist_songs_page = 1;
    /* tells which page you are on */
    var flag = 0; 

    window.onload = function () {
        updateDisplay();
        loadTopTracks(top_songs_page);
    };

    function loadTopTracks(page) {
        model.getTopTracks(page, function(err, data){
            if (err) showNotification(false, "Something went wrong. Try again!");
            else {
                var tracks = data.tracks.track;
                var from = 10 * top_songs_page - 10;

                for (var i = from; i < tracks.length; i ++) {
                    var artist = tracks[i].artist.name;
                    var song = tracks[i].name;
                    displayTracks(artist, song);
                }
                top_songs_page ++;


            }
        });
    }

    function displayTracks(artist, song) {
        var node = document.getElementById("top_results");

        var item = document.createElement("li");
        item.className = "item container";

        var text = document.createElement("p");
        text.innerHTML = count + ". " +song + " - " + artist;

        // make search button
        var search = document.createElement("div");
        search.className = "search_button music_button";

        item.appendChild(text);
        item.appendChild(search);
        node.appendChild(item);

        count ++;

        // show load more button
        document.getElementById("load_more").style.display = "flex";


    }

    document.getElementById("top_results").onmouseenter = function () {
        var results = document.getElementById("top_results");
        var search_button = results.getElementsByClassName("search_button");
        for (var i = 0; i < search_button.length; i ++) {
            search_button[i].onclick = function() {
                var element = this.parentNode.getElementsByTagName("p")[0].innerHTML;
                // parse out number
                var song = element.substring(3);
                storage.set({"search": song}, function(){
                    // redirect to search page
                    window.location = "index.html";
                });
            };
        }       
    };

    document.getElementById("load_more").onclick = function() {
        if (flag === 0) loadTopTracks(top_songs_page);
        else loadArtistSongs(artist_songs_page);
    };

    function clearResults() {
        document.getElementById("top_results").innerHTML = ``;
    }

    var top_songs = document.getElementById("top_songs");
    var artist_top_songs = document.getElementById("artists_top_songs");
    
    /* Top Songs tab */
    top_songs.onclick = function() {
        // set as clicked
        if (!top_songs.className.includes("sub_clicked")) top_songs.className += " sub_clicked";
        console.log(artist_top_songs.className);
        if (artist_top_songs.className.includes("sub_clicked")) 
            artist_top_songs.className = artist_top_songs.className.replace("sub_clicked", "");
        // hide form
        document.getElementById("search_form").className = "container hide";
        // reset page
        top_songs_page = 1;
        count = 1;
        flag = 0;
        // load the tracks
        clearResults();
        loadTopTracks(top_songs_page);
    };

    /* Search By Artist tab */
    artist_top_songs.onclick = function() {
        // set as clicked
        if (!artist_top_songs.className.includes("sub_clicked")) artist_top_songs.className += " sub_clicked";
        if (top_songs.className.includes("sub_clicked")) 
            top_songs.className = top_songs.className.replace("sub_clicked", "");
        // hide load more
        document.getElementById("load_more").style.display = "none";
        document.getElementById("search_form").className = "container";
        // reset page
        clearResults();
        count = 1;
        flag = 1;
    };

    document.getElementById("search_form").onsubmit = function(e) {
        e.preventDefault();
        var search_string = document.getElementById("search_string").value;
        loadArtistSongs(artist_songs_page, search_string);
    };

    function loadArtistSongs(page, search_string) {
        model.getSongsByArtist(page, search_string, function(err, data) {
            var tracks = data.toptracks;
            if(tracks){
                tracks = tracks.track;
                var from = 10 * artist_songs_page - 10;
                for (var i = from; i < tracks.length; i ++) {
                    var artist = tracks[i].artist.name;
                    var song = tracks[i].name;
                    displayTracks(artist, song);
                }
                artist_songs_page ++;
            } else showNotification(false, "Cannot find artist. Try Again!");

        });
    }


}(model));