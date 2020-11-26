//Generating keypair 
var publicKey,privateKey,publicKey_pem,privateKey_pem;
var rsa=forge.pki.rsa;
var keyPair =rsa.generateKeyPair({bits:1024,e:0x10001}) ;
publicKey=keyPair.publicKey;
privateKey=keyPair.privateKey
publicKey_pem=forge.pki.publicKeyToPem( keyPair.publicKey );
privateKey_pem=forge.pki.privateKeyToPem( keyPair.privateKey );



// When the tab is changed 
chrome.tabs.onActivated.addListener(function (changedTab) {
    console.log('active tab Id >> ', changedTab.tabId);
    sendMessageToTab(changedTab.tabId, "checkSupported");
});


// when the Extension is Installed for the first time or when it is updated
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        chrome.tabs.create({
            url: "https://privacy-as-expected.org/"
        });
    } else if (details.reason == "update") {
        //Todo: call a function to handle an update
    }
});

// Listening to messaged from Content Script
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


/**
 * Send Message to Tab
 * @param  {Number} tabId
 * @param  {String} title=0
 * @param  {JSON} data=0
 */
function sendMessageToTab(tabId, title = 0, data = 0) {
    chrome.tabs.sendMessage(tabId, {
        title: title,
        data: data
    });
}