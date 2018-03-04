using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;

namespace RaspSys_Passengers_Module
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        private void button_PostPassenger_Click(object sender, EventArgs e)
        {
            PassengersAPI.AddPassengers((byte)numericUpDownPassengersCount.Value);
            UpdateList();
        }

        private void listBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            textBoxDetails.Text = PassengersAPI.GetPassenger((listBox1.SelectedItem as Passenger).Id).ToJson();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            UpdateList();
        }

        private void UpdateList()
        {
            var res = PassengersAPI.GetAllPassengers();
            listBox1.Items.Clear();
            listBox1.Items.AddRange(res.ToArray());
            labelCount.Text = "Количество пассажиров: " + res.Count;
        }
    }
}
