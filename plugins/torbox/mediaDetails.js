class Torbox {

    tabName = "Torbox";
    instanceName = ""
    streams = [];
    apiKey = "5e77abb8-6908-4f50-aead-eb4b160ef9f4"
    headers = {
        "Authorization": "Bearer "+this.apiKey,
        "Content-Type": "multipart/form-data"
    };
    proxy = "";
    lookupUrl = `https://api.themoviedb.org/3/movie/${movie_id}/external_ids?api_key=${tmdbApiKey}`;
    endpoint = ""
    createTorrentUrl = "torrents/createtorrent/"
    myListUrl = "torrents/mylist"
    requestDownloadLink = "torrents/requestdl?token="+this.apiKey

    torrent_id = 0
    constructor(instanceName) {
        Plugin.registerInstance(instanceName)
        this.instanceName = instanceName;
        this.headers = JSON.stringify(this.headers);
    }
    async init() {
        try {
            var media = movie;
            if(media.media_type == "season" || media.media_type == "tv") {
                console.log("No Streams For Seasons");
                return
            }
            this.apiKey = await PluginDatabase.getCacheKey('torbox_api');
            console.log("Starting Torbox")
            this.headers = this.getHeaders();
            const http = PluginHttp;
            var returnStream = [];
            this.proxy = await PluginDatabase.getCacheKey('proxy_url');
            this.endpoint = this.proxy+"https://api.torbox.app/v1/api/";
            var imdb = mainImdbId;
            var searchUrl = "";
            if(media.media_type == "episode") {
                searchUrl = this.proxy+this.buildSearchUrlTv(imdb, seasonNumber, episodeNumber);
            } else {
                searchUrl = this.proxy+this.buildSearchUrlMovies(imdb);
            }
            const response = JSON.parse(await PluginHttp.request(searchUrl, "GET", null, this.headers, false));
            //var filteredResults = this.filterBestStreams(response.body.data.torrents)
            response.body.data.torrents.forEach(torrent => {
                returnStream.push({
                    name: torrent.title_parsed_data.title,
                    title: torrent.raw_title,
                    infoHash: torrent.hash,
                    magnet: torrent.magnet
                })
            })
            this.streams = JSON.stringify(returnStream);
            PluginReporter.onResult(this.instanceName, "initComplete")
        } catch (e) {
            console.log("Plugin Error: " + e.message);
        }
    }

    getHeaders() {
        var headers = {
            "Authorization": "Bearer "+this.apiKey,
            "Content-Type": "multipart/form-data"
        };
        return headers;
    }

    filterBestStreams(data) {
        const seenNames = new Set();
        const seenSizes = new Set();
        const trashRegex = /CAM|HDCAM|Screener|SCR|DVDSCR|TS|TELESYNC|HDTS|PDVD|TC|TELECINE/i;
        const webFriendlyRegex = /WEB-DL|WEBRip|AAC|H264|x264|MP4/i;
        const filteredStreams = data.filter(item => {
            // 1. DEDUPLICATION (The Hammer)
            // If we've seen this exact file size OR this exact name, it's a duplicate
            const name = (item.name || item.raw_title || "").toLowerCase();
            const size = item.size;

            if (seenNames.has(name) || seenSizes.has(size)) return false;
            if (item.cached == false) return false
            seenNames.add(name);
            seenSizes.add(size);

            // 2. QUALITY CHECK
            const quality = item.title_parsed_data?.quality || "";
            if (trashRegex.test(quality) || trashRegex.test(name)) return false;

            // 3. VITAL SIGNS
            if (item.last_known_seeders < 2) return false;
            if (size < 500 * 1024 * 1024) return false;

            if(!webFriendlyRegex.test(item.title_parsed_data.audio)) return false;

            return true;
        })
            .sort((a, b) => b.size - a.size) // Put the best quality at the top
            .slice(0, 40); // Hard cap at 40 results for a clean UI
        console.log(`After Filtering: ${filteredStreams.length} streams`);
        return filteredStreams;
    }

    buildSearchUrlTv(imdbId , seasonNumber, episodeNumber) {
        return `https://search-api.torbox.app/torrents/imdb:${imdbId}?media_type=series&check_cache=true&season=${seasonNumber}&episode=${episodeNumber}`
    }

    buildSearchUrlMovies(imdbId) {
        return `https://search-api.torbox.app/torrents/imdb:${imdbId}?media_type=movies`
    }

    async onStreamClick(stream) {
        console.log(this.instanceName + "Has Been CLicked "+stream.name);
        const body = JSON.stringify({
            "magnet": stream.magnet
        });
        const url = this.endpoint+this.createTorrentUrl;
        const response = await PluginHttp.request(url, "POST", body, this.headers, true);
        const data = JSON.parse(response);
        this.torrent_id = data.body.data.torrent_id;
        this.getMyList();
    }

    async getMyList() {
        const url = this.endpoint+this.myListUrl;
        const response = JSON.parse(await PluginHttp.request(url, "GET", null, this.headers, false));
        const validStreams = this.filterValidStreams(response.body.data);
        this.getDownloadLink(validStreams);
    }

    async getDownloadLink(info, currentIndex = 0) {
        // 1. Base Case: We ran out of files to try
        if (!info[currentIndex]) {
            console.log("No more files to try.");
            return false;
        }

        const fileId = info[currentIndex].id || info[currentIndex].fileId;
        const url = this.endpoint + this.requestDownloadLink + "&torrent_id=" + this.torrent_id + "&file_id=" + fileId;

        console.log("Attempting index " + currentIndex + ": " + url);
        const response = JSON.parse(await PluginHttp.request(url, "GET", null, this.headers, false));
        const data = response.body;

        // 2. Success Case
        if (data && (data.status == 200 || data.success === true)) {
            console.log("Found a download! " + (data.body));
            const finalInfo = data.data;
            console.log("Playing..."+finalInfo);
            PluginPlayer.play(finalInfo);
            return data; // Return the actual data up the chain
        }
        // 3. Failure Case: Try the next one
        console.log("The best file " + currentIndex + " failed");
    }

    filterValidStreams(data) {
        const validStreams = data.map(item => {
            // 1. Skip if the item itself is garbage or has no magnet
            if (!item || !item.magnet) return null;
            // 2. Check if files exists and is actually an array
            if (!item.files || !Array.isArray(item.files) || item.files.length === 0) {
                return null;
            }
            try {
                // 3. Filter for ONLY video files (ignore .txt, .jpg, .url)
                const videoFiles = item.files.filter(f =>
                    f.mimetype && f.mimetype.startsWith('video/')
                );

                if (videoFiles.length === 0) return null;
                // 4. Sort by size to get the main feature
                const mainFile = videoFiles.sort((a, b) => b.size - a.size)[0];
                // If the biggest file is less than, say, 20% of the total torrent size,
                // it's probably a fragmented "RAR" set or a collection of clips.
                // A real movie is usually 90-95% of the torrent's total size.
                if (mainFile.size < (item.size * 0.20)) {
                    return null; // Skip this torrent entirely
                }
                return {
                    title: item.title || item.raw_title,
                    magnet: item.magnet,
                    fileId: mainFile.id,
                    fileName: mainFile.short_name,
                    size: mainFile.size
                };
            } catch (e) {
                return null; // Catch any weird "cannot read property" errors
            }
        }).filter(x => x !== null);
        return validStreams;
    }
}
var torbox = new Torbox("torbox")
