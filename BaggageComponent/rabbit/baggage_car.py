import json
import pika
import requests
import time
from uuid import uuid4

from .utils import log_message
from .config import (
    AIRPLANE_API,
    BAGGAGE_API,
    BAGGAGE_QUEUE,
    PASSENGER_API,
    VISUALIZER_QUEUE,
    UND_ROUTING_KEY,
    UND_EXCHANGE,
)


class BaggageCar:
    BAGGAGE_CAPACIRY = 10
    BAGGAGE_GARAGE = 'BaggageGarage|1'

    def __init__(self, capacity=BAGGAGE_CAPACIRY):
        self.id = str(uuid4())
        self.location = self.BAGGAGE_GARAGE
        self.baggage_list = []
        self.und_response = None
        self.baggage_capacity = capacity

        self.connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
        self.channel = self.connection.channel()
        self.baggage_queue = self.channel.queue_declare('baggage', durable=True)
        self.channel.exchange_declare(exchange=UND_EXCHANGE, exchange_type='direct')
        self.channel.basic_consume(self.handle_query, queue=BAGGAGE_QUEUE, no_ack=True)

        # init visualizer
        init_message = {
            'Type': 'init',
            'TransportType': 'Baggage',
            'Ids': [self.id],
            'Add': True
        }

        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=json.dumps(init_message))

        queue = self.channel.queue_declare(exclusive=True)
        self.callback_queue = queue.method.name
        self.channel.basic_consume(self.get_und_response, queue=self.callback_queue, no_ack=True)
        self.channel.basic_qos(prefetch_count=1)

    def run(self):
        self.channel.start_consuming()

    def get_und_response(self, ch, method, props, body):
        if self.id == props.correlation_id:
            self.und_response = json.loads(body.decode())

    def require_route(self, location_to):
        log_message(f'require route from {location_from} to {location_to}')

        params = {
            "service": "baggage",
            "request": "movement",
            "from": self.location,
            "to": location_to
        }
        params = json.dumps(params)
        self.channel.basic_publish(exchange='amqp.gtc',
                                   routing_key='gtc.gate',
                                   properties=pika.BasicProperties(
                                       reply_to=self.callback_queue,
                                       correlation_id=self.id,
                                       content_type='json',
                                   ),
                                   body=params)

        while self.und_response is None:
            self.connection.process_data_events()

        log_message(f'got from und message: service {self.und_response["service"]}, '
                    f'status {self.und_response["status"]} '
                    f'source {self.und_response["from"]}, '
                    f'dest {self.und_response["to"]}')
        if self.und_response["status"] != "ok":
            raise Exception("Incorrect status from UND")

        dest = self.und_response['to']
        self.und_response = None

        self.visualize(self.location, dest)
        self.location = dest

        if self.location != location_to:
            self.require_route(location_to)

    def handle_query(self, ch, method, props, body):
        params = json.loads(body.decode())
        action = params['action']
        flight_id = params['flightId']
        gate_id = params['gateId']
        parking_id = params['parkingId']
        log_message(f'Got from UND new task: action {action}, flight_id {flight_id}, parking_id {parking_id}')

        if action == 'load':
            self.load_airplane(flight_id, parking_id, gate_id)
        elif action == 'unload':
            self.unload_airplane(flight_id, parking_id, gate_id)
        else:
            log_message('Error. Unknown action')
            raise Exception('Error. Unknown action')

        # notify UND
        message = {
            "service": "baggage",
            "request": "maintain",
            "flightid": flight_id,
            "status": "done"
        }
        self.channel.basic_publish(exchange=UND_EXCHANGE,
                                   routing_key=UND_ROUTING_KEY,
                                   properties=pika.BasicProperties(
                                       content_type='json',
                                   ),
                                   body=json.dumps(message))

        if self.baggage_queue.method.message_count == 0:
            self.require_route(self.BAGGAGE_GARAGE)

    def unload_airplane(self, flight_id, parking_id, gate_id):
        log_message(f'Start unload airplane with {flight_id}')

        # ask airplane about baggage count
        content = json.loads(requests.get(AIRPLANE_API).content.decode())
        airplane_baggage_count = content['baggage_count']

        if airplane_baggage_count == 0:
            return

        self.require_route(parking_id)

        # use airplane api for retrieving baggage
        content = json.loads(requests.post(AIRPLANE_API, json={'count': self.baggage_capacity}).content.decode())
        self.baggage_list = content['baggage_list']

        log_message(f'Got baggage list from airplane {self.baggage_list}')

        self.require_route(gate_id)
        parameters = {
            'flight_id': flight_id,
            'baggage_ids': self.baggage_list,
        }
        requests.post(f'{BAGGAGE_API}/api/baggage', json=parameters)

        self.baggage_list = []
        log_message(f'From Baggage api got status {content["status"]}')

        # TODO need to add notification passengers about new baggage

        if airplane_baggage_count - len(self.baggage_list) > 0:
            self.unload_airplane(flight_id, parking_id, gate_id)

    def load_airplane(self, flight_id, parking_id, gate_id):
        log_message(f'Start load airplane with {flight_id}')

        content = requests.get(f'{BAGGAGE_API}/api/baggage/{flight_id}?length=yes').content
        response = json.loads(content.decode())
        log_message(f'Got {response["baggage_count"]} from baggage component')

        baggage_count = content['baggage_count']
        if baggage_count == 0:
            return

        self.require_route(gate_id)

        parameters = {
            'flight_id': flight_id,
            'count': self.baggage_capacity,
        }
        content = json.loads(requests.delete(f'{BAGGAGE_API}/api/baggage', json=parameters).content.decode())
        self.baggage_list = content
        log_message(f'Got from baggage component baggage list for loading to {flight_id} {self.baggage_list}')

        self.require_route(parking_id)

        # load baggage to air plane
        json.loads(requests.post(AIRPLANE_API, json={'baggage_list': self.baggage_list}).content.decode())

        baggage_list_length = len(self.baggage_list)
        self.baggage_list = []
        if baggage_count - baggage_list_length > 0:
            self.load_airplane(flight_id, parking_id, gate_id)

    def visualize(self, location_from, location_to):
        ms = 1000
        message = {
            'Type': 'movement',
            'From': location_from,
            'To': location_to,
            'Transport': f'Baggege|{self.id}',
            'Duration': ms,
        }
        progress = 0
        while progress <= 1:
            message['Progress'] = progress
            self.channel.basic_publish(exchange='',
                                       routing_key=VISUALIZER_QUEUE,
                                       properties=pika.BasicProperties(content_type='json'),
                                       body=json.dumps(message))
            time.sleep(ms / 1000)
            progress += 0.01
        log_message(f'send message to visualiser from {location_from} to {location_to}')


def main():
    car = BaggageCar()
    car.run()


if __name__ == '__main__':
    main()
