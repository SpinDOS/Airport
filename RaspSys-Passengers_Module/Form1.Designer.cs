namespace RaspSys_Passengers_Module
{
    partial class Form1
    {
        /// <summary>
        /// Обязательная переменная конструктора.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Освободить все используемые ресурсы.
        /// </summary>
        /// <param name="disposing">истинно, если управляемый ресурс должен быть удален; иначе ложно.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Код, автоматически созданный конструктором форм Windows

        /// <summary>
        /// Требуемый метод для поддержки конструктора — не изменяйте 
        /// содержимое этого метода с помощью редактора кода.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            this.listBox1 = new System.Windows.Forms.ListBox();
            this.button_PostPassenger = new System.Windows.Forms.Button();
            this.textBoxDetails = new System.Windows.Forms.TextBox();
            this.groupBox1 = new System.Windows.Forms.GroupBox();
            this.label2 = new System.Windows.Forms.Label();
            this.label1 = new System.Windows.Forms.Label();
            this.buttonAutogeneration = new System.Windows.Forms.Button();
            this.numericUpDownPassengersCount = new System.Windows.Forms.NumericUpDown();
            this.comboBoxPlaceOfGeneration = new System.Windows.Forms.ComboBox();
            this.groupBox2 = new System.Windows.Forms.GroupBox();
            this.checkBoxAutoupdate = new System.Windows.Forms.CheckBox();
            this.labelCount = new System.Windows.Forms.Label();
            this.groupBox3 = new System.Windows.Forms.GroupBox();
            this.buttonRemoveAll = new System.Windows.Forms.Button();
            this.buttonRemoveCurrent = new System.Windows.Forms.Button();
            this.timerAutoupdate = new System.Windows.Forms.Timer(this.components);
            this.timerAutoappend = new System.Windows.Forms.Timer(this.components);
            this.groupBox1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.numericUpDownPassengersCount)).BeginInit();
            this.groupBox2.SuspendLayout();
            this.groupBox3.SuspendLayout();
            this.SuspendLayout();
            // 
            // listBox1
            // 
            this.listBox1.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.listBox1.FormattingEnabled = true;
            this.listBox1.Location = new System.Drawing.Point(6, 45);
            this.listBox1.Name = "listBox1";
            this.listBox1.Size = new System.Drawing.Size(348, 342);
            this.listBox1.TabIndex = 0;
            this.listBox1.SelectedIndexChanged += new System.EventHandler(this.listBox1_SelectedIndexChanged);
            // 
            // button_PostPassenger
            // 
            this.button_PostPassenger.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.button_PostPassenger.Location = new System.Drawing.Point(169, 69);
            this.button_PostPassenger.Name = "button_PostPassenger";
            this.button_PostPassenger.Size = new System.Drawing.Size(146, 23);
            this.button_PostPassenger.TabIndex = 1;
            this.button_PostPassenger.Text = "Добавить пассажира/ов";
            this.button_PostPassenger.UseVisualStyleBackColor = true;
            this.button_PostPassenger.Click += new System.EventHandler(this.button_PostPassenger_Click);
            // 
            // textBoxDetails
            // 
            this.textBoxDetails.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.textBoxDetails.Location = new System.Drawing.Point(6, 393);
            this.textBoxDetails.Multiline = true;
            this.textBoxDetails.Name = "textBoxDetails";
            this.textBoxDetails.Size = new System.Drawing.Size(348, 151);
            this.textBoxDetails.TabIndex = 2;
            // 
            // groupBox1
            // 
            this.groupBox1.Controls.Add(this.label2);
            this.groupBox1.Controls.Add(this.label1);
            this.groupBox1.Controls.Add(this.buttonAutogeneration);
            this.groupBox1.Controls.Add(this.numericUpDownPassengersCount);
            this.groupBox1.Controls.Add(this.comboBoxPlaceOfGeneration);
            this.groupBox1.Controls.Add(this.button_PostPassenger);
            this.groupBox1.Location = new System.Drawing.Point(378, 12);
            this.groupBox1.Name = "groupBox1";
            this.groupBox1.Size = new System.Drawing.Size(321, 184);
            this.groupBox1.TabIndex = 3;
            this.groupBox1.TabStop = false;
            this.groupBox1.Text = "Генерация";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(6, 45);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(211, 13);
            this.label2.TabIndex = 6;
            this.label2.Text = "Количество пассажиров для генерации:";
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(6, 19);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(163, 13);
            this.label1.TabIndex = 5;
            this.label1.Text = "Место генерации пассажиров:";
            // 
            // buttonAutogeneration
            // 
            this.buttonAutogeneration.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.buttonAutogeneration.Location = new System.Drawing.Point(6, 155);
            this.buttonAutogeneration.Name = "buttonAutogeneration";
            this.buttonAutogeneration.Size = new System.Drawing.Size(309, 23);
            this.buttonAutogeneration.TabIndex = 4;
            this.buttonAutogeneration.Text = "Запустить автоматическую генерацию";
            this.buttonAutogeneration.UseVisualStyleBackColor = true;
            this.buttonAutogeneration.Click += new System.EventHandler(this.buttonAutogeneration_Click);
            // 
            // numericUpDownPassengersCount
            // 
            this.numericUpDownPassengersCount.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.numericUpDownPassengersCount.Location = new System.Drawing.Point(223, 43);
            this.numericUpDownPassengersCount.Maximum = new decimal(new int[] {
            25,
            0,
            0,
            0});
            this.numericUpDownPassengersCount.Minimum = new decimal(new int[] {
            1,
            0,
            0,
            0});
            this.numericUpDownPassengersCount.Name = "numericUpDownPassengersCount";
            this.numericUpDownPassengersCount.Size = new System.Drawing.Size(92, 20);
            this.numericUpDownPassengersCount.TabIndex = 3;
            this.numericUpDownPassengersCount.Value = new decimal(new int[] {
            1,
            0,
            0,
            0});
            // 
            // comboBoxPlaceOfGeneration
            // 
            this.comboBoxPlaceOfGeneration.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.comboBoxPlaceOfGeneration.FormattingEnabled = true;
            this.comboBoxPlaceOfGeneration.Location = new System.Drawing.Point(175, 16);
            this.comboBoxPlaceOfGeneration.Name = "comboBoxPlaceOfGeneration";
            this.comboBoxPlaceOfGeneration.Size = new System.Drawing.Size(140, 21);
            this.comboBoxPlaceOfGeneration.TabIndex = 2;
            this.comboBoxPlaceOfGeneration.Text = "Место генерации";
            // 
            // groupBox2
            // 
            this.groupBox2.Controls.Add(this.checkBoxAutoupdate);
            this.groupBox2.Controls.Add(this.labelCount);
            this.groupBox2.Controls.Add(this.listBox1);
            this.groupBox2.Controls.Add(this.textBoxDetails);
            this.groupBox2.Location = new System.Drawing.Point(12, 12);
            this.groupBox2.Name = "groupBox2";
            this.groupBox2.Size = new System.Drawing.Size(360, 550);
            this.groupBox2.TabIndex = 4;
            this.groupBox2.TabStop = false;
            this.groupBox2.Text = "Просмотр";
            // 
            // checkBoxAutoupdate
            // 
            this.checkBoxAutoupdate.AutoSize = true;
            this.checkBoxAutoupdate.Location = new System.Drawing.Point(273, 18);
            this.checkBoxAutoupdate.Name = "checkBoxAutoupdate";
            this.checkBoxAutoupdate.Size = new System.Drawing.Size(81, 17);
            this.checkBoxAutoupdate.TabIndex = 2;
            this.checkBoxAutoupdate.Text = "Autoupdate";
            this.checkBoxAutoupdate.UseVisualStyleBackColor = true;
            this.checkBoxAutoupdate.CheckedChanged += new System.EventHandler(this.checkBoxAutoupdate_CheckedChanged);
            // 
            // labelCount
            // 
            this.labelCount.AutoSize = true;
            this.labelCount.Location = new System.Drawing.Point(7, 19);
            this.labelCount.Name = "labelCount";
            this.labelCount.Size = new System.Drawing.Size(134, 13);
            this.labelCount.TabIndex = 3;
            this.labelCount.Text = "Количество пассажиров:";
            // 
            // groupBox3
            // 
            this.groupBox3.Controls.Add(this.buttonRemoveAll);
            this.groupBox3.Controls.Add(this.buttonRemoveCurrent);
            this.groupBox3.Location = new System.Drawing.Point(384, 202);
            this.groupBox3.Name = "groupBox3";
            this.groupBox3.Size = new System.Drawing.Size(315, 354);
            this.groupBox3.TabIndex = 5;
            this.groupBox3.TabStop = false;
            this.groupBox3.Text = "Управление";
            // 
            // buttonRemoveAll
            // 
            this.buttonRemoveAll.Location = new System.Drawing.Point(6, 48);
            this.buttonRemoveAll.Name = "buttonRemoveAll";
            this.buttonRemoveAll.Size = new System.Drawing.Size(106, 23);
            this.buttonRemoveAll.TabIndex = 1;
            this.buttonRemoveAll.Text = "Удалить всех";
            this.buttonRemoveAll.UseVisualStyleBackColor = true;
            this.buttonRemoveAll.Click += new System.EventHandler(this.buttonRemoveAll_Click);
            // 
            // buttonRemoveCurrent
            // 
            this.buttonRemoveCurrent.Enabled = false;
            this.buttonRemoveCurrent.Location = new System.Drawing.Point(6, 19);
            this.buttonRemoveCurrent.Name = "buttonRemoveCurrent";
            this.buttonRemoveCurrent.Size = new System.Drawing.Size(303, 23);
            this.buttonRemoveCurrent.TabIndex = 0;
            this.buttonRemoveCurrent.Text = "Удалить 00000000-0000-0000-0000-000000000000";
            this.buttonRemoveCurrent.UseVisualStyleBackColor = true;
            this.buttonRemoveCurrent.Click += new System.EventHandler(this.buttonRemoveCurrent_Click);
            // 
            // timerAutoupdate
            // 
            this.timerAutoupdate.Interval = 5000;
            this.timerAutoupdate.Tick += new System.EventHandler(this.timerAutoupdate_Tick);
            // 
            // timerAutoappend
            // 
            this.timerAutoappend.Interval = 5000;
            this.timerAutoappend.Tick += new System.EventHandler(this.timerAutoappend_Tick);
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(713, 569);
            this.Controls.Add(this.groupBox3);
            this.Controls.Add(this.groupBox2);
            this.Controls.Add(this.groupBox1);
            this.Name = "Form1";
            this.Text = "Аэропорт. Компонента - Пассажиры";
            this.Load += new System.EventHandler(this.Form1_Load);
            this.groupBox1.ResumeLayout(false);
            this.groupBox1.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.numericUpDownPassengersCount)).EndInit();
            this.groupBox2.ResumeLayout(false);
            this.groupBox2.PerformLayout();
            this.groupBox3.ResumeLayout(false);
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.ListBox listBox1;
        private System.Windows.Forms.Button button_PostPassenger;
        private System.Windows.Forms.TextBox textBoxDetails;
        private System.Windows.Forms.GroupBox groupBox1;
        private System.Windows.Forms.ComboBox comboBoxPlaceOfGeneration;
        private System.Windows.Forms.GroupBox groupBox2;
        private System.Windows.Forms.Button buttonAutogeneration;
        private System.Windows.Forms.NumericUpDown numericUpDownPassengersCount;
        private System.Windows.Forms.GroupBox groupBox3;
        private System.Windows.Forms.Button buttonRemoveAll;
        private System.Windows.Forms.Button buttonRemoveCurrent;
        private System.Windows.Forms.Label labelCount;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.CheckBox checkBoxAutoupdate;
        private System.Windows.Forms.Timer timerAutoupdate;
        private System.Windows.Forms.Timer timerAutoappend;
    }
}

