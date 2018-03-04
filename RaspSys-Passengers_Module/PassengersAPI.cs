using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace RaspSys_Passengers_Module
{
    public class IncorrectArgumentsException : Exception
    {
        public IncorrectArgumentsException() { }
        public IncorrectArgumentsException(string message) : base(message) { }
        public IncorrectArgumentsException(string message, Exception inner) : base(message, inner) { }
        protected IncorrectArgumentsException(
          System.Runtime.Serialization.SerializationInfo info,
          System.Runtime.Serialization.StreamingContext context) : base(info, context) { }
    }

    public class Passenger
    {
        public Guid Id { get; set; }
        public string first_name { get; set; }
        public string last_name { get; set; }
        public string state { get; set; }
        public string patronymic { get; set; }
        public char? gender { get; set; }
        public DateTime? birthdate { get; set; }
        public Guid? luggage { get; set; }
        public Guid? flight { get; set; }

        public override string ToString()
        {
            return first_name + (last_name != null ? ' ' + last_name : "") + " (" + Id + ")";
        }

        public string ToJson()
        {
            return JsonConvert.SerializeObject(this, Formatting.Indented);
        }
    }

    public static class PassengersAPI
    {
        public static void AddPassengers(byte count = 1)
        {
            if (count < 1 || count > 25)
                throw new IncorrectArgumentsException("Count must from 1 to 25");

            PostRequest("/passengers", new { count = count });
        }

        public static List<Passenger> GetAllPassengers(bool extended = false)
        {
            object arg;
            if (extended)
                arg = new { extended = extended };
            else
                arg = new object();
            var data = GetRequest("/passengers", arg);
            return JsonConvert.DeserializeObject<List<Passenger>>(data);
        }

        public static Passenger GetPassenger(Guid id, bool extended = true)
        {
            return GetPassengers(new Guid[] { id }, extended).FirstOrDefault();
        }

        public static List<Passenger> GetPassengers(Guid[] ids, bool extended = false)
        {
            object arg;
            if (extended)
                 arg = new { extended = 1, ids = String.Join(",", ids.Select(i => i.ToString())) };
            else
                 arg = new { ids = String.Join(",", ids.Select(i => i.ToString())) };
            var data = GetRequest("/passengers", arg);
            return JsonConvert.DeserializeObject<List<Passenger>>(data);
        }

        private static string GetQueryString(object obj)
        {
            var properties = from p in obj.GetType().GetProperties()
                             where p.GetValue(obj, null) != null
                             select p.Name + "=" + HttpUtility.UrlEncode(p.GetValue(obj, null).ToString());

            return String.Join("&", properties.ToArray());
        }

        private static string GetRequest(string url, object args = null)
        {
            if (args == null)
                args = new object { };
            var httpWebRequest = (HttpWebRequest)WebRequest.Create("http://quantum0.pythonanywhere.com" + url + "?" + GetQueryString(args));
            httpWebRequest.Method = "GET";
            try
            {
                var httpResponse = (HttpWebResponse)httpWebRequest.GetResponse();
                using (var streamReader = new StreamReader(httpResponse.GetResponseStream()))
                {
                    return streamReader.ReadToEnd();
                }
            }
            catch (Exception e)
            {
                throw e;
            }
        }

        private static void PostRequest(string url, object obj)
        {
            var httpWebRequest = (HttpWebRequest)WebRequest.Create("http://quantum0.pythonanywhere.com" + url);
            httpWebRequest.Method = "POST";
            if (obj != null)
            {
                var body = JsonConvert.SerializeObject(obj);
                httpWebRequest.ContentType = "application/json";
                using (var streamWriter = new StreamWriter(httpWebRequest.GetRequestStream()))
                {
                    streamWriter.Write(body);
                    streamWriter.Flush();
                    streamWriter.Close();
                }

                try
                {
                    var httpResponse = (HttpWebResponse)httpWebRequest.GetResponse();
                    using (var streamReader = new StreamReader(httpResponse.GetResponseStream()))
                    {
                        var result = streamReader.ReadToEnd();
                    }
                }
                catch (Exception e)
                {
                    throw e;
                }
            }
        } 
    }
}
