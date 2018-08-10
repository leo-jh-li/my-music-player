/* Set the 'clicked' color to the navigation bar */
var search = document.getElementById("navi_search");
var my_playlist = document.getElementById("navi_playlist");
var charts = document.getElementById("navi_charts");

var path = window.location.pathname;
var current = path.substr(path.lastIndexOf("/") + 1);
console.log(current);

if (current == "index.html") search.className += " clicked";
else if (current == "playlist.html") my_playlist.className += " clicked";
else if (current == "charts.html") charts.className += " clicked";