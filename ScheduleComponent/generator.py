import json
import pika
import sys

from ScheduleComponent.config import (
    AIRPLANE_QUEUE_NAME,
    SCHEDULE_QUEUE_NAME
)
from ScheduleComponent.utils import (
    Flight,
    send_to_airplane,
    send_to_passengers,
)

# credentials = pika.PlainCredentials('user', 'password')
# parameters = pika.ConnectionParameters('IP here', 5672, '/', credentials)
# connection = pika.BlockingConnection(parameters)
connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
channel = connection.channel()
channel.queue_declare(queue=SCHEDULE_QUEUE_NAME, durable=True)
channel.queue_declare(queue=AIRPLANE_QUEUE_NAME, durable=True)


def send_flights(ch, landing_flight, departure_flight):
    send_to_airplane(ch, landing_flight, departure_flight)
    send_to_passengers(departure_flight)


def generator(ch, method, props, body):
    params = json.loads(body.decode())
    input_passenger_count = params['input_passenger_count']
    input_service_baggage_count = params['input_service_baggage_count']
    output_passenger_count = params['output_passenger_count']
    output_service_baggage_count = params['output_service_baggage_count']

    landing_flight = Flight(input_passenger_count, input_service_baggage_count)
    departure_flight = Flight(output_passenger_count, output_service_baggage_count)
    send_flights(ch, landing_flight, departure_flight)


if len(sys.argv) > 1:
    channel.basic_consume(generator, queue=SCHEDULE_QUEUE_NAME, no_ack=True)
    channel.start_consuming()
else:
    # manual running
    in_pass_cnt, in_service_baggage = list(map(int, input('Enter input values: ').split()))
    out_pass_cnt, out_service_baggage = list(map(int, input('Enter output values: ').split()))

    landing_flight = Flight(in_pass_cnt, in_service_baggage)
    departure_flight = Flight(out_pass_cnt, out_service_baggage)
    send_flights(channel, landing_flight, departure_flight)
