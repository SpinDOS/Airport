using System.Collections.Generic;
using UnityEngine;

namespace CymaticLabs.Unity3D.Amqp
{
    public class AmqpObjectController : MonoBehaviour
    {
        public string QueueName = "visualizer";

        [Tooltip("When enabled received messages will be logged to the debug console.")]
        public bool DebugLogMessages = true;

        public MapScript Map;

        public MovementScript AircraftPrefab;
        public MovementScript BaggagePrefab;
        public MovementScript BusPrefab;
        public MovementScript FollowMePrefab;
        public MovementScript FuelPrefab;

        private Vector3 _baggageGarage;
        private Vector3 _busGarage;
        private Vector3 _followMeGarage;
        private Vector3 _fuelGarage;

        public Dictionary<string, MovementScript> Aircrafts = new Dictionary<string, MovementScript>();
        public Dictionary<string, MovementScript> Baggages = new Dictionary<string, MovementScript>();
        public Dictionary<string, MovementScript> Buses = new Dictionary<string, MovementScript>();
        public Dictionary<string, MovementScript> FollowMes = new Dictionary<string, MovementScript>();
        public Dictionary<string, MovementScript> Fuels = new Dictionary<string, MovementScript>();

        void Start()
        {
            var queue = new AmqpQueueSubscription(QueueName, false, HandleQueueMessageReceived);
            AmqpClient.Subscribe(queue);
            Debug.Log("Subscribe");

            _baggageGarage = Map.GetLocation("BaggageGarage").Value;
            _busGarage = Map.GetLocation("BusGarage").Value;
            _followMeGarage = Map.GetLocation("FollowMeGarage").Value;
            _fuelGarage = Map.GetLocation("FuelGarage").Value;

        }

        /**
         * Handles messages receieved from this object's subscription based on the exchange name,
         * exchange type, and routing key used. You could also write an anonymous delegate in line
         * when creating the subscription like: (received) => { Debug.Log(received.Message.Body.Length); }
         */
        private const string Undefined = "(undefined)";
        void HandleQueueMessageReceived(AmqpQueueReceivedMessage received)
        {
            // First convert the message's body, which is a byte array, into a string for parsing the JSON
            var receivedJson = System.Text.Encoding.UTF8.GetString(received.Message.Body);
            var msg = CymaticLabs.Unity3D.Amqp.SimpleJSON.JSON.Parse(receivedJson);
            var type = msg["Type"] != null ? msg["Type"].Value : Undefined;

            switch(type)
            {
                case "init":
                    InitMessage(msg);
                    break;
                case "movement":
                    MovementMessage(msg);
                    break;
                case "animation":
                    AnimationMessage(msg);
                    break;
                default:
                    DebugMessage(string.Format("Can not recognize message type \"{0}\"", type));
                    break;
            }

        }

        void InitMessage(SimpleJSON.JSONNode msg)
        {
            DebugMessage("get init message");

            var transportType = msg["TransportType"] != null ? msg["TransportType"].Value : Undefined;
            var ids = msg["Ids"] != null ? msg["Ids"].AsArray : new SimpleJSON.JSONArray();
            var add = msg["Add"] != null ? msg["Add"].AsBool : false;

            switch (transportType)
            {
                case "Baggage":
                    if (!add)
                    {
                        foreach (var baggage in Baggages.Values)
                            Destroy(baggage);
                        Baggages = new Dictionary<string, MovementScript>();
                    }

                    for (int i = 0; i < ids.Count; i++)
                    {
                        Baggages.Add(ids[i], Instantiate(BaggagePrefab, _baggageGarage, new Quaternion()));
                    }
                    break;
                case "Bus":
                    if (!add)
                    {
                        foreach (var bus in Buses.Values)
                            Destroy(bus);
                        Buses = new Dictionary<string, MovementScript>();
                    }

                    for (int i = 0; i < ids.Count; i++)
                    {
                        Buses.Add(ids[i], Instantiate(BusPrefab, _busGarage, new Quaternion()));
                    }
                    break;
                case "FollowMe":
                    if (!add)
                    {
                        foreach (var followMe in FollowMes.Values)
                            Destroy(followMe);
                        FollowMes = new Dictionary<string, MovementScript>();
                    }

                    for (int i = 0; i < ids.Count; i++)
                    {
                        FollowMes.Add(ids[i].Value, Instantiate(FollowMePrefab, _followMeGarage, new Quaternion()));
                    }
                    break;
                case "Fuel":
                    if (!add)
                    {
                        foreach (var fuel in Fuels.Values)
                            Destroy(fuel);
                        Fuels = new Dictionary<string, MovementScript>();
                    }

                    for (int i = 0; i < ids.Count; i++)
                    {
                        Fuels.Add(ids[i].Value, Instantiate(FuelPrefab, _fuelGarage, new Quaternion()));
                    }

                    break;
                default:
                    DebugMessage(string.Format("Can not recognize transport type \"{0}\"", transportType));
                    break;
            }
        }

        private static readonly HashSet<string> FollowMeSpecialLocations = new HashSet<string>()
        {
            "AircraftParking1FollowMeBack",
            "AircraftParking2FollowMeBack",
            "AircraftParking3FollowMeBack",
            "AircraftParking4FollowMeBack",
            "Strip1FollowMe",
            "Strip2FollowMe",
            "Strip3FollowMe"
        };
        void MovementMessage(SimpleJSON.JSONNode msg)
        {
            DebugMessage("get movement message");
            if (msg["Transport"] == null)
            {
                DebugMessage("Transport is undefined");
                return;
            }

            var transportArray = msg["Transport"].Value.Split('|');
            if (transportArray.Length != 2)
            {
                DebugMessage(string.Format("Incorrect transport format: \"{0}\"", msg["Transport"].Value));
                return;
            }

            MovementScript transport = null;
            var key = transportArray[1];
            switch (transportArray[0])
            {
                case "Baggage":
                    if (Baggages.ContainsKey(key))
                        transport = Baggages[key];
                    break;
                case "Bus":
                    if (Buses.ContainsKey(key))
                        transport = Buses[key];
                    break;
                case "FollowMe":
                    if (FollowMes.ContainsKey(key))
                        transport = FollowMes[key];
                    break;
                case "Fuel":
                    if (Fuels.ContainsKey(key))
                        transport = Fuels[key];
                    break;
                default:
                    DebugMessage(string.Format("Can not recognize transport type \"{0}\"", transportArray[0]));
                    return;
            }

            if (transport == null)
            {
                DebugMessage(string.Format("Can not find transport with id \"{0}\"", key));
                return;
            }

            MovementScript aircraft = null;
            if (transportArray[0] == "FollowMe" && msg["Aircraft"] != null)
            {
                var aircraftGuid = msg["Aircraft"].Value;
                if (Aircrafts.ContainsKey(aircraftGuid))
                {
                    aircraft = Aircrafts[aircraftGuid];
                }
            }

            var from = msg["From"] != null ? Map.GetLocation(msg["From"].Value) : null;
            var to = msg["To"] != null ? Map.GetLocation(msg["To"].Value) : null;

            if (from == null || to == null)
            {
                DebugMessage("Can not find From or/and To Locations");
                return;
            }

            if (msg["Duration"] == null)
            {
                DebugMessage("Can not find Duration");
                return;
            }

            var duration = msg["Duration"].AsInt;
            var distance = Vector3.Distance(to.Value, from.Value);
            transport.Set(from.Value, to.Value, distance / duration * 1000);

            if (aircraft != null && !FollowMeSpecialLocations.Contains(msg["From"].Value))
            {
                var aircraftFrom = aircraft.FinishPosition ?? transform.position;
                //самолет как будто догоняет "followMe", поэтому он едет к старту текущей локации для followMe
                var aicraftDistance = Vector3.Distance(aircraftFrom, from.Value); 
                aircraft.Set(aircraftFrom, from.Value, aicraftDistance / duration * 1000);
            }
        }

        void AnimationMessage(SimpleJSON.JSONNode msg)
        {
            if (msg["Duration"] == null)
            {
                DebugMessage("Can not find Duration");
                return;
            }
            var duration = msg["Duration"].AsInt;

            var transportArray = msg["Transport"].Value.Split('|');
            if (transportArray.Length != 2)
            {
                DebugMessage(string.Format("Incorrect transport format: \"{0}\"", msg["Transport"].Value));
                return;
            }

            var type = msg["AnimationType"] != null ? msg["AnimationType"].Value : Undefined;

            switch(type)
            {
                case "touchdown":
                case "wheelsup":
                    {
                        DebugMessage(string.Format("Get {0} animation message", type));
                        if (transportArray[0] != "Aircraft")
                        {
                            DebugMessage("Expected aircraft transport type");
                            return;
                        }
                        var aircraftGuid = transportArray[1];

                        if (msg["Strip"] == null)
                        {
                            DebugMessage("Expected strip number");
                            return;
                        }
                        var stripNum = msg["Strip"].AsInt;

                        if (stripNum < 1 || stripNum > 3)
                        {
                            DebugMessage("Expected strip number from 1 to 3 in animation");
                            return;
                        }

                        var stripAway = Map.GetLocation("Strip" + stripNum + "Away").Value;

                        var strip = Map.GetLocation("Strip" + stripNum).Value;
                        var distance = Vector3.Distance(stripAway, strip);

                        DebugMessage(string.Format("stripAway: {0} strip: {1} speed {2}", stripAway, strip, distance / duration * 1000));
                        
                        switch(type)
                        {
                            case "touchdown":
                                {
                                    Aircrafts.Add(aircraftGuid, Instantiate(AircraftPrefab, stripAway, new Quaternion()));
                                    Aircrafts[aircraftGuid].Set(stripAway, strip, distance / duration * 1000);
                                    break;
                                }
                            case "wheelsup":
                                if (!Aircrafts.ContainsKey(aircraftGuid))
                                {
                                    DebugMessage(string.Format("Can not find aircraft with id = {0}", aircraftGuid));
                                    return;
                                }
                                var aircraft = Aircrafts[aircraftGuid];
                                aircraft.Set(strip, stripAway, distance / duration * 1000);
                                aircraft.DestroyAfterFinish = true;
                                Aircrafts.Remove(aircraftGuid);
                                break;
                        }
                        break;
                    }
                    
                default:
                    DebugMessage(string.Format("Can not reconize animation type: \"{0}\"", type));
                    break;
            }
        }

        /// <summary>
        /// Если DebugLogMessage - это true, то пишет сообщение в консоль.
        /// </summary>
        /// <param name="message"></param>
        void DebugMessage(string message)
        {
            if (DebugLogMessages)
            {
                Debug.Log(message);
            }
        }
    }
}


