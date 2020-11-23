// Listen run protocol button click event 
$("#runProtocolButton").on('click', function () {
	console.log("Run Protocol button pressed on popup Script");

	sendMessageToCurrentTab("runProtocol");
	console.log("message sent");
	$("#runProtocolButton").text("Change Value");
});


// Sends message to current tab 
function sendMessageToCurrentTab(title = "", message = "") {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			title: title,
			message: "message"
		});
	});
}

chrome.runtime.onMessage.addListener(
	function (receivedMessage, sender, sendResponse) {
		console.log(receivedMessage);
		console.log("Message Received In popup Script");
		alert("message back");
	});