import pika
from datetime import datetime

FILE = 'log.txt'


def get_channel():
    # credentials = pika.PlainCredentials('user', 'password')
    # parameters = pika.ConnectionParameters('IP here', 5672, '/', credentials)
    # connection = pika.BlockingConnection(parameters)
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
    channel = connection.channel()
    return channel


def log_message(message):
    print(message)
    with open(FILE, 'a') as f:
        f.write(f'{datetime.now()}. {message}\n')


def validate_response(message, expected_fields):
    for field in expected_fields:
        if field not in message:
            raise Exception("Incorrect message format fields: {}, message {}".format(expected_fields, message))
