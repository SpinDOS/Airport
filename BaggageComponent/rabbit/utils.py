from datetime import datetime

FILE = 'log.txt'


def log_message(message):
    print(message)
    with open(FILE, 'a') as f:
        f.write(f'{datetime.now()}. {message}\n')


def validate_response(message, expected_fields):
    for field in expected_fields:
        if field not in message:
            raise Exception("Incorrect message format")
