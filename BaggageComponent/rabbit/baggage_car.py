import json
import pika
import requests
import time
import threading
from uuid import uuid4

from BaggageComponent.rabbit.utils import (
    get_channel,
    log_message,
    validate_response,
)
from BaggageComponent.rabbit.config import (
    AIRPLANE_QUEUE,
    AIRPLANE_API,
    BAGGAGE_API,
    BAGGAGE_QUEUE,
    PASSENGER_API,
    VISUALIZER_QUEUE,
    UND_ROUTING_KEY,
    UND_EXCHANGE,
)


class BaggageCar:
    BAGGAGE_CAPACITY = 10
    BAGGAGE_GARAGE = 'BaggageGarage'

    def __init__(self, capacity=BAGGAGE_CAPACITY):
        self.id = str(uuid4())
        self.location = self.BAGGAGE_GARAGE
        self.baggage_list = []
        self.callback_response = None
        self.baggage_capacity = capacity

        self.channel = get_channel()

        self.baggage_queue = self.channel.queue_declare(queue=BAGGAGE_QUEUE, durable=True)
        self.channel.basic_consume(self.handle_query, queue=BAGGAGE_QUEUE, no_ack=False)

        self.channel.queue_declare(queue=VISUALIZER_QUEUE, durable=True)
        self.init_visualizer()

        self.channel.exchange_declare(exchange=UND_EXCHANGE, exchange_type='direct', durable=True)
        self.channel.queue_declare(queue=AIRPLANE_QUEUE, durable=True)
        self.channel.basic_qos(prefetch_count=1)

    def consume_reply_to(self):
        channel = get_channel()
        queue = channel.queue_declare(exclusive=False, auto_delete=True)
        self.callback_queue = queue.method.queue
        channel.basic_consume(self.get_callback_response, queue=self.callback_queue, no_ack=True)
        channel.start_consuming()

    def init_visualizer(self):
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

    def run(self):
        thread = threading.Thread(target=self.consume_reply_to)
        thread.start()
        self.channel.start_consuming()

    def get_callback_response(self, ch, method, props, body):
        log_message(f'Got message in callback response {body}')
        if self.id == props.correlation_id:
            self.callback_response = json.loads(body.decode())

    def require_route(self, location_to):
        log_message(f'require route from {self.location} to {location_to}')

        params = {
            "service": "baggage",
            "request": "movement",
            "from": self.location,
            "to": location_to,
            "status": "need"
        }
        print('params to und', json.dumps(params))
        self.channel.basic_publish(exchange=UND_EXCHANGE,
                                   routing_key=UND_ROUTING_KEY,
                                   properties=pika.BasicProperties(
                                       reply_to=self.callback_queue,
                                       correlation_id=self.id,
                                       content_type='json',
                                   ),
                                   body=json.dumps(params))

        while self.callback_response is None:
            time.sleep(0.01)

        validate_response(self.callback_response, ["service", "request", "from", "to"])
        log_message(f'got from und message: service {self.callback_response["service"]}, '
                    f'source {self.callback_response["from"]}, '
                    f'dest {self.callback_response["to"]}')

        dest = self.callback_response['to']
        self.callback_response = None

        self.visualize(self.location, dest)
        self.location = dest
        params["to"] = dest
        params["status"] = "done"
        self.channel.basic_publish(exchange=UND_EXCHANGE,
                                   routing_key=UND_ROUTING_KEY,
                                   properties=pika.BasicProperties(
                                       content_type='json',
                                   ),
                                   body=json.dumps(params))

        if self.location != location_to:
            self.require_route(location_to)

    def handle_query(self, ch, method, props, body):
        try:
            print('start handling')

            params = json.loads(body.decode())
            validate_response(params, ["action", "request", "service", "gate_id", "airplane_id", "parking_id"])

            action = params['action']
            airplane_id = params['airplane_id']
            gate_id = params['gate_id']
            parking_id = params['parking_id']
            log_message(f'Got from UND new task: action {action}, airplane_id {airplane_id}, parking_id {parking_id}')

            if action == 'load':
                self.load_airplane(airplane_id, parking_id, gate_id)
            elif action == 'unload':
                self.unload_airplane(airplane_id, parking_id, gate_id)
            else:
                raise Exception('Error. Unknown action')

            params = {
                "service": "baggage",
                "request": "maintain",
                "airplane_id": airplane_id,
            }
            self.channel.basic_publish(exchange=UND_EXCHANGE,
                                       routing_key=UND_ROUTING_KEY,
                                       properties=pika.BasicProperties(
                                           content_type='json',
                                       ),
                                       body=json.dumps(params))

        except Exception as e:
            print('Error', e)
        finally:
            ch.basic_ack(delivery_tag=method.delivery_tag)

            print(self.baggage_queue.method.message_count)
            if self.baggage_queue.method.message_count == 0:
                self.require_route(self.BAGGAGE_GARAGE)

    def unload_airplane(self, airplane_id, parking_id, gate_id):
        log_message(f'Start unload airplane with {airplane_id}')
        content = json.loads(requests.get(f'{AIRPLANE_API}/info?id={airplane_id}').content.decode())
        log_message(f'Got response from airplane {content}')
        airplane_baggage_count = content[0]['baggageCount']
        if airplane_baggage_count == 0:
            return

        self.require_route(parking_id)

        params = {
            "type": "UnloadBaggage",
            "value": {
                "airplaneId": airplane_id,
                "carId": f"Baggage|{self.id}",
                "count": self.baggage_capacity
            }
        }
        self.channel.basic_publish(exchange='',
                                   routing_key=AIRPLANE_QUEUE,
                                   properties=pika.BasicProperties(
                                       reply_to=self.callback_queue,
                                       correlation_id=self.id
                                   ),
                                   body=json.dumps(params))
        while self.callback_response is None:
            time.sleep(0.01)

        validate_response(self.callback_response, ["baggage"])
        print('baggage from airplane', self.callback_response["baggage"])
        self.baggage_list = self.callback_response["baggage"]
        self.callback_response = None

        log_message(f'Got baggage list from airplane {self.baggage_list}')

        self.require_route(gate_id)
        params = {
            'flight_id': airplane_id,
            'baggage_ids': self.baggage_list,
        }

        requests.post(f'{BAGGAGE_API}/api/baggage', json=params)

        self.animate_loading()

        params = {
            "luggage": self.baggage_list
        }
        requests.post(f'{PASSENGER_API}/luggage_notify', json=params)

        baggage_list_length = len(self.baggage_list)
        self.baggage_list = []
        if airplane_baggage_count - baggage_list_length > 0:
            self.unload_airplane(airplane_id, parking_id, gate_id)

    def load_airplane(self, airplane_id, parking_id, gate_id):
        log_message(f'Start load airplane with {airplane_id}')

        content = json.loads(requests.get(f'{AIRPLANE_API}/info?id={airplane_id}').content.decode())
        log_message(f'Got response from airplane {content}')
        departure_flight_id = content[0]['departureFlightId']

        content = json.loads(requests.get(f'{BAGGAGE_API}/api/baggage/{departure_flight_id}?length=yes').content.decode())
        log_message(f'Got {content["baggage_count"]} from baggage component')

        baggage_count = content['baggage_count']
        if baggage_count == 0:
            return

        self.require_route(gate_id)

        params = {
            'flight_id': departure_flight_id,
            'count': self.baggage_capacity,
        }
        content = json.loads(requests.delete(f'{BAGGAGE_API}/api/baggage', json=params).content.decode())
        self.baggage_list = content
        log_message(f'Got from baggage component baggage list for loading to {airplane_id} {self.baggage_list}')

        self.animate_loading()

        self.require_route(parking_id)

        params = {
            "type": "LoadBaggage",
            "value": {
                "airplaneId": airplane_id,
                "carId": f"Baggage|{self.id}",
                "baggages": self.baggage_list
            }
        }
        self.channel.basic_publish(exchange='',
                                   routing_key=AIRPLANE_QUEUE,
                                   properties=pika.BasicProperties(
                                       reply_to=self.callback_queue,
                                       correlation_id=self.id
                                   ),
                                   body=json.dumps(params))
        while self.callback_response is None:
            time.sleep(0.01)

        validate_response(self.callback_response, ["result"])
        if self.callback_response["result"] != "ok":
            raise Exception("load airplane/incorrect answer result")
        self.callback_response = None

        baggage_list_length = len(self.baggage_list)
        self.baggage_list = []
        if baggage_count - baggage_list_length > 0:
            self.load_airplane(airplane_id, parking_id, gate_id)

    def visualize(self, location_from, location_to):
        duration = 1
        message = {
            'Type': 'movement',
            'From': location_from,
            'To': location_to,
            'Transport': f'Baggage|{self.id}',
            'Duration': duration * 1000,
        }

        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=json.dumps(message))
        time.sleep(duration)
        log_message(f'send message to visualiser from {location_from} to {location_to}')

    def animate_loading(self):
        duration = len(self.baggage_list)
        message = {
            'Type': 'animation',
            'AnimationType': 'baggage',
            'Transport': f'Baggage|{self.id}',
            'Duration': duration * 1000,
        }

        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=json.dumps(message))
        time.sleep(duration)


def main():
    car = BaggageCar()
    car.run()


if __name__ == '__main__':
    main()
