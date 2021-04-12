using System;
using RabbitMQ.Client;
using System.Text;

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
                    Console.WriteLine("Wich hotel would you like to make af reservation for?");

                    string message = Console.ReadLine();
                    var body = Encoding.UTF8.GetBytes(message);

                    channel.BasicPublish(exchange: "ReservationsExchange",
                                         routingKey: "",
                                         basicProperties: null,
                                         body: body);                    

                    Console.WriteLine(" Reservation request for {0} has been sent!", message);
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
}
