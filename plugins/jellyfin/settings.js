Form.beginGroup("user_profile", "Jellyfin Settings");


Form.addField(JSON.stringify({
    type: "text",
    id: "username",
    label: "Username",
    placeholder: "Enter your handle",
    value: "GuestUser"
}));

Form.addField(JSON.stringify({
    type: "text",
    id: "bio",
    label: "Short Bio",
    placeholder: "Tell us about yourself...",
    value: ""
}));

Form.addField(JSON.stringify({
    type: "text",
    id: "password",
    label: "Password",
    placeholder: "Password",
    value: ""
}));

Form.setSubmitHandler("saveProfile");
Form.endGroup();


// 2. Create a Notifications Group
Form.beginGroup("notifications", "App Notifications");
Form.addField(JSON.stringify({
    type: "checkbox",
    id: "push_enabled",
    label: "Enable Push Notifications",
    value: "true"
}));
Form.setSubmitHandler("saveNotification");
Form.endGroup();

// Logic for handlers (optional for now)
function saveProfile(dataJson) {
    const data = JSON.parse(dataJson);
    console.log("Saving username: " + data.username);
    console.log("Profile saved!");
}

function saveNotification() {
    console.log("Notifcation saved!");
}