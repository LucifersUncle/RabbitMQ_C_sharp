var amqp = require('amqplib/callback_api');
const dotenv = require('dotenv');
const { Mongoose } = require('mongoose');
const hotel = require('./models/hotelmodel')
require('Mongoose');
require ('./models/db');
dotenv.config();

// if the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;
function start() {
  amqp.connect(process.env.CLOUDAMQP_URL + "?heartbeat=60", function(err, conn) {
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(start, 1000);
    }
    conn.on("error", function(err) {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] conn error", err.message);
      }
    });
    conn.on("close", function() {
      console.error("[AMQP] reconnecting");
      return setTimeout(start, 1000);
    });
    console.log("[AMQP] connected");
    amqpConn = conn;
    whenConnected();
  });
}

function whenConnected() {
  startPublisher();
  startWorker();
}

var pubChannel = null;
var offlinePubQueue = [];
function startPublisher() {
  amqpConn.createConfirmChannel(function(err, ch) {
    if (closeOnErr(err)) return;
      ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    pubChannel = ch;
    while (true) {
      var m = offlinePubQueue.shift();
      if (!m) break;
      publish(m[0], m[1], m[2]);
    }
  });
}

function publish(exchange, routingKey, content) {
  try {
    pubChannel.publish(exchange, routingKey, content, { persistent: true },
                      function(err, ok) {
                        if (err) {
                          console.error("[AMQP] publish", err);
                          offlinePubQueue.push([exchange, routingKey, content]);
                          pubChannel.connection.close();
                        }
                      });
  } catch (e) {
    console.error("[AMQP] publish", e.message);
    offlinePubQueue.push([exchange, routingKey, content]);
  }
}
// A worker that acks messages only if processed succesfully
function startWorker() {
  amqpConn.createChannel(function(err, ch) {
    if (closeOnErr(err)) return;
    ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });

    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    ch.prefetch(10);
    ch.assertQueue("ReservationQueue", { durable: true }, function(err, _ok) {
      if (closeOnErr(err)) return;
      ch.consume("ReservationQueue", processMsg, { noAck: false });
      console.log("Consumer is started");
    });

     function processMsg (msg) {
      work(msg, async function(ok) {
        try {
          if (ok){
            const hotelReservation = JSON.parse(msg.content);
            var myHotel = await hotel.findOne({Name: hotelReservation.name, RoomNumber: hotelReservation.number})
                 
            if(myHotel === null)
            {
              sendNoHotelWithSpecifiedRoom(hotelReservation);              
            }
            else if(myHotel.Rented == true)
            {
              sendHotelRoomReserved(hotelReservation);
            }
            else 
            {
              myHotel.Rented = true;
              await myHotel.save();
              sendConfirmation(hotelReservation.name);   
            }   
            
            ch.ack(msg);               

        }
          else
            ch.reject(msg, true);
        } catch (e) {
          closeOnErr(e);
        }
      });
    }
  });
}

function sendNoHotelWithSpecifiedRoom(hotelReservation)
{  
  publish("ConfirmationExchange", "", new Buffer.from(hotelReservation.name + "does not exist"));
  console.log("Hotel does not exist");
}

function sendHotelRoomReserved(hotelReservation)
{
  publish("ConfirmationExchange", "", new Buffer.from("Room: " + hotelReservation.number + "in hotel: " + hotelReservation.name + "is reserved"));
  console.log("Room is already reserved");
}

function sendConfirmation(hotelReservation) {
    publish("ConfirmationExchange", "", new Buffer.from("Room: " + hotelReservation.number + "in hotel: " + hotelReservation.name + "has been reserved"));
    console.log("Confirmation sent");
};

function work(msg, cb) {
  console.log("Got msg ", msg.content.toString());
  cb(true);
}

function closeOnErr(err) {
  if (!err) return false;
  console.error("[AMQP] error", err);
  amqpConn.close();
  return true;
}

start();