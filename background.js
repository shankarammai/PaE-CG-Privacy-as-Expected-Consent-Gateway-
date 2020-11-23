chrome.tabs.onActivated.addListener(function (changedTab) {
    console.log('another tab activated');
    console.log(changedTab.tabId);

    sendMessageToTab(changedTab.tabId, "checkSupported");
});

chrome.runtime.onMessage.addListener(
    function (receivedMessage, sender, sendResponse) {
        switch (receivedMessage.title) {
            case "websiteSupportResponse":
                if (receivedMessage.data) {
                    chrome.browserAction.setBadgeText({
                        text: "Supported"
                    });
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: "green"
                    });
                } else {
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: "red"
                    });
                    chrome.browserAction.setBadgeText({
                        text: "Not Supported"
                    });

                }
        }

    }
);


// Send Message to Tab with table and data
function sendMessageToTab(tabId, title = 0, data = 0) {
    chrome.tabs.sendMessage(tabId, {
        title: title,
        data: data
    });
}