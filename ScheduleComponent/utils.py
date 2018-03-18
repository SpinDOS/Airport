import json
import random
import requests
from uuid import uuid4

from ScheduleComponent.config import (
    AIRPLANE_QUEUE_NAME,
    PASSENGER_API_URI,
)


def get_random_code():
    prefixes = ['S7', 'GH', 'СУ', 'ЮТ', 'ЯК', 'ДР', 'RT', 'LH']
    prefix = random.choice(prefixes)
    number = random.randint(1000, 9999)
    code = "%s-%s" % (prefix, number)
    return code


class Flight:
    def __init__(self, passengers_count, service_baggage_count):
        self.id = str(uuid4())
        self.code = get_random_code()
        self.passengers_count = passengers_count
        self.service_baggage_count = service_baggage_count


def send_to_airplane(ch, landing_flight, departure_flight):
    airplane_message = {
        "type": "CreateLandingAirplane",
        "value": {
            "landingFlight": {
                "id": landing_flight.id,
                "code": landing_flight.code,
                "passengersCount": landing_flight.passengers_count,
                "serviceBaggageCount": landing_flight.service_baggage_count
            },
            "id": departure_flight.id,
            "code": departure_flight.code,
            "passengersCount": departure_flight.passengers_count,
            "serviceBaggageCount": departure_flight.service_baggage_count
        }
    }
    ch.basic_publish(exchange='', routing_key=AIRPLANE_QUEUE_NAME, body=json.dumps(airplane_message))


def send_to_passengers(flight):
    print(flight.id)
    requests.get(f"{PASSENGER_API_URI}/generate_flight?flightID={flight.id}"
                 f"&pas={flight.passengers_count}&lug={flight.passengers_count}&serlug={flight.service_baggage_count}")
