import json
import uuid
import random
import requests

from .config import AIRPLANE_QUEUE_NAME


def get_random_code():
    prefixes = ['S7', 'GH', 'СУ', 'ЮТ', 'ЯК', 'ДР', 'RT', 'LH']
    prefix = random.choice(prefixes)
    number = random.randint(100, 999)
    code = "%s-%s" % (prefix, number)
    return code


def send_to_airplane(ch, in_passenger_count, in_service_baggage_count):
    airplane_message = {
        'type': 'AirplaneCreation',
        'value': {
            'Рейс на посадку': {
                'id': str(uuid.uuid4()),
                'code': get_random_code(),
                'passenger_count': in_passenger_count,
                'service_baggage': in_service_baggage_count
            },
            'Рейс на вылет': {
                'id': str(uuid.uuid4()),
                'code': get_random_code()
            }
        }
    }
    ch.basic_publish(exchange='', routing_key=AIRPLANE_QUEUE_NAME, body=json.dumps(airplane_message))


def send_to_passengers(out_passenger_count, out_service_baggage_count):
    flight_id = str(uuid.uuid4())
    print(flight_id)
    passenger_count = out_passenger_count
    service_baggage_count = out_service_baggage_count
    requests.get(f"{PASSENGER_API_URI}/generate_flight?flightID={flight_id}"
                 f"&pas={passenger_count}&lug={passenger_count}&serlug={service_baggage_count}")
