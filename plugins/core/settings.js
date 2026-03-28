(async () => {
    try {
        var proxyUrl = await PluginDatabase.getCacheKey('proxy_url');
        var tmdb_api_key = await PluginDatabase.getCacheKey('tmdb_api_key');
        var access_token = await PluginDatabase.getCacheKey('access_token');
        var server_port = await PluginDatabase.getCacheKey('server_port');
        Form.beginGroup("proxy_url", "Proxy URL");
        Form.addField(JSON.stringify({
            type: "text",
            id: "proxy_url",
            label: "Proxy Url",
            placeholder: "Enter Url",
            value: proxyUrl
        }));
        Form.addField(JSON.stringify({
            type: "text",
            id: "server_port",
            label: "Stream Server Port",
            placeholder: "Enter Port",
            value: server_port
        }));
        Form.setSubmitHandler("saveProxyUrl");
        Form.endGroup();
        console.log("Database keys loaded successfully");

    } catch (e) {
        console.error("Failed to load keys: " + e);
    }
})();

async function saveTmdb(jsObject) {
    var data = JSON.parse(jsObject);
    await PluginDatabase.setCacheKey('tmdb_api_key', data.tmdb_api_key, 'core')
    await PluginDatabase.setCacheKey('access_token', data.access_token, 'core')
}

async function saveProxyUrl(jsObject) {
    var data = JSON.parse(jsObject);
    console.log(`Saving data ${data.proxy_url}`)
    await PluginDatabase.setCacheKey('proxy_url', data.proxy_url, 'core')
    await PluginDatabase.setCacheKey('server_port', data.server_port, 'core')
    PluginMessage.showMessage("Message Saved")
}