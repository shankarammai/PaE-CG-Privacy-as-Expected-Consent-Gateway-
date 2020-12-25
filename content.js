//= document.documentElement.innerHTML;
var javascriptCodeHash, policyHash, htmlHash, allHash, PIIHash, PII,pispUrl;
var allJavascriptContent = '';
var allPolicyContent = '';
var htmlContent= document.documentElement.outerHTML;
var websocket;




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
 *  If the Website Supports the protocol Injecting Code to Communicate with it
 */
if (isSupportedWebsite()) {
	injectcodeToPage(code);
	pispUrl=$('meta[name=pisp]').attr('content');
	console.log(pispUrl);
	console.log('Code injected on Supported Website');
}

/**
 * Listening Messages from Runtime
 */
chrome.runtime.onMessage.addListener(
	function (receivedMessage, sender, sendResponse) {
		let messageTitle=receivedMessage.title;
		if(messageTitle=="runProtocol"){

		}
		if(messageTitle=="checkSupported"){
			var isSupportedResponse = isSupportedWebsite();
			chrome.runtime.sendMessage({
				title: 'websiteSupportResponse',
				data: isSupportedResponse
			});

		}
		if(messageTitle=="signedMessage"){
			let message_to_send_to_website = {'title':'signedMessage','data':{
				public_key: receivedMessage.data.publickey_pem,
				signed_Data:receivedMessage.data.signedMessage,
				PII: PII
			}};
			console.log("Sending Signed Message to the website");
			websocket.send(JSON.stringify(message_to_send_to_website));
		}
	});

	function downloadReceipt( data, filename ) {
		var file = new Blob([data], {type: "application/json"});
		var a = document.createElement("a")
		var url = URL.createObjectURL( file );
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(function() {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);  
		}, 0); 
	}
	



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
	return (($("meta[name='pisp']")).length > 0);

}
/**
 * @param  {} title - title of the message
 * @param  {} data - data with the message
 */
function sendMessageToBackground(title, data) {
	chrome.runtime.sendMessage({
		title: title,
		data: data
	});
}

/**
 * This is triggred when Page sends message to the content script
 */
window.addEventListener("message", function (event) {
	if (event.source != window)
		return;
	if (event.data.type && (event.data.type == "FROM_PAGE")) {
		console.log(event.data);
		PII = event.data.PII;
		switch (event.data.title) {
			case "fetchConsentDetails":
				Promise.all([gatherJavascriptFiles(event.data.javascriptUrls),gatherPolicyFiles(event.data.policyUrls),getHtml()]).then(() => {
					hashContents().then(()=>{
						console.log("Hasing Completed By Client");
						websocket=new WebSocket(pispUrl);
						websocket.addEventListener("open",()=>{
							console.log("Connection made with the server");
							let messageToSend={'title':'getContentsAndHash','data':{'policyhash':policyHash,'javascripthash':javascriptCodeHash},'htmlhash':htmlHash};
							websocket.send(JSON.stringify(messageToSend));
						});
			
						websocket.addEventListener("message",message=>{
							let message_data=JSON.parse(message.data);
							console.log(message_data);
							if(message_data.title=="hashingCompleted"){
								console.log(allJavascriptContent);
								if(message_data.data.htmlHash==htmlHash){
									console.log("Html Hash Matches");
								}
								if(message_data.data.policyHash==policyHash){
									console.log(" Policy Hash Matches");
									let sendPII={'title':'getSignedMessage','data':{'PII':PII}};
									websocket.send(JSON.stringify(sendPII));

								let messagetoSign = {htmlContent:htmlContent,javascript: allJavascriptContent,policy: allPolicyContent,PII: PII};
								sendMessageToBackground('signDetails', messagetoSign);
								

								}
								if(message_data.data.javascriptHash==javascriptCodeHash){
									console.log("Javascript Hash Matches");
								}
			
							}
							if(message_data.title=="signedMessage"){
								let server_public_key = forge.pki.publicKeyFromPem(message_data.data.server_publickeypem);
								let server_signed_message = message_data.data.signedMessage;
								let consent_details={
									htmlContent:htmlContent,javascript: allJavascriptContent,policy: allPolicyContent,PII:PII
								};
								let messageDigest = forge.md.sha256.create();
								messageDigest.update(consent_details, 'utf8');
								let verify = server_public_key.verify(messageDigest.digest().bytes(), server_signed_message);
								// If the signature is valid then
								if (verify) {
									console.log("Valid Signature from server");
									console.log('Downloading Receipt');
									let receiptData={
										'version':1,
										'server_public_key':message_data.data.server_publickeypem,
										'signed_Messaged':message_data.data.signedMessage,
										'PII':PII,
										'html':htmlContent,
										'javascript':allJavascriptContent,
										'policy':allPolicyContent,
										'policyHash':policyHash
									}
									let fileName=`receipt${Date.now()}.json`;
									downloadReceipt(JSON.stringify(receiptData), `${fileName}.json` );
							}
							else{
								console.log('Signature not valid');
						}


							}
			
						});
						websocket.addEventListener("error",err=>{
							console.log(err);
						});

					});
				  });

		/*Todo: Need to know what to send to the server
			Just the siged data and Personal Info or all javascript, html and policy data as well
			*/
		}
	}
});

async function gatherJavascriptFiles(allFiles) {
	allJavascriptContent='';
	for (let javascriptUrl of allFiles) {
		let javascriptCode =await getCodeFromUrl(javascriptUrl);
			allJavascriptContent += javascriptCode;
	}
}
async function gatherPolicyFiles(allFiles) {
	allPolicyContent='';
	for (let policyUrl of allFiles) {
		let policyUrlContent = await getCodeFromUrl(policyUrl);
			allPolicyContent += policyUrlContent;
	}

}

async function getHtml(){
	htmlContent=await getCodeFromUrl(window.location.href);
}

async function hashContents() {
	javascriptCodeHash = await sha256(allJavascriptContent);
	policyHash = await sha256(allPolicyContent);
	htmlHash = await sha256(htmlContent);
	PIIHash = await sha256(JSON.stringify(PII));
	allHash = policyHash + htmlHash + javascriptCodeHash + PIIHash;
}

async function getCodeFromUrl(file) {
	var res = await fetch(file);
	res = await res.text();
	return res.toString(16);
}
console.log("Content Script loaded PaECG");