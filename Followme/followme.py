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


URL = "http://10.99.250.144:8081"

def sendMovement(carId, fromId, toId, status):
    credentials = pika.PlainCredentials('user', 'password')
    parameters = pika.ConnectionParameters('10.99.67.120',
                                           5672,
                                           '/',
                                           credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue='gtc.gate', durable=True)

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

    connection.close()


def sendAccept(carId, airplane_id, parking_id):
    credentials = pika.PlainCredentials('user', 'password')
    parameters = pika.ConnectionParameters('10.99.67.120',
                                           5672,
                                           '/',
                                           credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue='gtc.gate', durable=True)

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

    connection.close()

def sendMaintain(carId, aircraftId):
    credentials = pika.PlainCredentials('user', 'password')
    parameters = pika.ConnectionParameters('10.99.67.120',
                                           5672,
                                           '/',
                                           credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue='gtc.gate', durable=True)

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

    connection.close()

def sendVisualize(currentLocation, tempLocation, carid, airplane_id):
    credentials = pika.PlainCredentials('user', 'password')
    parameters = pika.ConnectionParameters('10.99.67.120',
                                           5672,
                                           '/',
                                           credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue='visualizer', durable=True)
    duration = 1500
    if airplane_id == 0:
        message = json.dumps({
            "Type": "movement",
            "From": f"{currentLocation}",
            "To": f"{tempLocation}",
            "Transport": f"FollowMe|{carid}",
            "Duration": duration,
        })
    else:
        message = json.dumps({
            "Type": "movement",
            "From": f"{currentLocation}",
            "To": f"{tempLocation}",
            "Transport": f"FollowMe|{carid}",
            "Duration": duration,
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

    connection.close()


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

        i = 1



    def run(self):
        while True:

            if not(self.queueTakeoff.empty()):
                print("Получил на взлет")
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
                print("Получил на посадку")
                with self.carLock:
                    with self.stripLock:
                        with self.parkingLock:
                            for car in self.carDict:
                                print(3)
                                for strip in self.stripDict:
                                    print(4)
                                    for parking in self.parkingDict:
                                        print(5)
                                        if not(self.queueLoad.empty()) and self.carDict[car] and self.stripDict[strip] and self.parkingDict[parking]:
                                            self.carDict[car] = False
                                            self.stripDict[strip] = False
                                            self.parkingDict[parking] = False
                                            t = threading.Thread(target=self.loadboard, args=(self.queueLoad.get(),parking,strip,car,))
                                            print(2)
                                            t.start()
                                            print(1)
                                            self.queueLoad.task_done()
                                            print(0)

            if not(self.queueAnswer.empty()):
                print("Получил ответ")
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

        currentPos = "FollowMeGarage1"
        nextPos = currentPos
        finishPos = parking_id

        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=0)
        self.startToStrip(carid=car, airplane_id=airplane_id)

        currentPos = finishPos
        nextPos = currentPos
        finishPos = strip + "AddFollowMe"

        with self.parkingLock:
            self.parkingDict[parking_id] = True

        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=airplane_id)

        self.endToStrip(stripid=strip, airplane_id=airplane_id)

        sendMaintain(carId=car, aircraftId=airplane_id)

        currentPos = finishPos
        nextPos = currentPos
        finishPos = "FollowMeGarage1"

        self.sendFly(car, airplane_id)

        landing = False
        while not (landing):
            with self.answerLock:
                for answer in self.answerDict:
                    if answer == car:
                        for ans in self.answerDict[answer]:
                            if ans['request'] == 'flicomp':
                                landing = True

        with self.stripLock:
            self.stripDict[strip] = True
        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=0)
        with self.carLock:
            self.carDict[car] = True



    def loadboard(self, massege, parking, strip, car):
        if massege['request'] != 'landing':
            print("Чет пошло не так")
        airplane_id = None
        try:
            airplane_id = massege['aircraftId']
        except:
            print("Неверный формат")
            exit(1)
        print(car, " Сожаю самолет")
        self.sendStrip(airplane_id, strip, car)
        currentPos = "FollowMeGarage"
        nextPos = currentPos
        finishPos = "Strip"+strip+"FollowMe"
        print(car, " Еду на ", strip)
        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=0)

        landing = False
        while not(landing):
            with self.answerLock:
                for answer in self.answerDict:
                    if answer == car:
                        for ans in self.answerDict[answer]:
                            if ans['request'] == 'landingcomp':
                                landing = True

        self.startToParking(car, airplane_id)
        print(car, " Приципил самолет ", airplane_id)
        currentPos = finishPos
        nextPos = currentPos
        finishPos = parking + "FollowMe"

        with self.stripLock:
            self.stripDict[strip] = True
        print(car, " Еду на ", parking)
        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=airplane_id)
        self.EndToParking(parkingid=parking, airplane_id=airplane_id)
        print(car, " Отправляю accept")
        sendAccept(carId=car, airplane_id=airplane_id, parking_id=parking)

        currentPos = finishPos
        nextPos = currentPos
        finishPos = "FollowMeGarage"
        print(car, " Еду на home")
        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=0)
        with self.carLock:
            self.carDict[car] = True


    def walk(self, currentPos, nextPos, finishPos, carid, airplane_id):
        while currentPos != finishPos:
            sendMovement(carid, currentPos, finishPos, "need")

            while nextPos == currentPos:
                with self.answerLock:
                    for answer in self.answerDict:
                        if answer == carid:
                            for ans in self.answerDict[answer]:
                                if ans['request'] == 'movement':
                                    nextPos = ans['to']
            sendVisualize(currentLocation=currentPos, tempLocation=nextPos, carid=carid, airplane_id=airplane_id)
            time.sleep(1.5)
            sendMovement(carid, currentPos, nextPos, "done")
            currentPos = nextPos

    def startToParking(self, carid,airplane_id):
        data = {'carId': carid}
        post_url = URL + '/' + airplane_id + '/followMe/startToParking'
        r = requests.post(url=post_url, data=data)
        while r.status_code != 200:
            if r.status_code == 404:
                print("Самолетик пропал: ", airplane_id)
                exit(1)
            r = requests.post(url=post_url, data=data)


    def EndToParking(self, parkingid,airplane_id):
        data = {'parkingId': parkingid}
        post_url = URL + '/' + airplane_id + '/followMe/EndToParking'
        r = requests.post(url=post_url, data=data)
        while r.status_code != 200:
            if r.status_code == 404:
                print("Самолетик пропал: ", airplane_id)
                exit(1)
            r = requests.post(url=post_url, data=data)


    def startToStrip(self, carid,airplane_id):
        data = {'carId': carid}
        post_url = URL + '/' + airplane_id + '/followMe/startToStrip'
        r = requests.post(url=post_url, data=data)
        while r.status_code != 200:
            if r.status_code == 404:
                print("Самолетик пропал: ", airplane_id)
                exit(1)
            r = requests.post(url=post_url, data=data)

    def endToStrip(self, stripid,airplane_id):
        data = {'stripId': stripid}
        post_url = URL + '/' + airplane_id + '/followMe/endToStrip'
        r = requests.post(url=post_url, data=data)
        while r.status_code != 200:
            if r.status_code == 404:
                print("Самолетик пропал: ", airplane_id)
                exit(1)
            r = requests.post(url=post_url, data=data)

    def sendStrip(self, aircraftid, stripid, carid):
        credentials = pika.PlainCredentials('user', 'password')
        parameters = pika.ConnectionParameters('10.99.67.120',
                                               5672,
                                               '/',
                                               credentials)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.queue_declare(queue='Airplane', durable=True)

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

        connection.close()

    def sendFly(self, aircraftid, carid):
        credentials = pika.PlainCredentials('user', 'password')
        parameters = pika.ConnectionParameters('10.99.67.120',
                                               5672,
                                               '/',
                                               credentials)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.queue_declare(queue='Airplane', durable=True)

        message = json.dumps({
            "type": "Fly",
            "value": {
                "aircraftid": f"{aircraftid}"
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

        connection.close()

    def sendInit(self):
        credentials = pika.PlainCredentials('user', 'password')
        parameters = pika.ConnectionParameters('10.99.67.120',
                                               5672,
                                               '/',
                                               credentials,
                                               blocked_connection_timeout=5)
        connection = pika.BlockingConnection(parameters)
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
    print("Пиршло сообщение: ", message)
    try:
        if message['service'] != 'follow_me':
            print("Не мое сообщение")
        if message['request'] == 'landing':
            fm.setLoad(message)
        if message['request'] == 'service':
            fm.setTakeoff(message)
        if message['request'] == 'movement':
            answer = {'id': properties.correlation_id, 'message':message}
            fm.setAnswer(answer)
        if message['request'] == 'landingcomp':
            answer = {'id': properties.correlation_id, 'message': message}
            fm.setAnswer(answer)
        if message['request'] == 'flicomp':
            answer = {'id': properties.correlation_id, 'message': message}
            fm.setAnswer(answer)
    except:
        print("Не мое сообщение")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)




if __name__ == '__main__':
    fm = Followme()
    fm.start()

    credentials = pika.PlainCredentials('user', 'password')
    parameters = pika.ConnectionParameters('10.99.67.120',
                                           5672,
                                           '/',
                                           credentials,
                                           blocked_connection_timeout=1000000)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.queue_declare(queue='FMMQ', durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(callback, queue='FMMQ')
    channel.start_consuming()
