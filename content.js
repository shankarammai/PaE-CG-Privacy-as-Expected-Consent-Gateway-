//= document.documentElement.innerHTML;
var javascriptCodeHash, policyHash, htmlHash, allHash, PIIHash, PII,pispUrl;
var allJavascriptContent = '';
var allPolicyContent = '';
var htmlContent= document.documentElement.outerHTML;
var websocket;
var timestamp;
var nounce;
var local_storage=chrome.storage.local;
var allReceipts=[];







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
else{
	websocket=new WebSocket('ws://127.0.0.1:3200');

}

/**
 * Listening Messages from Runtime
 */
chrome.runtime.onMessage.addListener(
	function (receivedMessage, sender, sendResponse) {
		let messageTitle=receivedMessage.title;
		if(messageTitle=="getCurrentPageInfo"){
			chrome.runtime.sendMessage({
				title: 'pageInfoResponse',
				data: {domain:window.location.host,fullUrl:window.location.href}
			});


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
				PII: PII,
				nounce,
				timestamp
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
				/* Run the Protocol*/ 

				//get all url contents >> hash them >> exchange messages with server to generate receipt
				Promise.all([gatherJavascriptFiles(event.data.javascriptUrls),gatherPolicyFiles(event.data.policyUrls),getHtml()]).then(() => {
					hashContents().then(()=>{
						console.log("Hasing Completed By Client");
						//creating connection with the server to generate receipt 
						websocket=new WebSocket(pispUrl);
						websocket.addEventListener("open",()=>{
							console.log("Connection made with the server");
							//send hashes to the server
							let messageToSend={'title':'getContentsAndHash','data':{'policyhash':policyHash,'javascripthash':javascriptCodeHash},'htmlhash':htmlHash};
							// sending message to server to receipt server
							websocket.send(JSON.stringify(messageToSend));
						});
			
						websocket.addEventListener("message",message=>{
							let message_data=JSON.parse(message.data);
							console.log(message_data);
							if(message_data.title=="hashingCompleted"){
								if(message_data.data.policyHash==policyHash &&
									 message_data.data.htmlHash==htmlHash && 
									 message_data.data.javascriptHash==javascriptCodeHash ){
									console.log(" All Hashes Match");
									let sendPII={'title':'getSignedMessage','data':{'PII':PII}};
									websocket.send(JSON.stringify(sendPII));
									
								timestamp=new Date().getTime();
								nounce=( 1e9*Math.random()*1e9*Math.random()).toString(16);
								let messagetoSign = {htmlContent:htmlContent,javascript: allJavascriptContent,policy: allPolicyContent,PII: PII,timestamp:timestamp,nounce:nounce};
								
								// sending message to background to sign the message
								sendMessageToBackground('signDetails', messagetoSign);
								}
								else{
									console.log("Hashes not Matching");
								}
			
							}
							if(message_data.title=="signedMessage"){
								let server_public_key = forge.pki.publicKeyFromPem(message_data.data.server_publickeypem);
								let server_signed_message = message_data.data.signedMessage;
								let consent_details={
									htmlContent:htmlContent,javascript: allJavascriptContent,policy: allPolicyContent,PII:PII,timestamp:message_data.data.timestamp,nounce:message_data.data.nounce
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

									// //saving file to chrome localstorage
									// let domain=(window.location.origin).toString();
									// local_storage.get(domain, function(result){
									// 	try{
									// 	allReceipts=Object.values(result[domain]);
									// 	}
									// 	catch(err){}
									// 	console.log(allReceipts);
									// });
									// allReceipts.unshift(receiptData);
									// local_storage.set({[domain]:allReceipts}, function() {
									// 	if(chrome.runtime.lastError) {
									// 	 console.log("Error Could not save");
									// 	}
									//   });


									  //saving receipt to the cloud
									  saveReceiptToCloud(receiptData,window.location.host,window.location.href,timestamp);

									//downloading the file locally
									let fileName=`receipt${timestamp}.json`;
									downloadReceipt(JSON.stringify(receiptData), `${fileName}` );
									
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
		}
	}
});

function saveReceiptToCloud(receipt,domain,fullurl,timestamp,userId='1234',userToken='abcdef'){
	$.post('http://localhost:1001/api/save', {
		receipt: receipt,
		domain:domain,
		created_date:timestamp,
		userId:userId,
		userToken:userToken,
		fullurl:fullurl
	})
    .done(function(msg){
		if(msg.success){
			console.log("Added To Cloud");
		}
		else{
			console.log("Failed to Cloud");
		}
	  })
    .fail(function(xhr, status, error) {
		// error handling
		console.log("error");
		console.log(error);
    });
}

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