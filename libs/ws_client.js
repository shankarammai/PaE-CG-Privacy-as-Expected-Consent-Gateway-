
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

window.MESSAGE_FIELD_SEPARATOR = ":::::";


//~~~~~~~~~handle websocket~~~~~

var ws = new WebSocket('ws://127.0.0.1:1337', 'echo-protocol');

ws.onopen = function (e) {
  console.log("[ConsP] connection open");
};




ws.onmessage = function (e) {
  // console.log("\n************************************[ConsP] rcv: " + e.data + "\n****************************" );
  // if ( e.type !== 'utf8' ) {
  //   console.log( "got message not UTF8 (discarded)" );
  //   return 0;
  // }

  var message = e.data;

  handleMessage( message );
    
};



ws.onclose = function (e) {
  console.log('[ConsP] Connection closed.');
}










//disable first button
document.getElementById('setup').disabled = false;
document.getElementById('setup').style.background='#11b3d4';
document.getElementById('msg1').disabled = true;
document.getElementById('msg1').style.background='#aaa';
document.getElementById('msg2').disabled = true;
document.getElementById('msg2').style.background='#aaa';

//protocol state
window.protocol_setup = false;
window.protocol_msg01 = false;
window.protocol_msg02 = false;


document.getElementById('setup').addEventListener( "click", function() {
    setup();
    document.getElementById('msg1').disabled = false;
    document.getElementById('msg1').style.background='#11b3d4';
}, false );


document.getElementById('msg1').addEventListener( "click", function() {
    prepareSignedAgreement();
    ws.send( "MSG01" + window.MESSAGE_FIELD_SEPARATOR + "U" + window.MESSAGE_FIELD_SEPARATOR + "S" + window.MESSAGE_FIELD_SEPARATOR + window.msg );
    console.log( "[ConsP] sent MSG01")
    document.getElementById('msg2').disabled = false;
    document.getElementById('msg2').style.background='#11b3d4';
}, false );


document.getElementById('msg2').addEventListener( "click", function() {
    //reply with MSG02
    ws.send( "MSG02" + window.MESSAGE_FIELD_SEPARATOR + "U" + window.MESSAGE_FIELD_SEPARATOR + "S" + window.MESSAGE_FIELD_SEPARATOR + window.msg );
    console.log( "[ConsP] sent MSG02")
}, false );




document.getElementById('Submit').addEventListener( "click", function() {
  setup();
  document.getElementById('msg1').disabled = false;
  document.getElementById('msg1').disabled = false;

  setTimeout( function(){
    document.getElementById( 'msg1' ).click();
  }, 5000); 

  setTimeout( function(){
    document.getElementById( 'msg2' ).click();
  }, 10000); 

}, false );








/********test
document.getElementById('msgtest').addEventListener( "click", function() {
    sendMsgTest();
    console.log( "[ConsP] sent MSG-TEST")
}, false );
*********/





function handleMessage( m ) {

  //MSG01, U-->s, sending agreement
  if( m.search( "MSG01" ) == 0 ) {
    var msg01 = {};
    var mf = m.split( window.MESSAGE_FIELD_SEPARATOR );

    console.log( "[ConsP] recv: MSG01 " + "(" + mf.length + " fields)" ); 

  handleMsg01( mf ); 
  }


  //MSG02, S-->U, sending evidence
  if( m.search( "MSG02" ) == 0 ) {
    var msg02 = {};
    var mf = m.split( window.MESSAGE_FIELD_SEPARATOR );

    console.log( "[ConsP] recv: MSG02 " + "(" + mf.length + " fields)" ); 

    handleMsg02( mf ) ; 
  }


}






//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
async function sendMsgTest() {
  //generate evidence
  var evid_u_plain = "";
  var md = forge.md.sha256.create(); 
  
  var keypair111 = await rsa.generateKeyPair({bits:1024,e:0x10001}) ;
  var kpu_u_pem111 = await forge.pki.publicKeyToPem( keypair111.publicKey );
  var kpv_u_pem111 = await forge.pki.privateKeyToPem( keypair111.privateKey );
  var evid_u = "haggr1qaz2wsx:::::nonu1qaz2wsx:::::nons1qaz2wsx:::::tsu1qaz2wsx:::::tss1qaz2wsx";

  md.update( evid_u, 'utf8' );
  evid_u_signed = keypair111.privateKey.sign( md );
  console.log( "[sendMsgTest] generated and signed evidence: \nmsg=" + evid_u + "\nmsg_signed= " + evid_u_signed  );
  // console.log( "private key: " + window.kpv_u_pem );

  //debug
  // if ( window.kpu_u.verify( md.digest().bytes(), evid_u_signed ) )
  //     console.log( "[Protocol] signature verifies" );

  msg = evid_u + window.MESSAGE_FIELD_SEPARATOR + 
      evid_u_signed + window.MESSAGE_FIELD_SEPARATOR + 
      kpv_u_pem111 + window.MESSAGE_FIELD_SEPARATOR + 
      kpu_u_pem111;   
  ws.send( "MSGTEST:::::" + msg );
}
