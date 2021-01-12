const {v4 : uuidv4} = require('uuid')
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors')

const MongoClient = require('mongodb').MongoClient;
const dburl = "mongodb://localhost:27017/receiptStorage";

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: "50mb" ,extended: true, parameterLimit: 50000 }));
app.use(cors());
app.listen(1001, () => console.log(`Receipt Storage Server started at http://localhost:1001!`));


app.post('/api/save', (req, res) => {
	console.log("Save Receipt Request");

	MongoClient.connect(dburl, function(err, client) {
		if (err) throw err;
		console.log("Database Connection");
		const db=client.db("Receipts_Storage");
		receiptId=uuidv4();
		db.collection('receipts').insertOne({
			receitId:receiptId,
			domain:req.body.domain,
			userId:req.body.userId,
			userToken:req.body.userToken,
			created_date:req.body.created_date,
			receipt: req.body.receipt,
			fullurl:req.body.fullurl
	  },function(error,result){
		if ( error ){res.json({success:false});} 
		if ( result ){ res.json({success:true}); }
	  });
		client.close();
	  });

});

app.post('/api/get', (req, res) => {
	console.log("Save Receipt Request");
	
	var domain=req.body.domain;
	var userId=req.body.userId;
	var userToken=req.body.userToken;
	var search={userId:userId,userToken:userToken,domain:domain};

	if(typeof domain == 'undefined'){
		var search={userId:userId,userToken:userToken};
	}
	console.log(search);
	MongoClient.connect(dburl, function(err, client) {
		if (err) throw err;
		console.log("Database Connection");
		const db=client.db("Receipts_Storage");
		db.collection('receipts').find(search).sort( { 'created_date': -1 } ).toArray(function(err, result) {
			if (err) throw err;
			console.log({result});
			res.send(result);
		  });

		client.close();
	  });

});

app.get('/', (req, res) => {
	console.log('Got body:', req.body);
	var search={userId:'1234',userToken:'abcdef',domain:'localhost'};

	MongoClient.connect(dburl, function(err, client) {
		if (err) throw err;
		console.log("Database Connection");
		const db=client.db("Receipts_Storage");
		db.collection('receipts').find(search).sort( { 'created_date': -1 } ).toArray(function(err, result) {
			if (err) throw err;
			res.json(result);
		  });

		client.close();
	  });
	}); 

