const express = require('express');
const bodyParser = require('body-parser');
const forge = require('node-forge');
const cors = require('cors')
const fetch = require("node-fetch");
const sha256= require("sha256");
const WebSocket = require('ws');
const date = require('date-and-time');
const wss = new WebSocket.Server({
    port: 3100
});
var htmlHash,javascriptHash,policyHash;
var allPolicyContent='';
var allJavascriptContent='';
var htmlContent=''
var htmlUrl='http://localhost/web-of-receipts/compliant_website.html';
var javascriptUrls=['http://localhost/web-of-receipts/js/one.js','http://localhost/web-of-receipts/js/two.js'];
var policyUrls=['http://localhost/web-of-receipts/policy/one.html','http://localhost/web-of-receipts/policy/two.html'];

var fs = require('fs');
const {
    Console
} = require('console');
const rsa = forge.pki.rsa;
const keyPair = rsa.generateKeyPair({
    bits: 1024,
    e: 0x10001
});
const publicKey = keyPair.publicKey;
const privateKey = keyPair.privateKey
const publicKey_pem = forge.pki.publicKeyToPem(keyPair.publicKey);
const privateKey_pem = forge.pki.privateKeyToPem(keyPair.privateKey);


wss.on("connection", ws  => {
    console.log("New connection from client");
    ws.on("message",data=>{
        let message=JSON.parse(data);
        let message_data=message.data;
        console.log("Message Received from client title >> ",message.title)
        if(message.title=="getContentsAndHash"){
            Promise.all([gatherPolicyFiles(), gatherJavascriptFiles(),getHtml()]).then(() => {
                generateHash().then(()=>{
                    console.log("Gathering Files and Hashing done");
                    let messageTosend={"title":'hashingCompleted','data':{"javascriptHash":javascriptHash,"policyHash":policyHash,"htmlHash":htmlHash}}
                     ws.send(JSON.stringify(messageTosend));
                });
              });
        }
        if(message.title=="compareHash"){

        }
        if(message.title=="signedMessage"){
            let user_public_key = forge.pki.publicKeyFromPem(message_data.public_key);
            let user_signed_message = message_data.signed_Data;
            let consent_details={
                htmlContent:htmlContent,javascript: allJavascriptContent,policy: allPolicyContent,PII: message_data.PII,timestamp:message_data.timestamp,nounce:message_data.nounce
            };
            console.log("Got all details from client");
            let messageDigest = forge.md.sha256.create();
            messageDigest.update(consent_details, 'utf8');
            let verify = user_public_key.verify(messageDigest.digest().bytes(), user_signed_message);
            // If the signature is valid then
            if (verify) {
                console.log("Signature Verified");
                console.log("Downloading")
                let receiptData={
                    'version':1,
                    'user_public_key':message_data.public_key,
                    'signed_Messaged':message_data.signed_Data,
                    'PII':message_data.PII,
                    'html':htmlContent,
                    'javascript':allJavascriptContent,
                    'policy':allPolicyContent,
                    'policyHash':policyHash
                }
                let fileName=`receipts/receipt${Date.now()}.json`;
                fs.writeFileSync(fileName, JSON.stringify(receiptData));
                console.log("Receipt Downloaded");
        }
        else{
            console.log('Signature not valid from client');
        }


        
        }
        if(message.title=='getSignedMessage'){
            let timestamp=new Date().getTime();
            let nounce=( 1e9*Math.random()*1e9*Math.random() ).toString(16);
            let consent_details={
                htmlContent:htmlContent,javascript: allJavascriptContent,policy: allPolicyContent,PII: message_data.PII,timestamp:timestamp,nounce:nounce
            };


            let rc = forge.md.sha256.create();
            rc.update(consent_details, 'utf8');
            let sigedMessaged = privateKey.sign(rc);
            console.log("Data Signed By the Server >> ")
            let data = {
                signedMessage: sigedMessaged,
                server_publickeypem: publicKey_pem,
                timestamp:timestamp,
                nounce:nounce
            };
            console.log("Sending Signed Data To the Client");
            ws.send(JSON.stringify({'title':'signedMessage','data':data}));

        }


    });

    ws.on("close", () => {
        console.log("Connection Closed with the client");
    });
    
});

async function getHtml(){
    htmlContent=await getContentFromUrl(htmlUrl);
}

async function gatherJavascriptFiles() {
    allJavascriptContent='';
	for (let javascripturl of javascriptUrls) {
        let javasciptcode = await getContentFromUrl(javascripturl);
        allJavascriptContent += javasciptcode;
	}
}

async function gatherPolicyFiles() {
    allPolicyContent='';
	for (let policyUrl of policyUrls) {
        let policyUrlContent = await getContentFromUrl(policyUrl);
        allPolicyContent += policyUrlContent;
	}
}

async function generateHash(){
    htmlHash=await sha256(htmlContent);
    policyHash=await sha256(allPolicyContent);
    javascriptHash=await sha256(allJavascriptContent);
    
}

async function getContentFromUrl(file) {
	var res = await fetch(file);
	res = await res.text();
	return res.toString(16);
}





























const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(cors());
app.post('/api/pisp', (req, res) => {
    console.log('Got body:', req.body);
    let user_public_key = forge.pki.publicKeyFromPem(req.body.public_key);
    let user_signed_message = req.body.signed_Data;
    let consent_details = req.body.consent_details;
    console.log("--------Got all details from client----------");


    let messageDigest = forge.md.sha256.create();
    messageDigest.update(consent_details, 'utf8');
    let verify = user_public_key.verify(messageDigest.digest().bytes(), user_signed_message);
    // If the signature is valid then
    if (verify) {
        console.log("Signature is valid");
        console.log("Server signing the data  >>")
        let rc = forge.md.sha256.create();
        rc.update(consent_details, 'utf8');
        let sigedMessaged = privateKey.sign(rc);
        console.log("<<<<<<<<<Data Signed By the Server>>>>>")
        let data = {
            signedMessage: sigedMessaged,
            publickey_pem: publicKey_pem,
            consent_details: consent_details
        };
        res.status(200).json({
            data
        });
        fs.writeFileSync(`receipts/123.json`, JSON.stringify(data));

    } else {
        console.log("Error:Signature is invalid");
    }


});


app.listen(8080, () => console.log(`Started server at http://localhost:8080!`));