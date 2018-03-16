from datetime import datetime

FILE = 'log.txt'


def log_message(message):
    with open(FILE, 'a') as f:
        f.write(f'{datetime.now()}.{message}\n')

log_message("hewllo")