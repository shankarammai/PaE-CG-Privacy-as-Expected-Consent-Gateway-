/**
 * Injecting code so Page can communicate with Extension
 */
var code = `window.addEventListener("message", function (event) {
	if (event.source != window)
		return;
	if (event.data.type && (event.data.type == "FROM_EXTENSION")) {
		switch (event.data.title){
			case "generateHash":
				console.log('hasing');
			case "sendData" :
				window.postMessage({type: "FROM_PAGE",title:'generateHash',data:'test'});
		}
	}
});`;


/**
 * // If the Website Supports the protocol Injecting Code to Communicate with it
 */
if (isSupportedWebsite()) {
	injectcodeToPage(code);
	console.log('Code injected on Supported Website');
}

/**
 * Listening Messages from Runtime
 */
chrome.runtime.onMessage.addListener(
	function (receivedMessage, sender, sendResponse) {
		console.log(receivedMessage);
		switch (receivedMessage.title) {
			case "runProtocol":
				console.log("protocol running");
				chrome.runtime.sendMessage("Message back from content script");
				console.log("Message Sent back To PupUp");
				var data = {
					title: 'generateHash',
					data: 'test data'
				};
				window.postMessage({
					type: "FROM_EXTENSION",
					title: 'sendData',
					data: data
				});

			case "checkSupported":
				var isSupportedResponse = isSupportedWebsite();
				chrome.runtime.sendMessage({
					title: 'websiteSupportResponse',
					data: isSupportedResponse
				});
		}


	});

	
/**
 * This functions injects code to the page context 
 * @param  {String} code code to inject to the website
 */
function injectcodeToPage(code) {
	var script = document.createElement('script');
	script.textContent = code;
	(document.head || document.documentElement).appendChild(script);
	script.remove();
}

/**
 * This function checks if the website supports  protocol or not
 * @returns {boolean} true is supported, false is not supported
 * 
 */
function isSupportedWebsite() {
	return ($('paecg').length > 0)

}

/**
 * This is triggred when Page sends message to the content script
 */
$(function () {
	window.addEventListener("message", function (event) {
		if (event.source != window)
			return;
		if (event.data.type && (event.data.type == "FROM_PAGE")) {
			console.log(event.data);
			var receiptData=event.data.receiptData;
			switch (event.data.title) {
				case "consentDetails":
					var pageHtml=document.documentElement.innerHTML;
					console.log(pageHtml);
					//var javascriptCode=await getCodeFromUrl(receiptData.javascriptCode);
					console.log('javascriptCode');
					//console.log(javascriptCode);
					





			}
		}
	});

});

async function getCodeFromUrl(file){
	var res = await fetch( file );
	res = await res.text();
	fileContents = res.toString(16);
	return fileContents;
}
console.log("Content Script loaded PaECG");