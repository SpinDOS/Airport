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
try:
		from queue import Queue
except:
		pip.main(['install', 'queue'])
		from queue import Queue


duration = 0.5
URL = "http://192.168.0.1:8081"

def getRabbitMQConnection():
		credentials = pika.PlainCredentials('user', 'password')
		parameters = pika.ConnectionParameters('192.168.0.1', 5672, '/', credentials)
		return pika.BlockingConnection(parameters)

def createChannel(connection):
		channel = connection.channel()
		channel.queue_declare(queue='gtc.gate', durable=True)
		channel.queue_declare(queue='visualizer', durable=True)
		channel.queue_declare(queue='Airplane', durable=True)
		return channel

def sendMovement(carId, fromId, toId, status, channel):
		message = json.dumps({
				"service":"follow_me",
				"request":"movement",
				"from":f"{fromId}",
				"to":f"{toId}",
				"status": f"{status}"
		})
		channel.basic_publish(exchange='',
													routing_key='gtc.gate',
													body=message,
													properties=pika.BasicProperties(
															content_type="json",
															correlation_id=f"{carId}",
															reply_to="FMMQ",
															delivery_mode = 2
													))
		print(" [x] Sent %r" % (json.loads(message)))


def sendAccept(carId, airplane_id, parking_id, channel):
		message = json.dumps({
				"service":"follow_me",
				"request":"accept",
				"airplane_id":f"{airplane_id}",
				"parking_id":f"{parking_id}"
		})
		channel.basic_publish(exchange='',
													routing_key='gtc.gate',
													body=message,
													properties=pika.BasicProperties(
															content_type="json",
															correlation_id=f"{carId}",
															reply_to="FMMQ",
															delivery_mode = 2
													))
		print(" [x] Sent %r" % (json.loads(message)))

def sendMaintain(carId, aircraftId, channel):
		message = json.dumps({
				"service": "follow_me",
				"request": "maintain",
				"airplane_id": f"{aircraftId}"
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

def sendVisualize(currentLocation, tempLocation, carid, airplane_id, channel):
		if airplane_id == 0:
				message = json.dumps({
						"Type": "movement",
						"From": f"{currentLocation}",
						"To": f"{tempLocation}",
						"Transport": f"FollowMe|{carid}",
						"Duration": duration * 1000,
				})
		else:
				message = json.dumps({
						"Type": "movement",
						"From": f"{currentLocation}",
						"To": f"{tempLocation}",
						"Transport": f"FollowMe|{carid}",
						"Duration": duration * 1000,
						'Aircraft': f'{airplane_id}'
				})
		channel.basic_publish(exchange='',
													routing_key='visualizer',
													body=message,
													properties=pika.BasicProperties(
															content_type="json",
															correlation_id=f"{carid}",
															delivery_mode=2
													))
		print(" [x] Sent %r" % (json.loads(message)))


class Followme(threading.Thread):

		carDict = {
				f'{uuid.uuid4()}': True,
				f'{uuid.uuid4()}': True,
				f'{uuid.uuid4()}': True
		}
		parkingDict = {
				'AircraftParking1': True,
				'AircraftParking2': True,
				'AircraftParking3': True,
				'AircraftParking4': True
				}

		stripDict = {
				'1': True,
				'2': True,
				'3': True,
		}

		answerDict = {}

		carLock = threading.RLock()
		parkingLock = threading.RLock()
		stripLock = threading.RLock()
		answerLock = threading.RLock()

		queueLoad = Queue()
		queueTakeoff = Queue()
		queueAnswer = Queue()


		def __init__(self):
				threading.Thread.__init__(self)
				self.sendInit()
				for car in self.carDict:
						self.answerDict[car] = []



		def run(self):
				while True:

						if not(self.queueTakeoff.empty()):
								with self.carLock:
										with self.stripLock:
												for car in self.carDict:
														for strip in self.stripDict:
																if not(self.queueTakeoff.empty()) and self.carDict[car] and self.stripDict[strip]:
																		self.carDict[car] = False
																		self.stripDict[strip] = False
																		t = threading.Thread(target=self.takeoff, args=(self.queueTakeoff.get(),strip,car,))
																		t.start()
																		self.queueTakeoff.task_done()

						if not(self.queueLoad.empty()):
								with self.carLock:
										with self.stripLock:
												with self.parkingLock:
														for car in self.carDict:
																for strip in self.stripDict:
																		for parking in self.parkingDict:
																				if not(self.queueLoad.empty()) and self.carDict[car] and self.stripDict[strip] and self.parkingDict[parking]:
																						self.carDict[car] = False
																						self.stripDict[strip] = False
																						self.parkingDict[parking] = False
																						t = threading.Thread(target=self.loadboard, args=(self.queueLoad.get(),parking,strip,car,))
																						t.start()
																						self.queueLoad.task_done()

						if not(self.queueAnswer.empty()):
								with self.answerLock:
										answer = self.queueAnswer.get()
										mess = answer['message']
										carid = answer['id']
										if carid in self.carDict:
												self.answerDict[carid].append(mess)
										else:
												print("нет такой машины: ", carid)
										self.queueAnswer.task_done()




		def takeoff(self, massege, strip, car):
				if massege['request'] != 'service':
						print("Чет пошло не так")

				airplane_id = None
				parking_id = None

				try:
						airplane_id = massege['airplane_id']
						parking_id = massege['parking_id']
				except:
						print("Неверный формат")
						exit(1)

				connection = getRabbitMQConnection()
				channel = createChannel(connection)

				currentPos = "FollowMeGarage"
				finishPos = parking_id
				print(car, " Получил запрос на взлет ", airplane_id)
				print(car, " Еду на ", finishPos)


				self.walk(currentPos=currentPos, finishPos=finishPos, carid=car, airplane_id=0, channel=channel)
				print(car, " Забрал самолет ", airplane_id)

				self.startToStrip(carid=car, airplane_id=airplane_id)

				currentPos = finishPos
				finishPos = "Strip" + strip + "AddFollowMe"

				with self.parkingLock:
						self.parkingDict[parking_id[0:16]] = True
				print(car, " Еду на ", finishPos)
				self.walk(currentPos=currentPos, finishPos=finishPos, carid=car, airplane_id=airplane_id, channel=channel)
				print(car, " Отвез самолет ", airplane_id)
				self.endToStrip(stripid=strip, airplane_id=airplane_id)

				currentPos = finishPos
				finishPos = "FollowMeGarage"

				self.sendFly(airplane_id, car, channel)
				print(car, " Разрешил взлет ", airplane_id)
				fly = False
				while not (fly):
						with self.answerLock:
								for answer in self.answerDict:
										if answer == car:
												for ans in self.answerDict[answer]:
														if ans['request'] == 'flycomp':
																fly = True
																self.answerDict[answer].remove(ans)


				sendMaintain(carId=car, aircraftId=airplane_id, channel=channel)
				print(car, " Еду домой")
				with self.stripLock:
						self.stripDict[strip] = True
				self.walk(currentPos=currentPos, finishPos=finishPos, carid=car, airplane_id=0, channel=channel)
				with self.carLock:
						self.carDict[car] = True
				connection.close()


		def loadboard(self, massege, parking, strip, car):
				if massege['request'] != 'landing':
						print("Чет пошло не так")
				airplane_id = None
				try:
						airplane_id = massege['aircraftId']
				except:
						print("Неверный формат")
						exit(1)

				connection = getRabbitMQConnection()
				channel = createChannel(connection)
				print(car, " Сажаю самолет ", airplane_id)
				self.sendStrip(airplane_id, strip, car, channel)
				currentPos = "FollowMeGarage"
				finishPos = "Strip"+strip+"FollowMe"
				print(car, " Еду на ", strip)
				self.walk(currentPos=currentPos, finishPos=finishPos, carid=car, airplane_id=0, channel=channel)
				print(car, " Жду завершения посадки ", airplane_id)
				landing = False
				while not(landing):
						with self.answerLock:
								for answer in self.answerDict:
										if answer == car:
												for ans in self.answerDict[answer]:
														if ans['request'] == 'landingcomp':
																landing = True
																self.answerDict[answer].remove(ans)

				print(car, " Самолет сел ", airplane_id)
				self.startToParking(car, airplane_id)
				print(car, " Приципил самолет ", airplane_id)
				currentPos = finishPos
				finishPos = parking + "FollowMe"

				with self.stripLock:
						self.stripDict[strip] = True
				print(car, " Еду на ", parking)
				self.walk(currentPos=currentPos, finishPos=finishPos, carid=car, airplane_id=airplane_id, channel=channel)
				self.EndToParking(parkingid=parking, airplane_id=airplane_id)
				print(car, " Отцепил самолет ", airplane_id)
				print(car, " Отправляю accept")
				sendAccept(carId=car, airplane_id=airplane_id, parking_id=parking, channel=channel)

				currentPos = finishPos
				finishPos = "FollowMeGarage"
				print(car, " Еду на home")
				self.walk(currentPos=currentPos, finishPos=finishPos, carid=car, airplane_id=0, channel=channel)
				with self.carLock:
						self.carDict[car] = True
				connection.close()


		def walk(self, currentPos, finishPos, carid, airplane_id, channel):
				nextPos = currentPos
				while currentPos != finishPos:
						sendMovement(carid, currentPos, finishPos, "need", channel)

						while nextPos == currentPos:
								with self.answerLock:
										for answer in self.answerDict:
												if answer == carid:
														for ans in self.answerDict[answer]:
																if ans['request'] == 'movement':
																		nextPos = ans['to']
																		self.answerDict[answer].remove(ans)

						sendVisualize(currentLocation=currentPos, tempLocation=nextPos, carid=carid, airplane_id=airplane_id, channel=channel)
						print(carid, " Еду с точки ", currentPos, ' На точку ', nextPos)
						time.sleep(duration)
						sendMovement(carid, currentPos, nextPos, "done", channel)
						currentPos = nextPos

		def startToParking(self, carid,airplane_id):
				data = {'carId': carid}
				post_url = URL + '/' + airplane_id + '/followMe/startToParking'
				r = requests.post(url=post_url, data=data)
				while r.status_code != 200:
						if r.status_code == 404:
								print("Самолетик пропал: ", airplane_id)
								exit(1)
						time.sleep(10)
						r = requests.post(url=post_url, data=data)


		def EndToParking(self, parkingid,airplane_id):
				data = {'parkingId': parkingid}
				post_url = URL + '/' + airplane_id + '/followMe/EndToParking'
				r = requests.post(url=post_url, data=data)
				while r.status_code != 200:
						if r.status_code == 404:
								print("Самолетик пропал: ", airplane_id)
								exit(1)
						time.sleep(10)
						r = requests.post(url=post_url, data=data)


		def startToStrip(self, carid,airplane_id):
				data = {'carId': carid}
				post_url = URL + '/' + airplane_id + '/followMe/startToStrip'
				r = requests.post(url=post_url, data=data)
				while r.status_code != 200:
						if r.status_code == 404:
								print("Самолетик пропал: ", airplane_id)
								exit(1)
						time.sleep(10)
						r = requests.post(url=post_url, data=data)

		def endToStrip(self, stripid,airplane_id):
				data = {'stripId': stripid}
				post_url = URL + '/' + airplane_id + '/followMe/endToStrip'
				r = requests.post(url=post_url, data=data)
				while r.status_code != 200:
						if r.status_code == 404:
								print("Самолетик пропал: ", airplane_id)
								exit(1)
						time.sleep(10)
						r = requests.post(url=post_url, data=data)

		def sendStrip(self, aircraftid, stripid, carid, channel):
				message = json.dumps({
						"type": "Landing",
						"value": {
								"stripId": f"{stripid}",
								"aircraftId": f"{aircraftid}"
						}
				})
				channel.basic_publish(exchange='',
															routing_key='Airplane',
															body=message,
															properties=pika.BasicProperties(
																	content_type="json",
																	correlation_id=f"{carid}",
																	delivery_mode=2
															))
				print(" [x] Sent %r" % (json.loads(message)))


		def sendFly(self, aircraftid, carid, channel):
				message = json.dumps({
						"type": "Fly",
						"value": {
								"airplaneId": f"{aircraftid}"
						}
				})
				channel.basic_publish(exchange='',
															routing_key='Airplane',
															body=message,
															properties=pika.BasicProperties(
																	content_type="json",
																	correlation_id=f"{carid}",
																	delivery_mode=2
															))
				print(" [x] Sent %r" % (json.loads(message)))

		def sendInit(self):
				connection = getRabbitMQConnection()
				channel = connection.channel()

				channel.queue_declare(queue='visualizer', durable=True)

				idCar = []
				for car in self.carDict:
						idCar.append(car)

				message = json.dumps({
						"Type": "init",
						"TransportType": f"FollowMe",
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

		def setLoad(self, mess):
				self.queueLoad.put(mess)

		def setTakeoff(self, mess):
				self.queueTakeoff.put(mess)

		def setAnswer(self, mess):
				self.queueAnswer.put(mess)


def callback(ch, method, properties, body):
		message = json.loads(body)
		print("Пришло сообщение: ", message)
		try:
				if message['service'] != 'follow_me':
						print("Не мое сообщение")
				if message['request'] == 'landing':
						fm.setLoad(message)
				if message['request'] == 'service':
						fm.setTakeoff(message)
				if message['request'] == 'movement' or message['request'] == 'landingcomp' or message['request'] == 'flycomp':
						answer = {'id': properties.correlation_id, 'message':message}
						fm.setAnswer(answer)
		except:
				print("Не мое сообщение")
		finally:
				ch.basic_ack(delivery_tag=method.delivery_tag)




if __name__ == '__main__':
		fm = Followme()
		fm.start()

		connection = getRabbitMQConnection()
		channel = connection.channel()
		channel.queue_declare(queue='FMMQ', durable=True)
		channel.basic_qos(prefetch_count=1)
		channel.basic_consume(callback, queue='FMMQ')
		channel.start_consuming()
