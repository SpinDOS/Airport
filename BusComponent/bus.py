import json
import pika
import requests
import threading
import time
from uuid import uuid4

from Airport.utils import (
    get_channel,
    validate_response
)
from Airport.utils.config import (
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

    def __init__(self):
        self.id = str(uuid4())
        self.location = self.BUS_GARAGE
        self.passenger_list = []
        self.callback_response = None
        self.bus_capacity = self.BUS_CAPACITY

        self.declare_channel()

    def declare_channel(self):
        self.channel = get_channel()
        self.channel.basic_qos(prefetch_count=1)

        self.bus_queue = self.channel.queue_declare(queue=BUS_QUEUE, durable=True)
        self.channel.basic_consume(self.handle_query, queue=BUS_QUEUE, no_ack=False)

        self.channel.queue_declare(queue=VISUALIZER_QUEUE, durable=True)
        self.init_visualizer()

        self.channel.exchange_declare(exchange=UND_EXCHANGE, exchange_type='direct', durable=True)
        self.channel.queue_declare(queue=AIRPLANE_QUEUE, durable=True)

    def consume_reply_to(self):
        channel = get_channel()
        queue = channel.queue_declare(exclusive=False, auto_delete=True)
        self.callback_queue = queue.method.queue
        channel.basic_consume(self.get_callback_response, queue=self.callback_queue, no_ack=True)
        channel.start_consuming()

    def init_visualizer(self):
        print('init visualizer')
        params = json.dumps({
            'Type': 'init',
            'TransportType': 'Bus',
            'Ids': [self.id],
            'Add': True
        })
        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=params)

    def run(self):
        thread = threading.Thread(target=self.consume_reply_to)
        thread.start()
        print(f'Bus {self.id} start_consuming')
        self.channel.start_consuming()

    def get_callback_response(self, ch, method, props, body):
        if self.id == props.correlation_id:
            self.callback_response = json.loads(body.decode())

    def require_route(self, location_to):
        print(f'require route from {self.location} to {location_to}')

        while self.location != location_to:
            params = {
                "service": "bus",
                "request": "movement",
                "from": self.location,
                "to": location_to,
                "status": "need"
            }
            print(f'params to und: from {params["from"]} to {params["to"]}')
            self.channel.basic_publish(exchange=UND_EXCHANGE,
                                       routing_key=UND_ROUTING_KEY,
                                       properties=pika.BasicProperties(
                                           reply_to=self.callback_queue,
                                           correlation_id=self.id,
                                           content_type='json',
                                       ),
                                       body=json.dumps(params))

            while self.callback_response is None:
                time.sleep(0.05)

            validate_response(self.callback_response, ["service", "request", "from", "to"])
            print(f'params from und: from {self.callback_response["from"]} to {self.callback_response["to"]}')

            dest = self.callback_response['to']
            self.callback_response = None
            self.visualize(self.location, dest)
            self.location = dest
            params["to"] = dest
            params["status"] = "done"
            self.channel.basic_publish(exchange=UND_EXCHANGE,
                                       routing_key=UND_ROUTING_KEY,
                                       properties=pika.BasicProperties(content_type='json'),
                                       body=json.dumps(params))

    def handle_query(self, ch, method, props, body):
        params = json.loads(body.decode())
        validate_response(params, ["action", "request", "service", "gate_id", "airplane_id", "parking_id"])

        action = params['action']
        airplane_id = params['airplane_id']
        gate_id = params['gate_id']
        parking_id = params['parking_id']

        print(f'got new task: action {action}, airplane_id {airplane_id}, parking_id {parking_id}')
        if action == 'load':
            self.load_airplane(airplane_id, parking_id, gate_id)
        elif action == 'unload':
            self.unload_airplane(airplane_id, parking_id, gate_id)
        else:
            raise Exception('Unknown action')

        params = json.dumps({
            "service": "bus",
            "request": "maintain",
            "airplane_id": airplane_id,
        })
        self.channel.basic_publish(exchange=UND_EXCHANGE,
                                   routing_key=UND_ROUTING_KEY,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=params)
        print(f'sent maintain message with action {action}')
        ch.basic_ack(delivery_tag=method.delivery_tag)
        self.require_route(self.BUS_GARAGE)

    def visualize(self, location_from, location_to):
        duration = 0.5
        print(f'visualize from {location_from} to {location_to} with duration {duration}')
        params = json.dumps({
            'Type': 'movement',
            'From': location_from,
            'To': location_to,
            'Transport': f'Bus|{self.id}',
            'Duration': duration * 1000,
        })
        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=params)
        time.sleep(duration)

    def animate(self):
        duration = len(self.passenger_list) or self.bus_capacity
        print(f'animate loading/unloading with duration {duration}')
        params = json.dumps({
            'Type': 'animation',
            'AnimationType': 'passengers',
            'Transport': f'Bus|{self.id}',
            'Duration': duration * 1000,
        })
        self.channel.basic_publish(exchange='',
                                   routing_key=VISUALIZER_QUEUE,
                                   properties=pika.BasicProperties(content_type='json'),
                                   body=params)
        time.sleep(duration)

    def unload_airplane(self, airplane_id, parking_id, gate_id):
        content = json.loads(requests.get(f'{AIRPLANE_API}/info?id={airplane_id}').content.decode())
        airplane_passenger_count = content[0]['passengersCount']
        print(f'got response from airplane api: passengersCount = {airplane_passenger_count}')

        if airplane_passenger_count == 0:
            return

        while airplane_passenger_count > 0:
            self.require_route(parking_id)

            params = json.dumps({
                "type": "UnloadPassengers",
                "value": {
                    "airplaneId": airplane_id,
                    "busId": f"{self.id}",
                    "count": self.bus_capacity
                }
            })
            self.channel.basic_publish(exchange='',
                                       routing_key=AIRPLANE_QUEUE,
                                       properties=pika.BasicProperties(
                                           reply_to=self.callback_queue,
                                           correlation_id=self.id
                                       ),
                                       body=params)
            while self.callback_response is None:
                time.sleep(0.05)

            validate_response(self.callback_response, ["passengers"])
            self.passenger_list = self.callback_response["passengers"]
            self.callback_response = None
            print(f'got response from airplane api: passenger_list len = {len(self.passenger_list)}')

            self.change_passenger_status("InBus", f"{self.id}")
            self.require_route(gate_id)
            self.change_passenger_status("LandingFromBusToGate")
            self.animate()
            self.change_passenger_status("InGate")

            airplane_passenger_count -= len(self.passenger_list)
            self.passenger_list = []

    def load_airplane(self, airplane_id, parking_id, gate_id):
        content = json.loads(requests.get(f'{AIRPLANE_API}/info?id={airplane_id}').content.decode())
        departure_flight_id = content[0]['departureFlightId']
        print(f'got response from airplane api: departureFlightId = {departure_flight_id}')

        content = json.loads(requests.get(f'{PASSENGER_API}/passengers?flight={departure_flight_id}&status=WaitForBus')
                             .content.decode())
        passenger_count = len(content)
        print(f'got response from passenger api: {passenger_count}')

        if passenger_count == 0:
            return

        while passenger_count > 0:
            content = json.loads(
                requests.get(f'{PASSENGER_API}/passengers?flight={departure_flight_id}&status=WaitForBus')
                .content.decode())

            for i in range(min(passenger_count, self.bus_capacity)):
                self.passenger_list.append(str(content[i]['id']))

            self.require_route(gate_id)
            self.change_passenger_status("BoardingToBusFromGate", f"{self.id}")
            self.animate()
            self.change_passenger_status("InBus", f"{self.id}")
            self.require_route(parking_id)
            self.change_passenger_status("BoardingFromBusToAirplane", f"{airplane_id}")

            params = json.dumps({
                "type": "LoadPassengers",
                "value": {
                    "airplaneId": airplane_id,
                    "busId": f"{self.id}",
                    "passengers": self.passenger_list
                }
            })
            self.channel.basic_publish(exchange='',
                                       routing_key=AIRPLANE_QUEUE,
                                       properties=pika.BasicProperties(
                                           reply_to=self.callback_queue,
                                           correlation_id=self.id
                                       ),
                                       body=params)
            while self.callback_response is None:
                time.sleep(0.05)

            validate_response(self.callback_response, ["result"])
            result = self.callback_response["result"]
            self.callback_response = None
            print(f'got response from airplane mq: result = {result}')
            if result != "LoadOk":
                raise Exception("load airplane/incorrect result value")

            passenger_count -= len(self.passenger_list)
            self.passenger_list = []

    def change_passenger_status(self, status, transport_id=None):
        params = {
            "newStatus": status,
            "passengers": self.passenger_list
        }
        if transport_id is not None:
            params["transportID"] = transport_id
        content = requests.post(f"{PASSENGER_API}/change_status", json=params).content.decode()
        print(f'got response from passenger api: content = {content}')
        # content = json.loads(requests.post(f"{PASSENGER_API}/change_status", json=params).content.decode())



def main():
    car = Bus()
    car.run()


if __name__ == '__main__':
    main()
