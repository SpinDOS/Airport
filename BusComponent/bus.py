import pika
import json
import time
import requests
from uuid import uuid4
import threading

from BusComponent.utils import (
    get_channel,
    log_message,
    validate_response
)

from BusComponent.config import (
    AIRPLANE_QUEUE,
    AIRPLANE_API,
    BUS_QUEUE,
    PASSENGER_API,
    VISUALIZER_QUEUE,
    UND_ROUTING_KEY,
    UND_EXCHANGE,
)


class Bus:
    BUS_CAPACITY = 10
    BUS_GARAGE = 'BusGarage'

    def __init__(self, capacity=BUS_CAPACITY):
        self.id = str(uuid4())
        self.location = self.BUS_GARAGE
        self.passenger_list = []
        self.callback_response = None
        self.bus_capacity = capacity

        self.channel = get_channel()

        self.bus_queue = self.channel.queue_declare(queue=BUS_QUEUE, durable=True)
        self.channel.basic_consume(self.handle_query, queue=BUS_QUEUE, no_ack=False)

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
            'TransportType': 'Bus',
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
        if self.id == props.correlation_id:
            self.callback_response = json.loads(body.decode())

    def require_route(self, location_to):
        log_message(f'require route from {self.location} to {location_to}')

        params = {
            "service": "bus",
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
                "service": "bus",
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
            self.require_route(self.BUS_GARAGE)

    def visualize(self, location_from, location_to):
        duration = 0.5
        message = {
            'Type': 'movement',
            'From': location_from,
            'To': location_to,
            'Transport': f'Bus|{self.id}',
            'Duration': duration * 1000,
        }

        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=json.dumps(message))
        time.sleep(duration)
        log_message(f'send message to visualiser from {location_from} to {location_to}')

    def animate_loading(self):
        duration = len(self.passenger_list) or self.bus_capacity
        message = {
            'Type': 'animation',
            'AnimationType': 'passengers',
            'Transport': f'Bus|{self.id}',
            'Duration': duration * 1000,
        }

        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=json.dumps(message))
        time.sleep(duration)

    def unload_airplane(self, airplane_id, parking_id, gate_id):
        log_message(f'Start unload airplane with {airplane_id}')
        content = json.loads(requests.get(f'{AIRPLANE_API}/info?id={airplane_id}').content.decode())
        log_message(f'Got response from airplane {content[0]}')
        airplane_passenger_count = content[0]['passengersCount']
        if airplane_passenger_count == 0:
            return

        self.require_route(parking_id)

        params = {
            "type": "UnloadPassengers",
            "value": {
                "airplaneId": airplane_id,
                "busId": f"{self.id}",
                "count": self.bus_capacity
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

        validate_response(self.callback_response, ["passengers"])
        print('passengers from airplane', self.callback_response["passengers"])
        self.passenger_list = self.callback_response["passengers"]
        self.callback_response = None

        log_message(f'Got passenger list from airplane count = {len(self.passenger_list)} {self.passenger_list}')

        self.change_passenger_status("InBus", f"{self.id}")
        self.require_route(gate_id)

        self.change_passenger_status("LandingForBusToGate")
        self.animate_loading()
        self.change_passenger_status("InGate")

        passenger_list_length = len(self.passenger_list)
        self.passenger_list = []
        if airplane_passenger_count - passenger_list_length > 0:
            self.unload_airplane(airplane_id, parking_id, gate_id)

    def load_airplane(self, airplane_id, parking_id, gate_id):
        log_message(f'Start load airplane with {airplane_id}')

        content = json.loads(requests.get(f'{AIRPLANE_API}/info?id={airplane_id}').content.decode())
        log_message(f'Got response from airplane {content}')
        departure_flight_id = content[0]['departureFlightId']

        content = json.loads(requests.get(f'{PASSENGER_API}/passengers?flight={departure_flight_id}&status=WaitForBus').content.decode())
        passenger_count = len(content)
        if passenger_count == 0:
            return

        self.passenger_list = []
        for i in range(min(self.BUS_CAPACITY, passenger_count)):
            self.passenger_list.append(str(content[i]['id']))

        self.require_route(gate_id)

        self.change_passenger_status("BoardingToBusFromGate", f"{self.id}")
        self.animate_loading()
        self.change_passenger_status("InBus", f"{self.id}")

        self.require_route(parking_id)

        self.change_passenger_status("BoardingFromBusToAirplane", f"{airplane_id}")

        params = {
            "type": "LoadPassengers",
            "value": {
                "airplaneId": airplane_id,
                "busId": f"{self.id}",
                "passengers": self.passenger_list
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
        if self.callback_response["result"] != "LoadOk":
            raise Exception("load airplane/incorrect answer result")
        self.callback_response = None

        passenger_list_length = len(self.passenger_list)
        self.passenger_list= []
        if passenger_count - passenger_list_length > 0:
            self.load_airplane(airplane_id, parking_id, gate_id)

    def change_passenger_status(self, status, transport_id=None):
        params = {
            "newStatus": status,
            "passengers": self.passenger_list
        }
        if transport_id is not None:
            params["transportID"] = transport_id
        content = json.loads(requests.post(f"{AIRPLANE_API}/change_status", json=params).content.decode())
        print("Changed passengers' status", content)


def main():
    car = Bus()
    car.run()


if __name__ == '__main__':
    main()
