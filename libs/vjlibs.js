
/*
 * Project: Web-of-Receipts - Demonstrating consent. 
 *
 * @version 0.1 (client)
 * @author Vitor Jesus [code-consentjs@vitorjesus.com]
 * @copyright Vitor Jesus 2019-
 * @license ask author
 *
 * http://www.vitorjesus.com
 * http://www.trustless-team.com
 *
 */

/*
 * I don't care how much you know inside-out javascript. 
 * Bad programmers also need love. Have mercy.
 *
 */




var sha256=require(['SHAACT.js']);

var text;
var rsa=forge.pki.rsa;
window.ff="";
window.H_U="";
window.signed="";
window.pemPublic="";
window.pemPrivate="";
window.U_Sign="";
window.CReceipt="";
window.start="";

window.hashes = {};
window.agreement = {};
window.evidence = "";
window.signed_evidence = "";







async function fetchAndHashFile( file, pur ) {
    var res = await fetch( file );
    window.agreement[pur] = res = await res.text();
    fileContents = res.toString(16)
    // console.log("[ConsP] fetchAndHashFile (" + pur + "):" + fileContents.substring(0, 30).replace(/(\r\n|\n|\r)/gm,"") + " ( ... )" );
    await hashAndStore( fileContents, pur );
}


async function fetchAndHashValues( s, pur ) {
    // console.log("[ConsP] fetchAndHashValues (" + pur + "):" + s.substring(0, 30).replace(/(\r\n|\n|\r)/gm,"") + " ( ... )" );
    window.agreement[pur] = s;
    await hashAndStore( s, pur );
}






async function hashAndStore( text, pur ) {
    text = await text.toString(16);
    // console.log( "[vjlibs] hashingAndStore: pur= " +pur +" text = " +text.substring(0, 210).replace(/(\r\n|\n|\r)/gm,"") );
    window.ff = await sha256( text );   //VJ-TODO: confirm this is hashing correctly
    await window.ff.toString(16);

    window.hashes[pur] = window.ff;

    console.log("[ConsP] hash (" + pur + "):" + window.hashes[pur] );
}






async function getComponentsOfAgreement() {
    await fetchAndHashFile( 'http://127.0.0.1/web-of-receipts/PrivacyPolicy.txt', 'policy' );       //VJ-TODO: to find a way to detect where this file is
    await fetchAndHashFile( 'http://127.0.0.1/web-of-receipts/index.html', 'html' );     //VJ-TODO: to find a way to detect the page url
    await fetchAndHashFile( 'http://127.0.0.1/web-of-receipts/vjlibs.js', 'javascript');    //VJ-TODO: to find a way to collect all javascript files (parse html and search for <script>)

    //personal details
    var el2 = await document.getElementById('fname').value;   // fetch this automatically with metadata
    var el3 = await document.getElementById('lname').value;
    var el4 = await document.getElementById('email').value;
    var pii = el2+el3+el4;
    await fetchAndHashValues( pii, 'pii' );

    console.log("[ConsP] fetched and hashed agreement: policy, html, javascript, pii" );
}



