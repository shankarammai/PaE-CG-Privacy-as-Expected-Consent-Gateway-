
/*
 * Project: Web-of-Receipts - Demonstrating consent. 
 *
 * @version 0.1 (client)
 * @author Vitor Jesus [code-consentjs@vitorjesus.com]
 * @copyright Vitor Jesus 2019-
 * @license ask author
 *
 * http://www.vitorjesus.com
 *
 */

/*
 * I don't care how much you know inside-out javascript. 
 * Bad programmers also need love. Have mercy.
 *
 */

var rsa=forge.pki.rsa;



//~~~~~~~~~~~~setup()~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
async function setup() {
    window.timestamp = new Date().getTime();
    window.timestamp = window.timestamp.toString(16);
    // console.log("[ConsP] ~~~~~BEGIN: SETUP~~~~~" );
    // console.log( "[ConsP] timestamp: " + window.timestamp );

    //generate user keys
    var keypair = await rsa.generateKeyPair({bits:1024,e:0x10001}) ;
    window.kpu_u = keypair.publicKey;
    window.kpv_u = keypair.privateKey;
    window.kpu_u_pem = await forge.pki.publicKeyToPem( keypair.publicKey );
    window.kpv_u_pem = await forge.pki.privateKeyToPem( keypair.privateKey );
    console.log("[ConsP] Generated KPU_U, KPV_U, timestamp, nonce" );
    // console.log(  
    //     "KPU_U=" + window.kpu_u_pem.substring(0, 50).replace(/(\r\n|\n|\r)/gm,"") + 
    //     "KPV_U=" + window.kpv_u_pem.substring(0, 50).replace(/(\r\n|\n|\r)/gm,"")
    // );

    //get Agreement
    await getComponentsOfAgreement();

    //generate nonce
    window.nonce = await ( 1e9*Math.random()*1e9*Math.random() ).toString(16);       //VJ-TODO: long enough?
    // console.log( "[ConsP] nonce= " + window.nonce );

    //hash whole agreement
    hAll = window.hashes['policy'] + window.hashes['html'] + window.hashes['javascript'] + window.hashes['pii'];
    // console.log( "[ConsP] hashing: all= " + hAll );
    await hashAndStore( hAll, 'agreement' );

    // console.log("[ConsP] ~~~~~END: SETUP~~~~~" );
}




//~~~~~~~~~~~~send signed agreement to Service~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
async function prepareSignedAgreement() {
    // console.log( "[ConsP] ~~~~~BEGIN: PREPARE SIGNED AGREEMENT~~~~~" );

    var rc = forge.md.sha256.create();
	let m1 = window.hashes['agreement'] + window.MESSAGE_FIELD_SEPARATOR + window.timestamp + window.MESSAGE_FIELD_SEPARATOR + window.nonce;

    rc.update( m1, 'utf8' );
    msg_signed = window.kpv_u.sign( rc );
    // console.log( "[ConsP] msg_signed= " + msg_signed.toString(16) );

    //read personal data
    var el2 = document.getElementById('fname').value;   //VJ-TODO: fetch all values dynamically from the form, including the metadata and the form itself
    var el3 = document.getElementById('lname').value;
    var el4 = document.getElementById('email').value;
    var pii = el2+el3+el4;


	window.msg = msg_signed + window.MESSAGE_FIELD_SEPARATOR + m1 + window.MESSAGE_FIELD_SEPARATOR + kpu_u_pem + window.MESSAGE_FIELD_SEPARATOR + pii;
    // console.log( "[ConsP] msg= " + msg );
    // console.log( "[ConsP] ~~~~~END: PREPARE SIGNED AGREEMENT~~~~~" );
}





//~~~~~~~~~~~~~handleMsg01~~~~~~~~~~~
async function handleMsg01( mf ) {
    // var i = 0;
    // mf.forEach( function(a) {
    //   console.log( "[protocol] mf: " + i + ": " + a );//.substring(0, 50).replace(/(\r\n|\n|\r)/gm,"") );
    //   i++;
    // });

    var msg01 = {};
    msg01['type'] = mf[0];
    msg01['sender'] = mf[1];
    msg01['receiver'] = mf[2];
    msg01['msg_signed'] = mf[3];
    msg01['hash_agreement'] = mf[4];
    msg01['timestamp'] = mf[5];
    msg01['nonce'] = mf[6];
    msg01['kpu_s_pem'] = mf[7];


    //check agreements match
    if ( window.hashes['agreement'] == msg01['hash_agreement'] ) {
        console.log( "[ConsP] hashes of agreement match" );
    }
    else {
        console.log( "[ConsP] hashes of agreement do NOT match.\n*********\n*********\n*********RECEIPT WILL BE INVALID\n*********\n*********\n***********");
        //VJ-TODO: handle this case
    }

    //verify S sent the correct key
    window.kpu_s_pem = msg01['kpu_s_pem'];
    window.kpu_s = forge.pki.publicKeyFromPem( msg01['kpu_s_pem'] );
    var md = forge.md.sha256.create(); 
    md.update( msg01['hash_agreement'] + window.MESSAGE_FIELD_SEPARATOR + msg01['timestamp'] + window.MESSAGE_FIELD_SEPARATOR + msg01['nonce'], 'utf8' ); 

    if ( window.kpu_s.verify( md.digest().bytes(), msg01['msg_signed'] ) ) {
        console.log( "[ConsP] Agreement and signature from Service verified" );
    }
    else {
        console.log( "[ConsP] signature mismatch\n*********\n*********\n*********RECEIPT WILL BE INVALID\n*********\n*********\n***********" );
        //VJ-TODO: handle this case
    }


    //generate evidence
    var evid_u;
    evid_u =
        msg01['hash_agreement'] + 
        window.MESSAGE_FIELD_SEPARATOR +
        window.nonce +
        window.MESSAGE_FIELD_SEPARATOR +
        msg01['nonce'] +
        window.MESSAGE_FIELD_SEPARATOR +
        window.timestamp +
        window.MESSAGE_FIELD_SEPARATOR +
        msg01['timestamp'];
    
    var md2 = forge.md.sha256.create();!
    md2.update( evid_u, 'utf8' );
    evid_u_signed = await window.kpv_u.sign( md2 );
    console.log( "[Protocol] generated and signed evidence" );


    // window.msg = evid_u + window.MESSAGE_FIELD_SEPARATOR + evid_u_signed + window.MESSAGE_FIELD_SEPARATOR + window.kpv_u_pem + window.MESSAGE_FIELD_SEPARATOR + window.kpu_u_pem;   
    window.msg = evid_u + window.MESSAGE_FIELD_SEPARATOR + evid_u_signed;
}


    
//~~~~~~~~~~~~~handleMsg02~~~~~~~~~~~
async function handleMsg02( mf ) {
    // var i = 0;
    // mf.forEach( function(a) {
    //   console.log( "[protocol] mf: " + i + ": " + a );//.substring(0, 50).replace(/(\r\n|\n|\r)/gm,"") );
    //   i++;
    // });

    console.log( "[protocol Recv MSG02: " + mf );

    //generate and store receipt
    var receipt = 
        window.agreement['policy'] + window.MESSAGE_FIELD_SEPARATOR +
        window.agreement['html'] + window.MESSAGE_FIELD_SEPARATOR +
        window.agreement['javascript'] + window.MESSAGE_FIELD_SEPARATOR +
        window.agreement['html'] + window.MESSAGE_FIELD_SEPARATOR +
        window.agreement['pii'] + window.MESSAGE_FIELD_SEPARATOR +
        window.kpu_s_pem + window.MESSAGE_FIELD_SEPARATOR +
        window.kpv_u_pem + window.MESSAGE_FIELD_SEPARATOR +
        window.kpu_u_pem;

    
    mf.forEach( function( f ) {
        receipt = receipt + window.MESSAGE_FIELD_SEPARATOR + f;
    });

    var fn = "receipt-" + window.timestamp + ".txt";

    download( receipt, fn );

    console.log( "[protocol] Receipt created: " + fn );



}




//~~~~~~~~~~~download data to a file~~~~~~~~~~~~~~~~~
//copied from https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
function download( data, filename ) {
    var file = new Blob([data], {type: "text/plain"});
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


