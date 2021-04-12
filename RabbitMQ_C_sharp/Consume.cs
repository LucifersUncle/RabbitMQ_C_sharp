using System;
using System.Text;
using System.Threading;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

//==Source==//
//https://www.cloudamqp.com/docs/dotnet.html

namespace RabbitMQ_C_sharp
{
    public class Consume
    {
        private ManualResetEvent _resetEvent = new ManualResetEvent(false);
        private IConnection _connection;
        private IModel _channel;

        public Consume(string url, ManualResetEvent resetEvent)
        {
            _resetEvent = resetEvent;

            // CloudAMQP URL in format amqp://user:pass@hostName:port/vhost
            //string _url = "amqps://hjtwoowi:1d3Nm8bfeqwCgUIzy2O9st6jaawUOr6O@kangaroo.rmq.cloudamqp.com/hjtwoowi";

            // create a connection and open a channel, dispose them when done
            var factory = new ConnectionFactory
            {
                Uri = new Uri(url)
            };
            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();
        }

        public void ConsumeQueue()
        {
            // ensure that the queue exists before we access it
            var queueName = "jobs";
            bool durable = true;
            bool exclusive = false;
            bool autoDelete = false;

            _channel.QueueDeclare(queueName, durable, exclusive, autoDelete, null);

            var consumer = new EventingBasicConsumer(_channel);

            // add the message receive event
            consumer.Received += (model, deliveryEventArgs) =>
            {
                var body = deliveryEventArgs.Body.ToArray();
                
                
                // convert the message back from byte[] to a string
                var message = Encoding.UTF8.GetString(body);
                
                
                Console.WriteLine("** Received message: {0} by Consumer thread **", message);
                
                
                // ack the message, ie. confirm that we have processed it
                // otherwise it will be requeued a bit later
                _channel.BasicAck(deliveryEventArgs.DeliveryTag, false);
            };

            // start consuming
            _ = _channel.BasicConsume(consumer, queueName);
            
            
            
            // Wait for the reset event and clean up when it triggers
            _resetEvent.WaitOne();
            _channel?.Close();
            _channel = null;
            _connection?.Close();
            _connection = null;
        }
    }
}