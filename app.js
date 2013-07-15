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


var PlacesSchema = mongoose.Schema({name:String, descriptions:Array, type:Number, longitude:Number, latitude:Number });
var Places = mongoose.model('places', PlacesSchema);

/*
 * description:
 * 
 * {author_id:String,
 *  description:String,
 *  photo:String}
 */

var PhotoSchema = mongoose.Schema({data:Buffer, name:String});
var Photo = mongoose.model('photos', PhotoSchema);

var MemberSchema = mongoose.Schema({fbid:String, name:String, achievement:Array, favorite:Array});
var Member = mongoose.model('member', MemberSchema);


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
		if(err){
			var result = { 'type':'search', 'msg':'error!', 'error':true };
			res.send(result);
			res.end();
		} else {
			var result = { 'type':'search', 'msg':'OK!', 'error':false, 'data':data };
			res.send(result);
			res.end();
		}
		// console.log(data);
		res.send(data);
		res.end();
	});
	// res.send(result);
	
});

app.get('/create_place', function(req, res){
	var name = req.param('name');
	var longitude = req.param('long');
	var latitude = req.param('lat');
	var description = req.param('desc');
	var type = req.param('type');
	var photoid = req.param('photoid');
	var author_id = req.param('author_id');
	var star = req.param('star');
	console.log('insert ' + name);

	var description = {'author_id':author_id, 'description':description, 'photoid': photoid, 'star':star};

	var new_place = 
	new Places({'name':name, 'descriptions':[description], 'type':type, 'longitude':longitude, 'latitude':latitude});
	new_place.save(function(err, new_place){
		if(!err){
			var result = {'type':'create_place', 'msg':'OK', 'error':false, 'place':new_place};
			res.send(result);
			res.end();
		} else {
			var result = {'type':'create_place', 'msg':'上傳錯誤！', 'error':true};
			res.send(result);
			res.end();
		}
	});
	
});

app.get('/add_description', function(req, res){
	var id = req.param('id');
	var description = req.param('desc');
	var photoid = req.param('photoid');
	var author_id = req.param('author_id');
	var star = req.param('star');

	var desc = {'author_id':author_id, 'description':description, 'photoid': photoid};
	
	Places.update({ '_id':id }, { $addToSet:{'descriptions':desc } }, 
		function(err, data){
		if(err){
			var result = {'type':'upload', 'msg':'上傳錯誤！', 'error':true};
			console.log(err);
			res.send(result);
			res.end();
		} else {
			var result = {'type':'upload', 'msg':'OK', 'error':false };
			res.send(result);
			res.end();
		}
	});
	

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
			var result = {'type':'upload_photo', 'msg':'Error!', 'error':true};
			res.send(result);
			res.end();
		} else {
			var result = {'type':'upload_photo', 'msg':'OK', 'error':false, 'photo_id':photo._id};
			res.send(result);
			res.end();
		}
	})
});

app.get('get_photo', function(req, res){
	var pid = req.param('pid');
	Photo.find({'_id':"ObjectId('" + pid +"')"}, function(err, photo){
		if(err){
			var result = {'type':'get_photo', 'msg':'Error!', 'error':true};
			res.send(result);
			res.end();
		} else {
			res.contentType('image/jpg');
			res.send(photo.data);
		}
	});
});

app.get('/mapview', function(req, res){
	res.sendfile('mapview.html');
});

app.get('/favorite', function(req, res){
	var fbid = req.param('fbid');
	Member.find({'fbid':fbid}, function(err, mem){
		if(!err){
			res.send(mem.favorite);
			res.end();
		} else {
			res.send({type:'favorite', msg:'查詢錯誤', error:true});
			res.end();
		}
	});
});

app.get('/add_favorite', function(req, res){
	var fbid = req.param('fbid');
	var place_id = req.param('pid');

	Member.find({'fbid': fbid}, function(err, data){
		if(err) {
			res.send({type:'add_favorite', msg:'查詢錯誤', error:true});
			res.end();
		} else if(data){
			Member.update({'fbid': fbid}, {$addtoset: {favorite:place_id}});
			res.send({type:'add_favorite', msg:'OK', error:false});
		}
	});
});

app.get('/login', function(req, res){
	var fbid = req.param('fbid');
	Member.find({ 'fbid': fbid }, function(err, data){
		if(err) {
			res.send({ type:'login', msg:'查詢錯誤', error:true });
			res.end();
		} else {
			if(data){
				res.send({ type:'login', msg:'OK', error:false });
				res.end();
			} else {
				var m = new Member({ 'fbid':fbid });
				m.save(function(err, mem){
					if(err) {
						res.send({ type:'login', msg:'寫入錯誤', error:true });
						res.end();
					} else {
						res.send({ type:'login', msg:'OK', error:false });
						res.end();
					}
				});
			}
		}
	});
});








