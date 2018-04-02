import pika


def get_channel():
    # credentials = pika.PlainCredentials('user', 'password')
    # parameters = pika.ConnectionParameters('IP here', 5672, '/', credentials)
    # connection = pika.BlockingConnection(parameters)
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='0.0.0.0'))
    channel = connection.channel()
    return channel


def validate_response(message, expected_fields):
    for field in expected_fields:
        if field not in message:
            raise Exception("Incorrect message format fields: {}, message {}".format(expected_fields, message))
