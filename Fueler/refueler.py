import pip
try:
	import requests
except:
	pip.main(['install', 'requests'])
	import requests
try:
	import pika
except:
	pip.main(['install', 'pika'])
	import pika
try:
	import threading
except:
	pip.main(['install', 'threading'])
	import threading
try:
	import uuid
except:
	pip.main(['install', 'uuid'])
	import uuid
try:
	import json
except:
	pip.main(['install', 'json'])
	import json
try:
	import time
except:
	pip.main(['install', 'time'])
	import time


carList = []
duration = 0.8

def getRabbitMQConnection():
	credentials = pika.PlainCredentials('user', 'password')
	parameters = pika.ConnectionParameters('192.168.0.1', 5672, '/', credentials)
	return pika.BlockingConnection(parameters)

def createChannel(connection):
		channel = connection.channel()
		channel.queue_declare(queue='gtc.gate', durable=True)
		channel.queue_declare(queue='visualizer', durable=True)
		channel.queue_declare(queue='Airplane', durable=True)
		channel.queue_declare(queue='refuelerMQ', durable=True)
		return channel


def getFuelVolume(aircraftId):
	AIRPLANE_API = "http://192.168.0.1:8081"
	URL = '{}/info?id={}'.format(AIRPLANE_API, aircraftId)
	res = requests.get(URL).content.decode()
	res = json.loads(res)
	return res[0]['maxFuel']-res[0]['fuel']


def sendMovement(carId, fromId, toId, status, channel):

	message = json.dumps({
		"service":"fuel",
		"request":"movement",
		"from":f"{fromId}",
		"to":f"{toId}",
		"status":f"{status}"
	})
	channel.basic_publish(exchange='',
							routing_key='gtc.gate',
							body=message,
							properties=pika.BasicProperties(
								content_type="json",
								correlation_id=f"{carId}",
								reply_to="refuelerAnswerMQ",
								delivery_mode = 2
							))
	print(" [x] Sent %r" % (json.loads(message)))


def sendMaintain(carId, airplane_id, channel):
	message = json.dumps({
		"service":"fuel",
		"request":"maintain",
		"airplane_id":f"{airplane_id}"
	})
	channel.basic_publish(exchange='',
							routing_key='gtc.gate',
							body=message,
							properties=pika.BasicProperties(
								content_type="json",
								correlation_id=f"{carId}",
								delivery_mode=2
							))
	print(" [x] Sent %r" % (json.loads(message)))




def getAnswer(ch, method, properties, body):
	message = json.loads(body)
	print(message)
	try:
		if message['request'] == 'movement':
			carId =  properties.correlation_id
			print("ok car")
			for car in carList:
				if car.getCarId() == carId:
					print('before tempLocation')
					car.setTempLocation(message['to'])
					print('after tempLocation')
					break

		if message['request'] == 'answer':
			carId = message['fuelerId'].split('|')[1]
			print('car: '+carId)
			for car in carList:
				if car.getCarId() == carId:
					car.setDone(message['status'])
					break

	except Exception as e:
		print(e)
		print('Неизвестное сообщение "ответ"')
	finally:
		ch.basic_ack(delivery_tag=method.delivery_tag)





class Refueler:
	_homeId = "FuelGarage"
	_currentLocation = "FuelGarage"
	_finishLocation = ""
	_tempLocation = "FuelGarage"
	__lockFinish = threading.RLock()
	__lockTemp = threading.RLock()
	__lockDone = threading.RLock()
	__aircraftid = ""
	__done = False

	def __init__(self):
		self.uuid = str(uuid.uuid4())

	def setFinishLocation(self, finishLocation):
		with self.__lockFinish:
			self._finishLocation = finishLocation

	def setTempLocation(self, tempLocation):
		with self.__lockTemp:
			self._tempLocation = tempLocation

	def setDone(self):
		with self.__lockDone:
			self.__done = True


	def sendVisualize(self):
		message = json.dumps({
			"Type": "movement",
			"From": f"{self._currentLocation}",
			"To": f"{self._tempLocation}",
			"Transport": f"Fuel|{self.uuid}",
			"Duration": str(duration * 1000),
		})
		self.channel.basic_publish(exchange='',
								routing_key='visualizer',
								body=message,
								properties=pika.BasicProperties(
									content_type="json",
									correlation_id=f"{self.uuid}",
									delivery_mode=2
								))
		print(" [x] Sent %r" % (json.loads(message)))

	def sendFuel(self, volume, airplane_id):
		message = json.dumps({
			"type": "Refuel",
			"value": {
				"volume": float(volume),
				"aircraftId": f"{airplane_id}",
				"carId":'Fuel|'+self.uuid
			}
		})
		self.channel.basic_publish(exchange='',
								routing_key='Airplane',
								body=message,
								properties=pika.BasicProperties(
									content_type="json",
									correlation_id=f"{self.uuid}",
									delivery_mode=2
								))
		print(" [x] Sent %r" % (json.loads(message)))

	def walk(self):
		while self._currentLocation != self._finishLocation:
			with self.__lockFinish:
				with self.__lockTemp:
					sendMovement(self.uuid, self._currentLocation, self._finishLocation, "need", self.channel)

			while self._tempLocation == self._currentLocation:
				pass

			self.sendVisualize()
			time.sleep(duration)

			sendMovement(self.uuid, self._currentLocation, self._tempLocation, "done", self.channel)
			self._currentLocation = self._tempLocation

	def doFuel(self, airplane_id, parkingid):
		self.__done = False
		self._finishLocation = parkingid
		volume = getFuelVolume(airplane_id)
		print(self.uuid, " Получил запрос на заправку ", airplane_id)
		print(self.uuid, " Требуется заправить на ", volume)
		self.walk()

		self.sendFuel(volume=volume, airplane_id=airplane_id)
		print(self.uuid, " Заправка окончена ")

		while not(self.__done):
			pass

		sendMaintain(carId=self.uuid, airplane_id=airplane_id, channel=self.channel)

		self._finishLocation = self._homeId
		print(self.uuid, " Еду домой ")
		self.walk()





class ThreadRefueler(threading.Thread):

	def __init__(self):
		self.refueler = Refueler()
		threading.Thread.__init__(self)

	def callback(self, ch, method, properties, body):
		message = json.loads(body)
		print("Пришло: ", self.getCarId(), message)
		try :
			if message['service'] != 'fuel':
				print('Сообщение отправлено: %r', {message['service']})
				return
			if message['request'] != 'service':
				print('Неопознаное сообщение: %r', {message['request']})
				return
			self.setFinishLocation(message['parking_id'])
			self.refueler.doFuel(airplane_id=message['airplane_id'], parkingid=message['parking_id'])
		except Exception as e:
			print(e)
			print("Не найден параметр")
		finally:
			ch.basic_ack(delivery_tag=method.delivery_tag)


	def run(self):
		self.refueler.connection = getRabbitMQConnection()

		self.refueler.channel = createChannel(self.refueler.connection)
		self.refueler.channel.basic_qos(prefetch_count=1)
		self.refueler.channel.basic_consume(self.callback, queue='refuelerMQ')

		print('start consuming')
		self.refueler.channel.start_consuming()

	def setFinishLocation(self, finishLocation):
		self.refueler.setFinishLocation(finishLocation)

	def setTempLocation(self, tempLocation):
		self.refueler.setTempLocation(tempLocation)

	def setDone(self, done):
		if done == 'ok':
			self.refueler.setDone()

	def getCarId(self):
		return self.refueler.uuid


def sendInit():
	connection = getRabbitMQConnection()
	channel = connection.channel()

	channel.queue_declare(queue='visualizer', durable=True)

	idCar = []
	for car in carList:
		idCar.append(car.getCarId())

	message = json.dumps({
		"Type": "init",
		"TransportType": f"Fuel",
		"Ids": idCar,
	})
	channel.basic_publish(exchange='',
							routing_key='visualizer',
							body=message,
							properties=pika.BasicProperties(
								content_type="json",
								delivery_mode=2
							))
	print(" [x] Sent %r" % (json.loads(message)))
	connection.close()

if __name__ == '__main__':
	for _ in range(3):
		f = ThreadRefueler()
		carList.append(f)

	sendInit()

	for car in carList:
		car.start()

	connection = getRabbitMQConnection()
	channel = connection.channel()
	channel.queue_declare(queue='refuelerAnswerMQ', durable=True)
	channel.basic_qos(prefetch_count=1)
	channel.basic_consume(getAnswer, queue='refuelerAnswerMQ')
	channel.start_consuming()