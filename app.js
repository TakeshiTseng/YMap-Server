var express = require('express');
var mongoose = require('mongoose');
var fs = require('fs');

var app = new express();
app.use(express.bodyParser({ keepExtensions: true, uploadDir: './tmpfiles' }));
app.listen(8080)

mongoose.connect('mongodb://localhost/yummy_map');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
	console.log('db opened')
});


var PlacesSchema = mongoose.Schema({name:String,description:String,photoid:String,type:Number,longitude:Number,latitude:Number});
var Places = mongoose.model('places', PlacesSchema);

var PhotoSchema = mongoose.Schema({data:Buffer, name:String});
var Photo = mongoose.model('photos', PhotoSchema);

app.get('/search', function(req, res){
	var longitude = Number(req.param('long'));
	var latitude = Number(req.param('lat'));
	var radius = Number(req.param('radius')); // min:100 m, max: 1000 m
	
	// for debug
	console.log('search(' + longitude + ', ' + latitude + ', ' + radius + ')');

	radius = radius * 0.00000900900901;

	// console.log({latitude:{$gt:(latitude - radius), $lt:(latitude + radius)}, longitude:{$gt:(longitude - radius), $lt:(longitude + radius)}});
	Places.find({latitude:{$gt:(latitude - radius), $lt:(latitude + radius)}, longitude:{$gt:(longitude - radius), $lt:(longitude + radius)}},
	function(err, data){
		// console.log(data);
		res.send(data);
		res.end();
	});
	
	// res.send(result);
	
});

app.get('/upload', function(req, res){
	var longitude = req.param('long');
	var latitude = req.param('lat');
	var name = req.param('name');
	var description = req.param('desc');
	var type = req.param('type');
	var photoid = req.param('photoid');
	
	console.log({'name':name, 
			'description': description, 
			'longitude': longitude, 
			'latitude': latitude, 
			'type': type, 
			'photoid': photoid
		});


	if(!longitude
		|| !latitude
		|| !name
		|| !description
		|| !type
		|| !photoid){
		var result = {'type':'upload', 'msg':'錯誤，有東西是空的！', 'error':1};
		res.send(result);
		res.end();
	}else{
		console.log('insert ' + name);
		
		var new_place = 
		new Places({'name':name, 
			'description': description, 
			'longitude': longitude, 
			'latitude': latitude, 
			'type': type, 
			'photoid': photoid
		});
		new_place.save(function(err, new_place){
			if(!err){
				var result = {'type':'upload', 'msg':'OK', 'error':0};
				res.send(result);
				res.end();
			} else {
				var result = {'type':'upload', 'msg':'上傳錯誤！', 'error':1};
				res.send(result);
				res.end();
			}
		});
		
	}
});

app.post('/upload_photo', function(req, res){
	console.log('upload_photo');
	var name = req.files.file.name;
	var path = req.files.file.path;

	console.log(req.files);
	console.log(name);
	console.log(path);

	var photo = new Photo();

	photo.name = name;
	photo.data = fs.readFileSync(path);

	photo.save(function(err, photo){
		if(err){
			var result = {'type':'upload_photo', 'msg':'Error!', 'error':1};
			res.send(result);
			res.end();
		} else {
			var result = {'type':'upload_photo', 'msg':'OK', 'error':0, 'photo_id':photo._id};
			res.send(result);
			res.end();
		}
	})
});
















