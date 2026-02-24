 (async () => {
 var torbox_api = await PluginDatabase.getCacheKey('torbox_api');
     Form.beginGroup("user_profile", "Torbox Credentials");
     Form.addField(JSON.stringify({
         type: "text",
         id: "torbox_api",
         label: "Api Key",
         placeholder: "Enter Api Key",
         value: torbox_api
     }));
      Form.setSubmitHandler("saveTorbox");
      Form.endGroup();
})();

 async function saveTorbox(jsObject) {
     var data = JSON.parse(jsObject);
     await PluginDatabase.setCacheKey('torbox_api', data.torbox_api, 'torbox');
 }