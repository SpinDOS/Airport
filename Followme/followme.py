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


def sendMovement(carId, fromId, toId):
    connection = pika.BlockingConnection(pika.URLParameters(
        'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
    channel = connection.channel()

    channel.queue_declare(queue='gtc.gate', durable=True)

    message = json.dumps({
        "service":"follow_me",
        "request":"movement",
        "from":f"{fromId}",
        "to":f"{toId}"
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

    #flightId = getFlightId(aircraftId)

    message = json.dumps({
        "service":"follow_me",
        "request":"maintain",
        "flightid":f"{flightId}",
        "status":"done"
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

    carLock = threading.RLock()
    parkingLock = threading.RLock()
    stripLock = threading.RLock()

    queueLoad = Queue()
    queueTakeoff = Queue()

    def __init__(self):
        threading.Thread.__init__(self)
        self.sendInit()


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
                                    t = threading.Thread(target=self.takeoff, args=(self.queueTakeoff.get(),))
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
                                            t = threading.Thread(target=self.loadboard, args=(self.queueLoad.get(),))
                                            t.start()
                                            self.queueLoad.task_done()


    def takeoff(self, massege, ):
        print(massege)

    def loadboard(self, massege):
        print(massege)


    def sendStrip(self, aircraftid, stripid):
        connection = pika.BlockingConnection(pika.URLParameters(
            'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
        channel = connection.channel()

        channel.queue_declare(queue='Airplane', durable=True)

        message = json.dumps({
            "type": "Садись",
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
                                  correlation_id=f"{self.uuid}",
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


def callback(ch, method, properties, body):
    message = json.loads(body)
    try:
        if message['service'] != 'follow_me':
            print("Не мое сообщение")
        if message['request'] == 'landing':
            fm.setLoad(message)
        if message['request'] == 'service':
            fm.setTakeoff(message)
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

