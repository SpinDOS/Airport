import pika
import sys
import json

def sendMovement(carId, fromId, toId):
    connection = pika.BlockingConnection(pika.URLParameters(
        'amqp://aazhpoyi:wl3G3Fu_s88DNK0Fr0N9XxsUBxmlzUcK@duckbill.rmq.cloudamqp.com/aazhpoyi'))
    channel = connection.channel()

    channel.queue_declare(queue='refuelerMQ', durable=True)

    message = json.dumps({
        "service":"follow_me",
        "request":"service",
        "from":f"{fromId}",
        "to":f"{toId}"
    })
    channel.basic_publish(exchange='',
                          routing_key='FMMQ',
                          body=message,
                          properties=pika.BasicProperties(
                              content_type="json",
                              correlation_id=f"{carId}",
                              reply_to="FMMQ"
                          ))
    print(" [x] Sent " % (json.loads(message)))

    connection.close()

sendMovement("1", "2", "3")
l = [1,2,3]
p = [4,5,6]

for t, o in zip(l,p):
    print(t, o)