// mediaDetails.js

class Torrentio {

    tabName = "Torrentio";
    instanceName = ""
    streams = [];
    proxy = "";
    constructor(instanceName) {
        Plugin.registerInstance(instanceName)
        this.instanceName = instanceName;
    }
    async init() {
        this.proxy = await PluginDatabase.getCacheKey('proxy_url');
        const media = movie
        if(media.media_type == "season" || media.media_type == "tv") {
            console.log("No Streams For Seasons");
            return
        }
        const http = PluginHttp;
        var returnStream = [];
        try {
            const imdbId = mainImdbId;
            console.log(`Imdb ID ${imdbId}`);
            if (imdbId) {
                console.log("Found IMDb ID: " + imdbId);
                let torrentioUrl = `https://torrentio.strem.fun/stream/movie/${imdbId}.json`;
                if(media.media_type == "episode") {
                    torrentioUrl = this.proxy+this.buildSearchUrlTv(imdbId, seasonNumber, episodeNumber);
                } else {
                    torrentioUrl = this.proxy+this.buildSearchUrlMovies(imdbId);
                }
                const reponse  = JSON.parse(await http.request(torrentioUrl, "GET", null, null, false));
                console.log("Building Return")
                reponse.body.streams.forEach(item => {
                    returnStream.push({
                        'name': item.name,
                        'title' : encodeURIComponent(item.title),
                        'infoHash': item.infoHash,
                        'fileIdx': item.fileIdx
                    })
                })
                console.log("Finished Return")
            } else {
                console.log("No IMDb ID found for TMDB ID: " + imdbId);
            }
            console.log("Set stream List")
            this.streams = JSON.stringify(returnStream);
            PluginReporter.onResult(this.instanceName, "initComplete")
        } catch (e) {
            console.log("Plugin Error: " + e);
            this.streams = [];
        }
    }

    buildSearchUrlTv(imdbId , seasonNumber, episodeNumber) {
        return `https://torrentio.strem.fun/stream/series/${imdbId}:${seasonNumber}:${episodeNumber}.json`;
    }

    buildSearchUrlMovies(imdbId) {
        return `https://torrentio.strem.fun/stream/movie/${imdbId}.json`;
    }

    async onTabLoad() {

    }
    async onStreamClick(stream) {
        console.log("Updated Call!!!")
        const startStreamUrl = "http://localhost:8080/stream/start";
        const rawMagnet = `magnet:?xt=urn:btih:${stream.infoHash}`;
        const startStreamResponse = await PluginHttp.request(startStreamUrl, "POST", rawMagnet, null, false);
        console.log("Ok Time to Play!!");
        let streamUrl = `http://localhost:8080/stream?link=${rawMagnet}`
        const streamResponse = await PluginHttp.request(streamUrl, "GET", null, null, false);
        const playUrl = "http://localhost:8080/play";
        PluginPlayer.play(playUrl);
    }
}
var torrentio = new Torrentio("torrentio")
