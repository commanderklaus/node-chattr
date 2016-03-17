var express = require('express');
var app = express();
var server = require('http').createServer(app); // create http server and dispatch requests to express
var io = require('socket.io')(server);
var redis = require('redis');
var redisClient = redis.createClient();
var messages = [];

var storeMessage = function (name, data) {
	var message = JSON.stringify({ name: name, data: data }); // create stringified object for storage in Redis
	
	redisClient.lpush("messages", message, function (err, response){ // push message in Redis using list data structure
		redisClient.ltrim("messages", 0, 9); // keep last 10 messages
	});

	if (messages.length > 10) { // if we have more then 10 messages
		messages.shift(); // remove first one
	}
};

io.on('connection', function (client) {
	console.log('client connected');
	//client.emit('messages', { hello: 'world'}); // emit the messages event on client (browser)

	client.on('join', function (name) { // event for when users join
		console.log(name + ' joined');

		client.broadcast.emit('add chatter', name); // let every client know that a new chatter joined

		redisClient.smembers('names', function (err, names) {
			names.forEach(function (name){


			});
		});

		redisClient.sadd('chatters', name);

		redisClient.lrange("messages", 0, -1, function (err, messages) { // get all messages stored
			messages = messages.reverse(); // reverse so they are emitted in correct order

			client.nickname = name;

			messages.forEach(function (message) {
				message = JSON.parse(message); // convert string back into object
				client.emit("messages", message.name + ": " + message.data);
			})
		});
	});

	client.on('messages', function(data) { // server listens for messages
		console.log(data);
		var nickname = client.nickname;
		client.broadcast.emit('messages', nickname + ": " + data); // broadcast messages to all clients connected (except current)
		client.emit('messages', nickname + ": " + data); // broadcast to current client
		storeMessage(nickname, data);
	});

	// when a client disconnects
	client.on('disconnect', function (name) {
		// retrieve the nickname of user leaving the chat
		client.get('nickname', function (err, name) {
			// broadcast 'remove chatter' event, passing the name
			client.broadcast.emit('remove chatter', name);

			// remove chatter from 'chatters' list in Redis
			redisClient.srem('chatters', name);
		}
	});
});

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

server.listen(8080);