var amqp = require('amqplib/callback_api');
const readline = require('readline')
const dotenv = require('dotenv');
dotenv.config();

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

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function whenConnected() {
  startPublisher();
        rl.question("Welcome to the Node reservation system, which hotel would you like to make a reservation at? : ", function(answer)
        {
          var hotelname = answer;
          rl.question("Which room number? ", function(answer)
          {
            makeReservation(hotelname,answer);
          })
          
        });
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

function makeReservation(hotelName, hotelnum) {

      var hotel = { 
        name : hotelName,
        number : hotelnum
    };

    var jsonString = JSON.stringify(hotel);
    publish("ReservationsExchange", "", new Buffer.from(jsonString));
    console.log("Reservation sent, await confirmation from confirmation system - Goodbye");
};

function closeOnErr(err) {
  if (!err) return false;
  console.error("[AMQP] error", err);
  amqpConn.close();
  return true;
}
  
start();