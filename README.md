# Project Proposal

### Project Title
Music Player

### Team Members
- Kenneth Chu
- Leo Li
- Parag Bhandari

### Deployment
We cannot deploy our app to the Chrome store due to legal reasons and YouTube policy.

To deploy locally:
1. download Chrome Canary
2. in Chrome Canary, go to url chrome://extensions/
3. click Load unpacked extension and select the file "extension" in our repo
4. enable the app
5. app should now be available on top toolbar

### Description
Our application is a Chrome extension that allows user to search for music using the YouTube api and play them via the extension.
Users can create and add music to their playlist and can also share their playlist with other users. 
This app is great for users who are browsing the web and want to listen to music in a convienient way.

### Beta Version
For the beta version, we will have the following features completed:
- Integrate YouTube data api and YouTube player api
- Searching for videos via YouTube api
- Being able to play and pause the video / music
- Creating and adding selected music to playlist

### Final Version
In addition to the beta features, the final version will include:
- Users can download their playlist
- Users can load a playlist file from another user into the chrome extension
- Implement search in soundcloud
- Reordering of songs in playlists
- Creation of multiple playlists
- Users can search songs by artists
- Users can see top hits

### Technology
- Chrome extension
- Google api
- Youtube api
- Lastfm api

### Challenges
- Learning to create a chrome extension
- Integrating multiple apis
- Persistency (keeping music playing on different pages and when app is closed)
