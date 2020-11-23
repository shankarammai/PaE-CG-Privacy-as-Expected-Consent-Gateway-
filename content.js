console.log("Content Script loaded PaECG");

//Listening Messages 
chrome.runtime.onMessage.addListener(
	function (receivedMessage, sender, sendResponse) {
		console.log(receivedMessage);
		switch (receivedMessage.title){
		case  "runProtocol" :
			console.log("protocol running");
			chrome.runtime.sendMessage("Message back from content script");
			console.log("Message Sent back");
		case  "checkSupported":
			var isSupportedResponse=isSupportedWebsite();
			chrome.runtime.sendMessage({title:'websiteSupportResponse',data:isSupportedResponse});
		}


	});



function injectcodeToPage() {
}

// This function checks if the website supports  protocol or not
// Returns true, false
function isSupportedWebsite(){
	return ($('paecg').length>0)

}

// This is triggred when Page sends message to the content script
$(function () {
	window.addEventListener("message", function (event) {
		if (event.source != window)
			return;
		if (event.data.type && (event.data.type == "FROM_PAGE")) {
			console.log("Content script received: " + event.data);
			console.log(event.data);
			console.log(document.documentElement.innerHTML);
		}
	});
});