// 1. Create a User Profile Group
const proxy = "https://cors-anywhere.herokuapp.com/"
const endpoint = proxy+"https://api.torbox.app/v1/api/"
const createTorrentUrl = "torrents/createtorrent/"
const torrentInfoUrl = "torrents/torrentinfo/"
const myListUrl = "torrents/mylist"
const apiKey = "5e77abb8-6908-4f50-aead-eb4b160ef9f4"
const requestDownlaodLink = "torrents/requestdl?token="+apiKey
let headers = {
    "Authorization": "Bearer "+apiKey,
    "Content-Type": "multipart/form-data"
};

function stringifyOrParse(value, isObject) {
    if(isObject) {
        return JSON.stringify(value)
    } else {
        return JSON.parse(value)
    }
}
headers = stringifyOrParse(headers, true);
async function getMyList() {
    console.log("Retrieving Mylist")
    const lookupUrl = `https://api.themoviedb.org/3/movie/${movie_id}/external_ids?api_key=${tmdbApiKey}`;
    const url = endpoint+myListUrl
    const response = await PluginHttp.request(url, "GET", null, headers, false);
    const data = JSON.parse(response);
    const body = JSON.parse(data.body);
    //console.log("My List Info " + stringifyOrParse(body.data, true))
    const validStreams = body.data.map(item => {
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
    console.log("Valid Streams" + stringifyOrParse(validStreams, true))
    if(validStreams) {
        console.log("Retrieved My List")
        return validStreams
    }
    console.log("No file found with magneto and file")
    return false
}
var torrentInfo = null;
async function createTorrent(magnet) {
    const url = endpoint+createTorrentUrl
    console.log("Creating Torrent From "+url);
    const body = JSON.stringify({
        "magnet": magnet
    });
    console.log("Creating Torrent...")
    // console.log("Client Body "+body)
    const response = await PluginHttp.request(url, "POST", stringifyOrParse(body, true), headers, true);
    const data = JSON.parse(response);
    const info = JSON.parse(data.body);
    console.log("Body Info "+ stringifyOrParse(info.data, true))
    torrentInfo = info.data;
    if(response) {
        console.log("Torrent Created")
        return true;
    }
    console.log("Torrent was not created")
    return false
}
async function searchForTorrentStream(query) {
    console.log("Searching..."+query)
    // 1. Everything is in the URL. We ask for metadata and cache status upfront.
    const searchUrl = proxy+`https://search-api.torbox.app/torrents/search/${encodeURIComponent(query)}?metadata=true&check_cache=true&search_user_engines=true`;
    const responseRaw = await PluginHttp.request(searchUrl, "GET", null, headers, false);
    const data = JSON.parse(responseRaw);
    const bodyObject = JSON.parse(data.body);
    const result = data[0];
    if (bodyObject.data.torrents[0]) {
        console.log("Found instant match: " + bodyObject.data.torrents[0]);
        return bodyObject.data.torrents[0]; // Hand this to your 'createtorrent' function
    }
    console.log("Did not retrieve anything")
    return null;
}
async function getDownloadLink(info, currentIndex = 0) {
    // 1. Base Case: We ran out of files to try
    if (!info[currentIndex]) {
        console.log("No more files to try.");
        return false;
    }

    const fileId = info[currentIndex].id || info[currentIndex].fileId;
    const url = endpoint + requestDownlaodLink + "&torrent_id=" + torrentInfo.torrent_id + "&file_id=" + fileId;

    console.log("Attempting index " + currentIndex + ": " + url);

    const response = await PluginHttp.request(url, "GET", null, headers, false);
    const data = JSON.parse(response);

    // 2. Success Case
    if (data && (data.status == 200 || data.success === true)) {
        console.log("Found a download! " + (data.body));
        const finalInfo = JSON.parse(data.body);
        console.log("Playing..."+finalInfo.data);
        PluginPlayer.play(finalInfo.data);
        return data; // Return the actual data up the chain
    }

    // 3. Failure Case: Try the next one
    console.log("File " + currentIndex + " failed, trying next...");
    return await getDownloadLink(info, currentIndex + 1); // Use + 1 and return the call!
}
searchForTorrentStream("The Matrix").then(results => {
    console.log("Stream Results Magnet: "+results.magnet);
    createTorrent(results.magnet).then((success)=> {
        if(success) {
            getMyList().then((data) => {
                getDownloadLink(data)
            })
        }
    })
});
async function checkTorboxAccount() {
    try {
        console.log("Checking Torbox connectivity...");
        // Use your newly fixed HttpBridge
        const response = await PluginHttp.request(
            "https://api.torbox.app/v1/api/user/me",
            "GET",
            null, // No body for a GET request
            { "Authorization": "Bearer 5e77abb8-6908-4f50-aead-eb4b160ef9f4" },
            false
        );
        console.log(response);
        const data = JSON.parse(response);
        console.log("Status: " + data.status);
        console.log("Plan: " + data.body);
        const jsonBody = JSON.parse(data.body)
        console.log("iS sUCCESS: " + jsonBody.success);
    } catch (e) {
        console.log("Torbox Error: " + e);
    }
}
// checkTorboxAccount()