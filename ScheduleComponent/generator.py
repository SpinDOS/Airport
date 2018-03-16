import json
import pika
import sys

from ScheduleComponent.config import (
    AIRPLANE_QUEUE_NAME,
    SCHEDULE_QUEUE_NAME
)
from ScheduleComponent.utils import (
    send_to_airplane,
    send_to_passengers
)

connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
channel = connection.channel()
channel.queue_declare(queue=SCHEDULE_QUEUE_NAME, durable=True)
channel.queue_declare(queue=AIRPLANE_QUEUE_NAME, durable=True)


def generator(ch, method, props, body):
    params = json.loads(body.decode())
    input_passenger_count = params['input_passenger_count']
    input_service_baggage_count = params['input_service_baggage_count']
    output_passenger_count = params['output_passenger_count']
    output_service_baggage_count = params['output_service_baggage_count']

    send_to_airplane(ch, input_passenger_count, input_service_baggage_count)
    send_to_passengers(output_passenger_count, output_service_baggage_count)


if len(sys.argv) == 1:
    channel.basic_consume(generator, queue=SCHEDULE_QUEUE_NAME, no_ack=True)
    channel.start_consuming()
else:
    # manual run
    in_pass_cnt, in_service_baggage = list(map(int, input('Enter input values: ').split()))
    out_pass_cnt, out_service_baggage = list(map(int, input('Enter output values: ').split()))
    send_to_airplane(channel, in_pass_cnt, in_service_baggage)
    send_to_passengers(out_pass_cnt, out_service_baggage)
