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


URL = ""

def sendMovement(carId, fromId, toId, status):
    connection = pika.BlockingConnection(pika.URLParameters(
        'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
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
    connection = pika.BlockingConnection(pika.URLParameters(
        'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
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
    connection = pika.BlockingConnection(pika.URLParameters(
        'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
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
    connection = pika.BlockingConnection(pika.URLParameters(
        'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
    channel = connection.channel()

    channel.queue_declare(queue='visualizer', durable=True)

    if airplane_id == 0:
        message = json.dumps({
            "Type": "movement",
            "From": f"{currentLocation}",
            "To": f"{tempLocation}",
            "Transport": f"Fuel|{carid}",
            "Duration": f"1000",
        })
    else:
        message = json.dumps({
            "Type": "movement",
            "From": f"{currentLocation}",
            "To": f"{tempLocation}",
            "Transport": f"Fuel|{carid}",
            "Duration": f"1000",
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
        'AirParking|1': True,
        'AirParking|2': True,
        'AirParking|3': True,
        'AirParking|4': True
        }

    stripDict = {
        'Strip|1': True,
        'Strip|2': True,
        'Strip|3': True,
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
                with self.carLock:
                    with self.stripLock:
                        for car in self.carDict:
                            for strip in self.stripDict:
                                if self.carDict[car] and self.stripDict[strip]:
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
                                        if self.carDict[car] and self.stripDict[strip] and self.parkingDict[parking]:
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

        currentPos = "FollowMeGarage|1"
        nextPos = currentPos
        finishPos = parking_id + "FollowMeBack"

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
        finishPos = "FollowMeGarage|1"

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
        self.sendStrip(airplane_id, strip, car)
        currentPos = "FollowMeGarage|1"
        nextPos = currentPos
        finishPos = strip+"FollowMe"

        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=0)

        landing = False
        while not(landing):
            with self.answerLock:
                for answer in self.answerDict:
                    if answer['request'] == 'landingcomp':
                        landing = True

        self.startToParking(car, airplane_id)
        currentPos = finishPos
        nextPos = currentPos
        finishPos = parking + "FollowMe"

        with self.stripLock:
            self.stripDict[strip] = True
        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=airplane_id)
        self.EndToParking(parkingid=parking, airplane_id=airplane_id)

        sendAccept(carId=car, airplane_id=airplane_id, parking_id=parking)

        currentPos = finishPos
        nextPos = currentPos
        finishPos = "FollowMeGarage|1"
        self.walk(currentPos=currentPos, nextPos=nextPos, finishPos=finishPos, carid=car, airplane_id=0)
        with self.carLock:
            self.carDict[car] = True


    def walk(self, currentPos, nextPos, finishPos, carid, airplane_id):
        while currentPos != finishPos:
            sendMovement(carid, currentPos, finishPos, "need")

            while nextPos == currentPos:
                with self.answerLock:
                    for answer in self.answerDict:
                        if answer['request'] == 'movement':
                            nextPos = answer['to']
            sendVisualize(currentLocation=currentPos, tempLocation=nextPos, carid=carid, airplane_id=airplane_id)
            sendMovement(carid, currentPos, finishPos, "done")
            nextPos = currentPos

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
        connection = pika.BlockingConnection(pika.URLParameters(
            'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
        channel = connection.channel()

        channel.queue_declare(queue='Airplane', durable=True)

        message = json.dumps({
            "type": "Landing",
            "value": {
                "stripid": f"{stripid}",
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

        def sendFly(self, aircraftid, carid):
            connection = pika.BlockingConnection(pika.URLParameters(
                'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
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
        connection = pika.BlockingConnection(pika.URLParameters(
            'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
        channel = connection.channel()

        channel.queue_declare(queue='visualizer', durable=True)

        idCar = []
        for car in self.carDict:
            idCar.append(car)

        message = json.dumps({
            "Type": "init",
            "TransportType": f"FollowMe",
            "Ids": f"{idCar}",
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
            answer = {'id': properties['correlation_id'], 'message':message}
            fm.setAnswer(answer)
        if message['request'] == 'landingcomp':
            answer = {'id': message['fmid'], 'message': message}
            fm.setAnswer(answer)
    except:
        print("Не мое сообщение")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)




if __name__ == '__main__':
    fm = Followme()
    fm.start()

    param = pika.URLParameters(
        'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi')
    connection = pika.BlockingConnection(param)
    channel = connection.channel()
    channel.queue_declare(queue='FMMQ', durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(callback, queue='FMMQ')
    channel.start_consuming()

