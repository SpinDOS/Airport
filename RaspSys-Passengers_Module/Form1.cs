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
            maskedTextBoxFlightID.ValidatingType = typeof(Guid);
            maskedTextBoxFlightIdForTransport.ValidatingType = typeof(Guid);
            maskedTextBoxTransportID.ValidatingType = typeof(Guid);
            //.ValidatingType = typeof(Guid);
        }

        private void GeneratePassengers(int count)
        {
            var where = comboBoxPlaceOfGeneration.SelectedItem as GenerationPlace;
            var flight = (Guid)maskedTextBoxFlightID.ValidateText();
            PassengersAPI.AddPassengers((byte)count, where, flight);
        }

        private void button_PostPassenger_Click(object sender, EventArgs e)
        {
            if (comboBoxPlaceOfGeneration.SelectedIndex == -1)
            {
                MessageBox.Show("Укажите место генерации пассажиров", "Ошибка создания пассажира", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            if (maskedTextBoxFlightID.ValidateText() == null)
            {
                MessageBox.Show("Укажите рейс, на который генерируются пассажиры", "Ошибка создания пассажира", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            GeneratePassengers((int)numericUpDownPassengersCount.Value);
            UpdateList();
        }

        private void listBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (listBox1.SelectedIndex == -1)
            {
                buttonRemoveCurrent.Enabled = false;
                buttonRemoveCurrent.Text = "Удалить " + Guid.Empty;
            }
            else
            {
                var passenger = PassengersAPI.GetPassenger((listBox1.SelectedItem as Passenger).Id);
                textBoxDetails.Text = passenger.ToJson();
                buttonRemoveCurrent.Enabled = true;
                buttonRemoveCurrent.Text = "Удалить " + passenger.Id.ToString();
            }
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            UpdateList();
            comboBoxPlaceOfGeneration.Items.AddRange(GenerationPlace.GetPlacesAvailableForGeneration().ToArray());
        }

        private void UpdateList()
        {
            var res = PassengersAPI.GetAllPassengers();
            listBox1.Items.Clear();
            listBox1.Items.AddRange(res.ToArray());
            labelCount.Text = "Количество пассажиров: " + res.Count;
            listBox1_SelectedIndexChanged(this, EventArgs.Empty);
        }

        private void buttonRemoveCurrent_Click(object sender, EventArgs e)
        {
            PassengersAPI.Delete((listBox1.SelectedItem as Passenger).Id);
            textBoxDetails.Clear();
            UpdateList();
        }

        private void buttonRemoveAll_Click(object sender, EventArgs e)
        {
            PassengersAPI.DeleteAll(MessageBox.Show("Вы действительно хотите удалить всех пассажиров?", "Предупреждение", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, MessageBoxDefaultButton.Button2) == DialogResult.Yes);
            textBoxDetails.Clear();
            UpdateList();
        }

        private void checkBoxAutoupdate_CheckedChanged(object sender, EventArgs e)
        {
            if (checkBoxAutoupdate.Checked)
                timerAutoupdate.Start();
            else
                timerAutoupdate.Stop();
        }

        private void buttonAutogeneration_Click(object sender, EventArgs e)
        {
            if (buttonAutogeneration.Text == "Запустить автоматическую генерацию")
            {
                if (comboBoxPlaceOfGeneration.SelectedIndex == -1)
                {
                    MessageBox.Show("Укажите место генерации пассажиров", "Ошибка создания пассажира", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                if (maskedTextBoxFlightID.ValidateText() == null)
                {
                    MessageBox.Show("Укажите рейс, на который генерируются пассажиры", "Ошибка создания пассажира", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                buttonAutogeneration.Text = "Остановить автоматическую генерацию";
                timerAutoappend.Start();
                checkBoxAutoupdate.Checked = false;
            }
            else
            {
                buttonAutogeneration.Text = "Запустить автоматическую генерацию";
                timerAutoappend.Stop();
            }
        }

        private void timerAutoappend_Tick(object sender, EventArgs e)
        {
            GeneratePassengers(1);
            UpdateList();
        }

        private void timerAutoupdate_Tick(object sender, EventArgs e)
        {
            UpdateList();
        }

        private void maskedTextBox1_TypeValidationCompleted(object sender, TypeValidationEventArgs e)
        {
            if (e.IsValidInput)
                maskedTextBoxFlightID.ForeColor = Color.DarkGreen;
            else
                maskedTextBoxFlightID.ForeColor = Color.Red;
        }

        private void radioButtonBoarding_CheckedChanged(object sender, EventArgs e)
        {
            if (radioButtonBoarding.Checked)
            {
                maskedTextBoxFlightIdForTransport.Enabled = true;
                numericUpDownSeatsCount.Enabled = true;
            }
        }

        private void radioButtonLanding_CheckedChanged(object sender, EventArgs e)
        {
            if (radioButtonLanding.Checked)
            {
                maskedTextBoxFlightIdForTransport.Enabled = false;
                numericUpDownSeatsCount.Enabled = false;
            }
        }

        private void buttonDoAction_Click(object sender, EventArgs e)
        {
            var transportId = (Guid)maskedTextBoxTransportID.ValidateText();
            var transportType = radioButtonAirplane.Checked ? TransportType.Airplane : TransportType.Bus;
            var transport = new Transport(transportId, transportType, (int)numericUpDownSeatsCount.Value);
            var actionType = radioButtonBoarding.Checked ? AirportAction.Boarding : AirportAction.Landing;
            var flightId = (Guid)maskedTextBoxFlightIdForTransport.ValidateText();
            var result = PassengersAPI.ChangeState(actionType, flightId, transport);
            var passengers = PassengersAPI.GetPassengers(result.Passengers.ToArray());
            listBoxActionResult.Items.Clear();
            listBoxActionResult.Items.AddRange(passengers.ToArray());
        }
    }
}
