var currentUrl;
var currentDomain;
var userId;
var userToken;
var userAllReceipts=[];
var currentDomainReceipts=[];
var isSupported;

/*
* Gets necessary information from the currenly visitng page
*/
sendMessageToRuntime('getUserId_Token');
sendMessageToCurrentTab('getCurrentPageInfo');


/*
*when get all receipts button is clicked
*/

$("#showAllReceipts").on('click', function () {
	$('#receiptArea').html(``);
	getAllReceiptsFromCloud();
});

/* 
*When show current receipts button is pressed
*/
$("#showCurrentDomainReceipts").on('click', function () {
	$('#receiptArea').html(``);
	getCurrentDomainReceiptsFromCloud()
});

function getAllReceiptsFromLocalStorage(){
	chrome.storage.local.get(null,function(items){
		for (var key in items) {
			if (items.hasOwnProperty(key)) {
				let currentreceipt=items[key];
				userAllReceipts.push(currentreceipt);
				if(currentreceipt.domain==currentDomain){
					currentDomainReceipts.push(currentDomainReceipts);
				}
			}
		}
	});
	console.log("Loaded from Local Stoage");
	console.log(userAllReceipts);
}

/**
 * Gets all the receipts from the cloud of the currently visiting website
 */
function getAllReceiptsFromCloud(){
		/**
	 * Sends post receipts to the cloud storage and retrives all the receipts in a array, sorted by their timestamp
	 * @param  userId  userId of the User
	 * @param  userToken token of the user
	 */
	$.post('http://localhost:1001/api/get', {
		userId:userId,
		userToken:userToken,
	}).done(function(msg){
		userAllReceipts=msg;
		showReceipts(msg);
	})
	.fail(function(xhr, status, error) {
		// error handling
		console.log(error);
	});

}

/**
 * Gets all the receipts from the cloud of the currently visiting website
 */
function getCurrentDomainReceiptsFromCloud(){
	/**
	 * Sends post receits to the cloud storage and retrives all the receipts of currenlt visiting website in a array, sorted by their timestamp
	 * @param  userId  userId of the User
	 * @param  userToken token of the user
	 * @param  currentDomain  current domain
	 */
	$.post('http://localhost:1001/api/get', {
	userId:userId,
	userToken:userToken,
	domain:currentDomain
})
.done(function(msg){
	currentDomainReceipts=msg;
	showReceipts(msg);
})
.fail(function(xhr, status, error) {
	// error handling
	console.log(error);
});
}

function gatherNecessaryInfo(){
    if(typeof currentUrl !== "undefined"){
		getCurrentDomainReceiptsFromCloud();  
    }
    else{
        setTimeout(gatherNecessaryInfo, 250);
    }
}
gatherNecessaryInfo();


/**
 * Show the receipts in the popup
 * @param  {} msg Array of Receipts retrived from  the cloud
 */
function showReceipts(msg){
	if(msg.length==0){
		$('#receiptArea').html(`<div class="col-12"> <p>No receipts found for this site<p></div>`);
	}
	else{
		msg.forEach(element => {
			$('#receiptArea').append(
			`<div class="receipt_file col-3">
			<div class="row">
				<div class="col-6">
					<i class="material-icons">description</i>
				</div>
				<div class="col-6">
					<button id='viewbtnid${element._id}' class="btn-info btn-xs">View</button>
				</div>
			</div>
			<div class="row">
				<div class="col-6"> <button id='downloadbtnid${element._id}' class="btn-primary btn-xs">Download</button></div>
			</div>
		</div>`);
			document.getElementById(`id${element._id}`)
			var downloadbtnname=`#downloadbtnid${element._id}`
			var viewbtnname=`#viewbtnid${element._id}`
			console.log()
			$(downloadbtnname).on('click', function () {
				downloadReceipt(JSON.stringify(element.receipt),Date.now());
			});
			$(viewbtnname).on('click', function () {
				var win = window.open("",'data:application/json;charset=utf-8,', "Receipt", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=780,height=200,top="+(screen.height-400)+",left="+(screen.width-840));
				win.document.body.innerHTML = '<pre>'+JSON.stringify(element.receipt)+'</pre>';
			});
		});
		console.log(msg);
	}

}
/**
 * Asks users to save the receipts in their device
 * @param  {} data receipt data
 * @param  {} filename receipt file name
 * 
 */
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






// Sends message to current tab 
function sendMessageToCurrentTab(title = "", message = "") {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			title: title,
			data: message
		});
	});
}

function sendMessageToRuntime(title, data) {
	chrome.runtime.sendMessage({
		title: title,
		data: data
	});
}


chrome.runtime.onMessage.addListener(
	function (receivedMessage, sender, sendResponse) {
		var msgdata=receivedMessage.data
		if(receivedMessage.title=="pageInfoResponse"){
			currentUrl=msgdata.fullUrl;
			currentDomain=msgdata.domain;
			if(msgdata.isSupported){
				$("#supportedIcon").removeClass("badge-secondary").addClass("badge-success");
				$("#supportedIcon").text("Supported");

			}
			else{
				$("#supportedIcon").removeClass("badge-secondary").addClass("badge-danger");
				$("#supportedIcon").text("Not Supported");


			}
		}
		if(receivedMessage.title=="UserId_TokenResponse"){
			userId=msgdata.userId;
			userToken=msgdata.userToken;
		}
	});




