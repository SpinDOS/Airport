using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System;
using System.Collections;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Collections.Generic;
using Newtonsoft.Json;
using System.Linq;
using System.Threading;
using Newtonsoft.Json.Linq;

namespace CertainBus
{
    enum BusStates
    {
        Free,
        Busy,
        DrivingToGarage,
        DrivingToAirplane,
        DrivingToGate,
        ReadyNearAirplane, // ready for passengers
        ReadyNearGate,
        WaitForPassengersNearAirplane,
        Loading, // airplane -> bus || gate -> bus
        Unloading // bus -> airplane || bus -> gate
    }

    struct ValueLoading
    {
        [JsonProperty("airplaneId")]
        public Guid airplaneId;
        [JsonProperty("busId")]
        public string busId;
        [JsonProperty("count")]
        public int count;
    }

    struct ValueUnloading
    {
        [JsonProperty("airplaneId")]
        public Guid airplaneId;
        [JsonProperty("busId")]
        public string busId;
        [JsonProperty("passengers")]
        public Guid[] passengers;
    }

    struct LoadPassengersMQ // с точки зрения автобуса
    {
        [JsonProperty("type")]
        public string type;
        [JsonProperty("value")]
        public ValueLoading value;
    }
    
    struct UnloadPassengersMQ // с точки зрения автобуса
    {
        [JsonProperty("type")]
        public string type;
        [JsonProperty("value")]
        public ValueUnloading value;
    }
    
    struct ServiceMessage
    {
        [JsonProperty("service")]
        public string service;
        [JsonProperty("request")]
        public string request;
        [JsonProperty("action")]
        public string action;
        [JsonProperty("gate_id")]
        public string gate_id;
        [JsonProperty("airplane_id")]
        public string airplane_id;
        [JsonProperty("parking_id")]
        public string parking_id;
    }

    struct MovementMessage
    {
        [JsonProperty("service")]
        public string service;
        [JsonProperty("request")]
        public string request;
        [JsonProperty("from")]
        public string from;
        [JsonProperty("to")]
        public string to;
        [JsonProperty("status")]
        public string status;
    }

    struct LoadMessage
    {
        [JsonProperty("busId")]
        public string busId;
        [JsonProperty("airplaneId")]
        public string airplaneId;
        [JsonProperty("passengers")]
        public string[] passengers;
    }

    struct APIStatusMessage
    {
        [JsonProperty("newStatus")]
        public string newStatus;
        [JsonProperty("transportID")]
        public Guid? transportID;
        [JsonProperty("passengers")]
        public string[] passengers;
    }

    struct APIAirplaneInfoMessage
    {
        [JsonProperty("id")]
        public string id;
        [JsonProperty("departureFlightId")]
        public string departureFlightId;
    }

    struct UnloadMessage
    {
        [JsonProperty("busId")]
        public string busId;
        [JsonProperty("airplaneId")]
        public string airplaneId;
        [JsonProperty("result")]
        public string result;
    }

    struct VisualizerMessage
    {
        [JsonProperty("Type")]
        public string Type;
        [JsonProperty("From")]
        public string From;
        [JsonProperty("To")]
        public string To;
        [JsonProperty("Transport")]
        public string Transport;
        [JsonProperty("Duration")]
        public int Duration;
    }

    struct VisualizerInit
    {
        [JsonProperty("Type")]
        public string Type;
        [JsonProperty("TransportType")]
        public string TransportType;
        [JsonProperty("Ids")]
        public string[] Ids;
        [JsonProperty("Add")]
        public bool Add;
    }

    struct Passenger
    {
        [JsonProperty("flight")]
        public string flightId;
        [JsonProperty("id")]
        public string id;
    }
    
    class Bus
    {
        public Guid Id { get; }
        public int SeatCount { get; }
        public string AirplaneId { get; set; }
        public string FlightId { get; set; }
        public string FromLoc { get; set; }
        public string ToLoc { get; set; }
        public string ParkingId { get; set; }
        public string GateId { get; set; }
        public string FinalDestination { get; set; }
        public List<string> Passengers { get; set; }
        public BusStates State { get; set; }

        private string _initLoc { get; }

        public Bus(string initLocation)
        {
            SeatCount = 50;
            //Id = Guid.NewGuid();
            Id = new Guid("027cbfab-9d6e-4667-a86e-b8adf986372e");
            Passengers = new List<string>();
            FromLoc = _initLoc = initLocation;
            ParkingId = GateId = AirplaneId = FlightId = ToLoc = FinalDestination = null;
            State = BusStates.Free;
        }
        
        public void ClearBus()
        {
            Passengers = new List<string>();
            ParkingId = GateId = AirplaneId = ToLoc = FlightId = FinalDestination = null;
            FromLoc = _initLoc;
            Passengers.Clear();
            State = BusStates.Free;
        }

        private string GetBusInfoStr(object iInfo)
        {
            if (iInfo == null)
                return "NoInfo";
            return iInfo.ToString();
        }

        public override string ToString()
        {
            return "(BusId)     " + GetBusInfoStr(Id) + " | Seat count: " +
                   GetBusInfoStr(SeatCount) + " | (" + State + ")\n" +
                   "(AirplaneId)  " + GetBusInfoStr(AirplaneId) + ": " + 
                   "\t"+ GetBusInfoStr(FromLoc) + " -> " + 
                   "\t"+ GetBusInfoStr(ToLoc);
        }
    }
    
    class Program
    {
        static ConnectionFactory factory;
        private static HttpClient client;
        static Bus thisBus;
        static string garageName;
        private static string UNDQName;
        private static string VisualizerQName;
        private static string airplaneQName;
        private static string centerQ;
        private static string busQ;
        private static string rcvdMessage;
        private static string APIURL;
        private static System.Timers.Timer timer;
        
        
        static void Main(string[] args)
        {
            garageName = "BusGarage";
            UNDQName = "Bus"; // "gtc.gate"
            airplaneQName = "Bus"; // "Airplane"
            VisualizerQName = "Bus"; // "visualizer"
            
            APIURL = "http://quantum0.pythonanywhere.com"; // API

            factory = new ConnectionFactory();
            thisBus = new Bus(garageName);
            client = new HttpClient();
            client.BaseAddress = new Uri(APIURL);
            
            timer = new System.Timers.Timer(3000);
            timer.Enabled = false;

            factory.Uri = new Uri("amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK" +
            "@duckbill.rmq.cloudamqp.com/aazhpoyi"); // сервер
            //factory.Uri = new Uri("amqp://user:password@10.99.67.120:5672");
            
            centerQ = "Bus";
            busQ = centerQ + "|" + Convert.ToString(thisBus.Id);

            ColoredWriteLine(busQ, ConsoleColor.Yellow);

            using (var connection = factory.CreateConnection())
            {
                using (var channel = connection.CreateModel())
                {
                    channel.QueueDeclare(queue: busQ,
                        durable: true,
                        exclusive: true,
                        autoDelete: false,
                        arguments: null);
                    AcknowledgeBusState(channel, centerQ, thisBus.Id, thisBus.State);
                    //VisualizerInit(channel, VisualizerQName);
                    
                    timer.Elapsed += (obj, e) =>
                    {
                        if (thisBus.State == BusStates.Free)
                        {
                            timer.Enabled = false;
                            thisBus.State = BusStates.DrivingToGarage;
                            thisBus.FinalDestination = garageName;
                            BusMove(channel, UNDQName, thisBus.FromLoc, thisBus.FinalDestination, "need");
                        }
                    };

                    channel.BasicQos(prefetchSize: 0, prefetchCount: 1, global: false);

                    var consumer = new EventingBasicConsumer(channel);

                    consumer.Received += OnReceive;
                    consumer.Received += (model, ea) =>
                    {
                        DetectMessage(channel);
                        
                        ColoredWriteLine(Convert.ToString(thisBus.State), ConsoleColor.Blue);
                        
                        if (thisBus.State == BusStates.ReadyNearAirplane ||
                            thisBus.State == BusStates.ReadyNearGate)
                        {
                            if (thisBus.Passengers.Count == 0)
                            {
                                if (thisBus.State == BusStates.ReadyNearAirplane)
                                    LoadPassengersFromAirplane(channel);
                                else
                                    LoadPassengersFromGate();
                            }
                            else
                            {
                                if (thisBus.State == BusStates.ReadyNearAirplane)
                                    UnloadPassengersToAirplane(channel);
                                else
                                    UnloadPassengersToGate();
                            }
                        }
                        ColoredWriteLine(Convert.ToString(thisBus.State), ConsoleColor.Blue);
                        
                        if (thisBus.State == BusStates.Free && thisBus.FromLoc != garageName)
                        {
                            AcknowledgeBusState(channel, centerQ, thisBus.Id, thisBus.State);
                            timer.Start();
                            Console.WriteLine("Timer started");
                        }
                        
                        // в случае полной обработки сообщения вызывать ack
                        channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
                    };
                    channel.BasicConsume(queue: busQ,
                        autoAck: false,
                        consumer: consumer);

                    // PRESS [ENTER] TO EXIT
                    Console.WriteLine(" Press [enter] to exit.");
                    Console.ReadLine();
                }
            }
        }

        static void OnReceive(object model, BasicDeliverEventArgs e)
        {
            var body = e.Body;
            rcvdMessage = Encoding.UTF8.GetString(body);
            Console.WriteLine(" [x] Received {0}", rcvdMessage);
        }

        static void DetectMessage(IModel channel)
        {
            if (IsKnownCommand(rcvdMessage))
            {
                if (thisBus.State == BusStates.Free)
                {
                    var dos = JsonConvert.DeserializeObject<ServiceMessage>(rcvdMessage);
                    if (dos.request == "service")
                    {
                        thisBus.GateId = dos.gate_id;
                        thisBus.ParkingId = dos.parking_id;
                        thisBus.AirplaneId = dos.airplane_id;
                        thisBus.FlightId = GetFlightId();
                        if (dos.action == "unload")
                        {
                            thisBus.FinalDestination = thisBus.ParkingId;
                            BusMove(channel, UNDQName, thisBus.FromLoc, thisBus.FinalDestination, "need");
                            thisBus.State = BusStates.DrivingToAirplane;
                        }
                        else // "load" option
                        {
                            thisBus.FinalDestination = thisBus.GateId;
                            BusMove(channel, UNDQName, thisBus.FromLoc, thisBus.FinalDestination, "need");
                            thisBus.State = BusStates.DrivingToGate;
                        }
                    }
                }

                if (thisBus.State == BusStates.DrivingToAirplane ||
                    thisBus.State == BusStates.DrivingToGate ||
                    thisBus.State == BusStates.DrivingToGarage)
                {
                    var dom = JsonConvert.DeserializeObject<MovementMessage>(rcvdMessage);
                    if (dom.request == "movement")
                    {
                        //Visualize(channel, VisualizerQName, thisBus.FromLoc, dom.to, 300);
                        BusMove(channel, UNDQName, thisBus.FromLoc, dom.to, "done");
                        thisBus.FromLoc = thisBus.ToLoc;
                        
                        if (thisBus.ToLoc == thisBus.FinalDestination)
                        {
                            if (thisBus.State == BusStates.DrivingToAirplane)
                                thisBus.State = BusStates.ReadyNearAirplane;
                            else if (thisBus.State == BusStates.DrivingToGate)
                                thisBus.State = BusStates.ReadyNearGate;
                            else if (thisBus.State == BusStates.DrivingToGarage)
                            {
                                thisBus.ClearBus();
                            }
                        }
                        else
                        {
                            BusMove(channel, UNDQName, thisBus.FromLoc, thisBus.FinalDestination, "need");
                        }
                    }
                }

                if (thisBus.State == BusStates.WaitForPassengersNearAirplane)
                {
                    var dou = JsonConvert.DeserializeObject<UnloadMessage>(rcvdMessage);
                    if (dou.result != null)
                    {
                        // unloaded passengers
                        thisBus.Passengers.Clear();
                    }

                    var dol = JsonConvert.DeserializeObject<LoadMessage>(rcvdMessage);
                    if (dol.passengers != null)
                    {
                        thisBus.State = BusStates.Loading;
                        thisBus.Passengers = dol.passengers.ToList();
                        // send to api end loading
                        var parameters = "/change_status";
                        var status = "InBus";
                        PostJsonToApi(client, parameters, thisBus.Id, status);
                    }

                    if (thisBus.Passengers.Count != 0) // если пассажиры есть внутри автобуса, то он едет к гейту
                    {
                        thisBus.FinalDestination = thisBus.GateId;
                        thisBus.State = BusStates.DrivingToGate;
                        BusMove(channel, UNDQName, thisBus.ToLoc, thisBus.FinalDestination, "need");
                    }
                    else // иначе надо узнать у центра, есть ли работа
                    {
                        thisBus.State = BusStates.Free;
                    }
                }

                Console.WriteLine(" [x] KNOWN COMMAND");
            }
            else
            {
                Console.WriteLine(" [x] Unknown command");
            }
        }

        static void LoadPassengersFromAirplane(IModel channel)
        {
            UnloadAirplaneMessage(channel, airplaneQName, thisBus.AirplaneId, thisBus.SeatCount);
            thisBus.State = BusStates.WaitForPassengersNearAirplane;
        }

        static void UnloadPassengersToAirplane(IModel channel)
        {
            thisBus.State = BusStates.Unloading;
            // send to api begin unloading
            var parameters = "/change_status";
            var status = "BoardingFromBusToAirplane";
            PostJsonToApi(client, parameters, new Guid(thisBus.AirplaneId), status);
            LoadAirplaneMessage(channel, airplaneQName, thisBus.AirplaneId, thisBus.Passengers.ToArray());
            thisBus.State = BusStates.WaitForPassengersNearAirplane;
        }

        static void LoadPassengersFromGate()
        {
            thisBus.State = BusStates.Loading;
            //var parameters = "/passengers?flight=" + thisBus.FlightId + "&status=WaitForBus";
            var parameters = "/passengers?flight=3f71f88d-bdce-43f2-8c2b-0b7594edb48b";
            var json = GetJsonFromAPI(client, parameters);
            var passengers = JsonConvert.DeserializeObject<List<Passenger>>(json);
            var passengerCount = Math.Min(passengers.Count, thisBus.SeatCount);
            thisBus.Passengers = passengers.Select(p => p.id).Take(passengerCount).ToList();
            
            var status = "BoardingToBusFromGate";
            parameters = "/change_status";
            PostJsonToApi(client, parameters, thisBus.Id, status);
            ColoredWriteLine("Boarding " + thisBus.Passengers.Count + " passengers from Gate", ConsoleColor.Cyan);
            // TODO visualizer
            Thread.Sleep(thisBus.Passengers.Count * 100);

            status = "InBus";
            PostJsonToApi(client, parameters, thisBus.Id, status);
            ColoredWriteLine("BoardEnd", ConsoleColor.Cyan);
            thisBus.State = BusStates.DrivingToAirplane;
            thisBus.FinalDestination = thisBus.ParkingId;
        }

        static void UnloadPassengersToGate()
        {
            thisBus.State = BusStates.Unloading;
            var parameters = "/change_status";
            var status = "LandingFromBusToGate";
            PostJsonToApi(client, parameters, null, status);
            ColoredWriteLine("Landing " + thisBus.Passengers.Count + " passengers from Bus", ConsoleColor.Cyan);
            // TODO visualizer
            Thread.Sleep(thisBus.Passengers.Count * 100);

            status = "WaitForLuggage";
            PostJsonToApi(client, parameters, null, status);
            ColoredWriteLine("LandingEnd", ConsoleColor.Cyan);
            thisBus.Passengers.Clear();
            thisBus.State = BusStates.Free;
        }
        
        static bool IsKnownCommand(string message)
        {
            try
            {
                JObject.Parse(message);
            }
            catch (Exception e)
            {
                return false;
            }

            var deserializedObjectS = JsonConvert.DeserializeObject<ServiceMessage>(message);
            if (deserializedObjectS.action != null &&
                deserializedObjectS.airplane_id != null &&
                deserializedObjectS.gate_id != null &&
                deserializedObjectS.parking_id != null &&
                deserializedObjectS.request != null &&
                deserializedObjectS.service != null)
            {
                if (deserializedObjectS.service != "bus" ||
                    deserializedObjectS.request != "service")
                    return false;
                if (deserializedObjectS.action != "load" && deserializedObjectS.action != "unload")
                    return false;
                return true;
            }

            var deserializedObjectM = JsonConvert.DeserializeObject<MovementMessage>(message);
            if (deserializedObjectM.@from != null &&
                deserializedObjectM.request != null &&
                deserializedObjectM.service != null &&
                deserializedObjectM.to != null)
            {
                if (deserializedObjectM.service != "bus" ||
                    deserializedObjectM.request != "movement")
                    return false;
                return true;
            }

            var deserializedObjectL = JsonConvert.DeserializeObject<LoadMessage>(message);
            if (deserializedObjectL.airplaneId != null &&
                deserializedObjectL.busId != null &&
                deserializedObjectL.passengers != null)
            {
                return true;
            }
            
            var deserializedObjectU = JsonConvert.DeserializeObject<UnloadMessage>(message);
            if (deserializedObjectU.airplaneId != null &&
                deserializedObjectU.busId != null &&
                deserializedObjectU.result != null)
            {
                if (deserializedObjectU.result != "LoadOk")
                    return false;
                return true;
            }
            
            return false;
        }
        
        static void AcknowledgeBusState(IModel channel, string centerQName, Guid busId, BusStates busState)
        {
            var json = JsonConvert.SerializeObject(new DictionaryEntry(busId, busState));
            var body = Encoding.UTF8.GetBytes(json);
            
            channel.BasicPublish(exchange: "", 
                routingKey: centerQName,
                basicProperties: null,
                body: body);
        }

        static void VisualizerInit(IModel channel, string visualizerQName)
        {
            var initMes = new VisualizerInit();
            initMes.Type = "init";
            initMes.TransportType = "Bus";
            var id = new List<string>();
            id.Add(thisBus.Id.ToString());
            initMes.Ids = id.ToArray();
            initMes.Add = true;
            
            var json = JsonConvert.SerializeObject(initMes);
            
            SendToMQ(channel, "", visualizerQName, null, json);
        }
        
        static void Visualize(IModel channel, string visualizerQName, string fromLoc, string toLoc, int duration)
        {
            var visMes = new VisualizerMessage();
            visMes.Type = "movement";
            visMes.From = fromLoc;
            visMes.To = toLoc;
            visMes.Transport = busQ;
            visMes.Duration = duration;

            var json = JsonConvert.SerializeObject(visMes);
            
            SendToMQ(channel, "", visualizerQName, null, json);
            
            Thread.Sleep(duration);
        }

        static void UnloadAirplaneMessage(IModel channel, string airplaneQ, 
            string airplaneId, int count)
        {
            var objVal = new ValueLoading();
            objVal.airplaneId = new Guid(airplaneId);
            objVal.busId = busQ;
            objVal.count = count;
            var objMes = new LoadPassengersMQ();
            objMes.type = "UnloadPassengers";
            objMes.value = objVal;
            var so = JsonConvert.SerializeObject(objMes);
            
            var props = channel.CreateBasicProperties();
            props.ReplyTo = busQ;
            props.CorrelationId = thisBus.Id.ToString();
            
            SendToMQ(channel, "", airplaneQ, props, so);
        }

        static void LoadAirplaneMessage(IModel channel, string airplaneQ, 
            string airplaneId, string[] passengers)
        {
            var objVal = new ValueUnloading();
            objVal.airplaneId = new Guid(airplaneId);
            objVal.busId = busQ;
            objVal.passengers = passengers.Select(p => new Guid(p)).ToArray();
            var objMes = new UnloadPassengersMQ();
            objMes.type = "LoadPassengers";
            objMes.value = objVal;
            var so = JsonConvert.SerializeObject(objMes);
            
            var props = channel.CreateBasicProperties();
            props.ReplyTo = busQ;
            props.CorrelationId = thisBus.Id.ToString();
            
            SendToMQ(channel, "", airplaneQ, props, so);
        }

        static void BusMove(IModel channel, string UNDName, string fromLoc, string toLoc, string status)
        {
            thisBus.FromLoc = fromLoc;
            thisBus.ToLoc = toLoc;
            var movementMessage = new MovementMessage();
            movementMessage.service = "bus";
            movementMessage.request = "movement";
            movementMessage.@from = thisBus.FromLoc;
            movementMessage.to = thisBus.ToLoc;
            movementMessage.status = status;
            var so = JsonConvert.SerializeObject(movementMessage);
            
            var props = channel.CreateBasicProperties();
            props.ReplyTo = busQ;
            props.CorrelationId = thisBus.Id.ToString();
            
            SendToMQ(channel, "", UNDName, props, so);
        }

        static void SendToMQ(IModel channel, string exchange, string routingKey, 
            IBasicProperties props, string json)
        {
            var body = Encoding.UTF8.GetBytes(json);
            channel.BasicPublish(exchange: exchange,
                routingKey: routingKey,
                basicProperties: props,
                body: body);
            Console.WriteLine(" [o] Sent {0}", json);
        }
        
        static string GetJsonFromAPI(HttpClient client, string parameters)
        {
            client.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
            
            var response = client.GetAsync(parameters).Result;
            if (response.IsSuccessStatusCode)
            {
                var responseContent = response.Content;
                var jsonContent = responseContent.ReadAsStringAsync().Result;
                return jsonContent;
            }
            else
            {
                string result = Convert.ToString(response.StatusCode) + " (" +
                                response.ReasonPhrase + ")";
                ColoredWriteLine(result, ConsoleColor.Red);
                return "";
            }
        }

        static void PostJsonToApi(HttpClient client, string parameters, Guid? transport, string status)
        {
            var stMes = new APIStatusMessage();
            stMes.newStatus = status;
            stMes.passengers = thisBus.Passengers.ToArray();
            stMes.transportID = transport;
            var json = JsonConvert.SerializeObject(stMes);
            
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = client.PostAsync(parameters, content).Result;
            if (!response.IsSuccessStatusCode)
            {
                var result = Convert.ToString(response.StatusCode) + " (" +
                                response.ReasonPhrase + ")";
                ColoredWriteLine(result, ConsoleColor.Red);
            }
        }

        static string GetFlightId()
        {
            var client = new HttpClient();
            client.BaseAddress = new Uri("http://airplane.eu-4.evennode.com");
            var parameters = "/info?id=" + thisBus.AirplaneId;
            
            client.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
            
            var response = client.GetAsync(parameters).Result;
            if (response.IsSuccessStatusCode)
            {
                var responseContent = response.Content;
                var jsonContent = responseContent.ReadAsStringAsync().Result;
                var deserializedObject = JsonConvert.DeserializeObject<List<APIAirplaneInfoMessage>>(jsonContent);
                return deserializedObject[0].departureFlightId;
            }
            else
            {
                string result = Convert.ToString(response.StatusCode) + " (" +
                                response.ReasonPhrase + ")";
                ColoredWriteLine(result, ConsoleColor.Red);
                return "";
            }
        }
        
        static void ColoredWrite(string message, ConsoleColor color)
        {
            Console.ForegroundColor = color;
            Console.Write(message);
            Console.ForegroundColor = ConsoleColor.Gray;
        }

        static void ColoredWriteLine(string message, ConsoleColor color)
        {
            Console.ForegroundColor = color;
            Console.WriteLine(message);
            Console.ForegroundColor = ConsoleColor.Gray;
        }
    }
}
