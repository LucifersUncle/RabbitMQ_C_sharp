using System;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;
using Newtonsoft.Json;

namespace CSharp_RequestSender
{
    class Program
    {
        static void Main(string[] args)
        {           
            bool endLoop = false;          

            while(!endLoop)
            {
                var factory = new ConnectionFactory() { Uri = new Uri("amqps://hjtwoowi:1d3Nm8bfeqwCgUIzy2O9st6jaawUOr6O@kangaroo.rmq.cloudamqp.com/hjtwoowi") };

                using (var connection = factory.CreateConnection())
                using (var channel = connection.CreateModel())
                {
                    
                    Console.WriteLine("Which hotel and roomnumber would you like to make af reservation for?");
                    
                    Console.Write("Hotel name: ");
                    string hotelName = Console.ReadLine();
                    
                    Console.Write("Room number: ");
                    string roomNumber = Console.ReadLine();

                    var hotelReservation = new HotelReservation(hotelName, roomNumber);
                    string hotelReservationJson = JsonConvert.SerializeObject(hotelReservation);
                    
                    var body = Encoding.UTF8.GetBytes(hotelReservationJson);

                    channel.BasicPublish(exchange: "ReservationsExchange",
                                         routingKey: "",
                                         basicProperties: null,
                                         body: body);                    

                    Console.WriteLine(" Reservation request for {0} has been sent!", hotelReservationJson);
                }

                Console.WriteLine(" Press [x] to exit.");
                Console.WriteLine(" Press any other key to make a new revervation.");

                if (Console.ReadLine() == "x"  || Console.ReadLine() == "X")
                {
                    endLoop = true;
                }
              
            }

        }        
    }

    public class HotelReservation
    {
        public string name;
        public string number;
        public HotelReservation (string myName, string myNumber)
        {
            name = myName;
            number = myNumber;
        }
    }
}
