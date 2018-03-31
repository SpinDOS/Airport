from sql import db, getApp
import uuid
import random
import datetime
import requests
from flask import request, jsonify
app = getApp()
from telelog import telelog
from sqlalchemy import or_

class Passenger(db.Model):
    __tablename__ = "lab_Passengers"
    Id = db.Column(db.String(36), primary_key=True)
    first_name = db.Column(db.String(32))
    last_name = db.Column(db.String(32))
    patronymic = db.Column(db.String(32))
    gender = db.Column(db.String(1))
    birthdate = db.Column(db.Date)
    luggage = db.Column(db.String(36))
    flight = db.Column(db.String(36))
    #state = db.Column(db.String(40)) #db.Enum('Unknown', 'WaitForBus', 'InBus', 'WaitForAirplane', 'InAirplane', 'WaitForLuggage', 'Left')) # InBus => InBusToAirport & InBusToAirplane; WaitForBus => WaitForBusToAirport & WaitForBusToAirplane ?
    state = db.Column(db.Enum('InAirplane', 'LandingFromAirplaneToBus', 'InBus', 'LandingFromBusToGate', 'InGate', 'WaitForLuggage', 'Left', 'WaitForBus', 'BoardingToBusFromGate', 'BoardingFromBusToAirplane', 'FlewAway'))
    transport = db.Column(db.String(36)) # ID транспорта, в котором находиться пассажир
    direction = db.Column(db.Enum('Arriving', 'Departing'))

    def serialize(self, extended = False):
        if extended:
            return {'id': self.Id, 'first_name': self.first_name, 'last_name': self.last_name, 'patronymic': self.patronymic, 'gender': self.gender, 'birthdate': self.birthdate,'luggage': self.luggage,'flight': self.flight, 'state': self.state, 'transport': self.transport, 'direction': self.direction}
        else:
            return {'id': self.Id, 'first_name': self.first_name, 'luggage': self.luggage,'flight': self.flight, 'state': self.state}

db.create_all()

surnameslist=['Абрамов','Авдеев','Агафонов','Аксёнов','Александров','Алексеев','Андреев','Анисимов','Антонов','Артемьев','Архипов','Афанасьев','Баранов','Белов','Белозёров','Белоусов','Беляев','Беляков','Беспалов','Би,юков','Блинов','Блохин','Бобров','Бобылёв','Богданов','Большаков','Борисов','Брагин','Буро','Быков','Васильев','Веселов','Виноградов','Вишняков','Владимиров','Власов','Волков','Воробьёв','Воронов','Ворон,ов','Гаврилов','Галкин','Герасимов','Голубев','Горбачёв','Горбунов','Гордеев','Горшков','Григорьев','Гришин','Громов','Гуляев','Гурьев','Гусев','Гущин','Давыдов','Данилов','Дементьев','Денисов','Дмитриев','Доронин','Дорофеев','Дроздов','Дьячков','Евдокимов','Евсеев','Егоров','Елисеев','Емельянов','Ермаков','Ершов','Ефимов','Ефремов','Жданов','Жуков','Журавлёв','Зайцев','Захаров','Зимин','Зиновьев','Зуев','Зыков','Иванков','Иванов','Игнатов','Игнатьев','Ильин','Исаев','Исаков','Кабанов','Казаков','Калашников','Калинин','Капустин','Карпов','Кириллов','Киселёв','Князев','Ковалёв','Козлов','Колесников','Коло,ов','Комаров','Комиссаров','Кондратьев','Коновалов','Кононов','Константинов','Копылов','Корнилов','Королёв','Костин','Котов','Кошелев','Красильников','Крылов','Крюков','Кудрявцев','Кудряшов','Кузнецов','Кузьмин','Кулагин','Кулаков','Куликов','Лаврентьев','Лазарев','Лапин','Ларионов','Лебедев','Лихачёв','Лобанов','Логинов','Лукин','Лыткин','Макаров','Максимов','Мамонтов','Марков','Мартынов','Маслов','Матв,ев','Медведев','Мельников','Меркушев','Миронов','Михайлов','Михеев','Мишин','Моисеев','Молчанов','Морозов','Муравьёв','Мухин','Мышкин','Мясников','Назаров','Наумов','Некрасов','Нестеров','Никитин','Никиф,ров','Николаев','Никонов','Новиков','Носков','Носов','Овчинников','Одинцов','Орехов','Орлов','Осипов','Павлов','Панов','Панфилов','Пахомов','Пестов','Петров','Петухов','Поляков','Пономарёв','Попов','Пота,ов','Прохоров','Рогов','Родионов','Рожков','Романов','Русаков','Рыбаков','Рябов','Савельев','Савин','Сазонов','Самойлов','Самсонов','Сафонов','Селезнёв','Селиверстов','Семёнов','Сергеев','Сидоров','Силин','Симонов','Ситников','Соболев','Соколов','Соловьёв','Сорокин','Степанов','Стрелков','Субботин','Суворов','Суханов','Сысоев','Тарасов','Терентьев','Тетерин','Тимофеев','Титов','Тихонов','Третьяков','Трофимов','Туров','Уваров','Устинов','Фадеев','Фёдоров','Федосеев','Федотов','Филатов','Филиппов','Фокин','Фомин','Фомичёв','Фролов','Харитонов','Хохлов','Цветков','Чернов','Шарапов','Шаров','Шашков','Шестаков','Шилов','Ширяев','Шубин','Щербаков','Щукин','Юди','Яковлев','Якушев','Смирнов']
malenameslist=['Александр','Марк','Георгий','Артемий','Дмитрий','Константин','Давид','Эмиль','Максим','Тимур','Платон','Назар','Сергей','Олег','Анатолий','Савва','Андрей','Ярослав','Григорий','Ян','Алексей','Антон','Демид','Рустам','Артём','Николай','Данила','Игнат','Илья','Глеб','Станислав','Влад','Кирилл','Данил','Василий','Альберт','Михаил','Савелий','Федор','Тамерлан','Никита','Вадим','Родион','Айдар','Матвей','Степан','Леонид','Роберт','Роман','Юрий','Одиссей','Адель','Егор','Богдан','Валерий','Марсель','Арсений','Артур','Святослав','Ильдар','Иван','Семен','Борис','Самир','Денис','Макар','Эдуард','Тихон','Евгений','Лев','Марат','Рамиль','Даниил','Виктор','Герман','Ринат','Тимофей','Елисей','Даниэль','Радмир','Владислав','Виталий','Петр','Филипп','Игорь','Вячеслав','Амир','Арсен','Владимир','Захар','Всеволод','Ростислав','Павел','Мирон','Мирослав','Святогор','Руслан','Дамир','Гордей',' Яромир']
femalenameslist=['Анастасия','Марина','Мирослава','Марьяна','Анна','Светлана','Галина','Анжелика','Мария','Варвара','Людмила','Нелли','Елена','Софья','Валентина','Влада','Дарья','Диана','Нина','Виталина','Алина','Яна','Эмилия','Майя','Ирина','Кира','Камилла','Тамара','Екатерина','Ангелина','Альбина','Мелания','Арина','Маргарита','Лилия','Лиана','Полина','Ева','Любовь','Зарина','Ольга','Алёна','Лариса','Василина','Юлия','Дарина','Эвелина','Алия','Татьяна','Карина','Инна','Владислава','Наталья','Василиса','Агата','Самира','Виктория','Олеся','Амелия','Антонина','Елизавета','Аделина','Амина','Ника','Ксения','Оксана','Эльвира','Мадина','Милана','Таисия','Ярослава','Наташа','Вероника','Надежда','Стефания','Снежана','Алиса','Евгения','Регина','Каролина','Валерия','Элина','Алла','Юлиана','Александра','Злата','Виолетта','Ариана','Ульяна','Есения','Лидия','Эльмира','Кристина','Милена','Амалия','Ясмина','София','Вера','Наталия',' Сабина']


def random_date(start, end):
    """Generate a random datetime between `start` and `end`"""
    return start + datetime.timedelta(
        # Get a random amount of seconds between `start` and `end`
        seconds=random.randint(0, int((end - start).total_seconds())),
    )

service_luggage_in_system = []
@app.route('/generate_flight', methods=['GET', 'POST']) # args: flightID, pas, lug, serlug, arriving, extended, transportID - id рейса, количество пассажиров, количество багажа, количество служебного багажа, флаг "прилетающие", если не указан - прибывшие в аэропорт чтоб улететь, расширенная инфа
def gen_flight():
    if request.method == 'GET':
        if 'flightID' not in request.args.keys():
            return '', 400

        pas = request.args.get('pas', default = 20, type = int)
        lug = request.args.get('lug', default = 0, type = int)
        serlug = request.args.get('serlug', default = random.randint(0,4) , type = int)
        arriving = request.args.get('arriving', default = 'false', type = str) in ['True', 'true', '1']
        flight = request.args.get('flightID')#, type = uuid)

        if (pas < 0 or pas > 100 or serlug < 0 or serlug > 50 or lug < 0 or pas < lug):
            return '', 400

        transportID = None
        if (arriving):
            if 'transportID' not in request.args.keys():
                return '', 400
            transportID = request.args.get('transportID')
    elif request.method == 'POST':
        telelog('/generate_flight [POST] with json:\n' + str(request.json))
        if 'flightID' not in request.json.keys():
            telelog('Error 400, no FlightID in json')
            return 'No flightID parameter', 400

        pas = int(request.json['pas']) if 'pas' in request.json else 20
        lug = int(request.json['lug']) if 'lug' in request.json else random.randint(0,pas)
        serlug = int(request.json['serlug']) if 'serlug' in request.json else random.randint(0,4)
        arriving = True if 'arriving' in request.json and request.json['arriving'] in ['True', 'true', '1', True] else False
        flight = request.json['flightID']

        if (pas < 0 or pas > 100 or serlug < 0 or serlug > 50 or lug < 0 or pas < lug):
            telelog(f'Incorrect pas/serlug/lug count\npas: {pas}\nserlug: {serlug}\nlug: {lug}')
            return '', 400

        transportID = None
        if (arriving):
            if 'transportID' not in request.json.keys():
                telelog('Arriving, but no transport ID in params')
                return '', 400
            transportID = request.json['transportID']
    else:
        return '', 405

    j = 0
    passengers = []
    all_luggage = []
    for i in range(pas):
        gender = random.choice(['male', 'female'])
        name = random.choice(malenameslist if gender=='male' else femalenameslist)
        surname = random.choice(surnameslist) if gender=='male' else (random.choice(surnameslist)+'a')
        id = uuid.uuid4()
        luggage = str(uuid.uuid4()) if j < lug else None
        if (luggage != None):
            all_luggage.append(str(luggage))
        patronymic = random.choice(malenameslist)
        if patronymic[-1] in 'йь':
            patronymic = patronymic[:-1] + ('евич' if gender=='male' else 'евна')
        elif patronymic[-1] == 'а':
            patronymic = patronymic[:-1] + ('ович' if gender=='male' else 'евна')
        else:
            patronymic = patronymic + ('ович' if gender=='male' else 'овна')
        date_from = datetime.datetime(1940,1,1) # max = 75 лет
        date_to = datetime.datetime(2000,1,1) # min = 18 лет
        birthdate = random_date(date_from, date_to)
        transport = transportID
        place = 'InAirplane' if arriving else 'WaitForBus'
        dir = 'Arriving' if arriving else 'Departing'
        new_passenger = Passenger(Id = str(id), first_name = name, last_name = surname, patronymic = patronymic, gender = gender, birthdate = birthdate, luggage = luggage, flight = str(flight), state = place, transport = transport, direction = dir)
        passengers.append(new_passenger)
        j = j + 1
        db.session.add(new_passenger)
    db.session.commit()

    service_luggage = []
    for i in range(serlug):
        newlug = uuid.uuid4()
        service_luggage.append(newlug)
        service_luggage_in_system.append(newlug)
        all_luggage.append(str(newlug))

    serialized_passengers = [p.serialize('extended' in request.args.keys()) for p in passengers]

    if (not arriving):
        data = {'flight_id': flight, 'registration': 'kek', 'baggage_ids': all_luggage}
        requests.post('http://dmitryshepelev15.pythonanywhere.com/api/baggage', json=data)


    return jsonify({'passengers_count': pas, 'luggage_count': {'passengers': lug, 'service': serlug}, 'passengers': serialized_passengers, 'service_luggage': service_luggage})


waiting_luggage = set()
@app.route('/luggage_notify', methods=['POST'])
def notify_luggage():
    telelog('/luggage_notify [POST] with json:\n' + str(request.json))
    global waiting_luggage
    global service_luggage_in_system

    if 'luggage' not in request.json:
        return '', 400

    received = [x for x in request.json['luggage']]
    waiting_luggage.update(received)

    take_luggage()

    return '', 200

def take_luggage():
    global waiting_luggage
    global service_luggage_in_system

    waiting_passengers = db.session.query(Passenger).filter(Passenger.state == 'WaitForLuggage').all()
    waiting_passengers_bags = set([x.luggage for x in waiting_passengers])

    recevied_bags = (waiting_passengers_bags | set(service_luggage_in_system)) & waiting_luggage # багаж и пассажиры, которые нашли друг друга
    passengers_recevied_bags = [x.Id for x in list(filter(lambda x: x.luggage in recevied_bags, waiting_passengers))] # пассажиры, багаж которых прибыл
    waiting_luggage = set([n for n in waiting_luggage if n not in recevied_bags]) # удаляем из waiting luggage
    service_luggage_in_system = [n for n in service_luggage_in_system if n not in recevied_bags]

    # пассажиры уходят с багажом
    left = db.session.query(Passenger).filter(Passenger.Id.in_(passengers_recevied_bags)).all()
    for x in left:
        x.state = 'Left'
    db.session.commit()

    # сообщить диману о том что багаж забрали
    if len(recevied_bags) > 0:
        requests.delete('http://dmitryshepelev15.pythonanywhere.com/api/baggage/delete', json=list(recevied_bags))


@app.route('/waiting_luggage', methods=['GET'])
def get_waiting_luggage():
    global waiting_luggage
    global service_luggage_in_system
    return jsonify({"Waiting Luggage": list(waiting_luggage), "Waiting service luggage": list(service_luggage_in_system)})

@app.route('/passengers', methods=['POST','GET','DELETE'])
def passengers_api():
    if request.method == 'GET':
        telelog('/passengers [GET] with args: {}'.format(dict(request.args)))
        try:
            if 'flight' in request.args.keys():
                fid = request.args['flight']
                res = db.session.query(Passenger).filter(Passenger.flight == fid).all()
            elif 'id' in request.args.keys():
                id = request.args['id']
                res = db.session.query(Passenger).filter(Passenger.Id == id).first()
                if (res is None):
                    return 404
            elif 'ids' in request.args.keys():
                ids = request.args['ids'].split(',')
                res = db.session.query(Passenger).filter(Passenger.Id.in_(ids)).all()
            else:
                res = db.session.query(Passenger).all()

            if 'status' in request.args.keys():
                filtered_state = request.args['status']
                res = list(filter(lambda x: x.state == filtered_state, res))
            return jsonify([p.serialize('extended' in request.args.keys()) for p in res])
        except:
            return 400 # Invalid UUIDs

    elif request.method == 'POST':
        count = request.json['count'] if 'count' in request.json else 1
        place = request.json['place'] if 'place' in request.json else 'Unknown'
        flight = request.json['flight'] if 'flight' in request.json else '00000000-0000-0000-0000-000000000000'
        if (count < 1 or count > 25):
            return 400 # To much passengers
        for i in range(count):
            gender = random.choice(['male', 'female'])
            name = random.choice(malenameslist if gender=='male' else femalenameslist)
            surname = random.choice(surnameslist) if gender=='male' else (random.choice(surnameslist)+'a')
            id = uuid.uuid4()
            luggage = uuid.uuid4()
            patronymic = random.choice(malenameslist)
            if patronymic[-1] in 'йь':
                patronymic = patronymic[:-1] + ('евич' if gender=='male' else 'евна')
            elif patronymic[-1] == 'а':
                patronymic = patronymic[:-1] + ('ович' if gender=='male' else 'евна')
            else:
                patronymic = patronymic + ('ович' if gender=='male' else 'овна')
            date_from = datetime.datetime(1940,1,1) # max = 75 лет
            date_to = datetime.datetime(2000,1,1) # min = 18 лет
            birthdate = random_date(date_from, date_to)
            transport = None
            new_passenger = Passenger(Id = str(id), first_name = name, last_name = surname, patronymic = patronymic, gender = gender, birthdate = birthdate, luggage = str(luggage), flight = str(flight), state = place, transport = transport)
            db.session.add(new_passenger)
        db.session.commit()
        return jsonify({'result': 'OK'}), 200
    elif request.method == 'DELETE':
        confirm = request.json['confirm'] if 'confirm' in request.json else False
        id = request.json['id'] if 'id' in request.json else ''
        if (id != ''):
            res = db.session.query(Passenger).filter(Passenger.Id == id).first()
            if (res is None):
                return 404
            else:
                Passenger.query.filter(Passenger.Id == id).delete()
                db.session.commit()
                return jsonify({'result': 'OK'}), 200
        elif (confirm == 1):
            Passenger.query.delete()
            db.session.commit()
            return jsonify({'result': 'OK'}), 200
        else:
            return 400

@app.route('/boarding/<transport>', methods=['POST','GET'])
def boarding(transport):
    if transport in ['bus', 'airplane']:
        if request.method == 'POST':
            transportId = request.json['transportID'].lower() if 'transportID' in request.json else None
            flightId = request.json['flightID'].lower() if 'flightID' in request.json else None
            seats = request.json['seats'] if 'seats' in request.json else -1
            ids = request.json['ids'] if 'ids' in request.json else ([request.json['id']] if 'id' in request.json else [])
            continious = True if 'continious' in request.json and request.json['continious'] in ['True', 'true', '1'] else False
        else:
            transportId = request.args['transportID'].lower() if 'transportID' in request.args.keys() else None
            flightId = request.args['flightID'].lower() if 'flightID' in request.args.keys() else None
            seats = request.args['seats'] if 'seats' in request.args.keys() else -1
            ids = request.args['ids'].split(',') if 'ids' in request.args.keys() else ([request.args['id']] if 'id' in request.args.keys() else [])
            continious = True if 'continious' in request.args and request.args['continious'] in ['True', 'true', '1'] else False
        return boardinglanding('boarding', transport, ids, transportId, seats, flightId, continious)
    return 405

@app.route('/landing/<transport>', methods=['POST','GET'])
def landing(transport):
    if transport in ['bus', 'airplane']:
        if request.method == 'POST':
            transportId = request.json['transportID'] if 'transportID' in request.json else None
            ids = request.json['ids'] if 'ids' in request.json else ([request.json['id']] if 'id' in request.json else [])
        else:
            transportId = request.args['transportID'] if 'transportID' in request.args.keys() else None
            ids = request.args['ids'].split(',') if 'ids' in request.args.keys() else ([request.args['id']] if 'id' in request.args.keys() else [])
        return boardinglanding('landing', transport, ids, transportId)
    return 405

def boardinglanding(action, transport, ids, tid = None, seats = -1, fid = None , continious = False):
    if tid is not None:
        if action == 'boarding':
            needState = 'WaitForBus' if transport == 'bus' else 'WaitForAirplane'
            ids = db.session.query(Passenger).filter(Passenger.state == needState).filter(Passenger.flight == fid).filter(Passenger.transport == None)
            if seats != -1:
                ids = ids.limit(seats)
            ids = ids.all()
            for pas in ids:
                pas.transport = tid
                pas.state = 'InBus' if transport == 'bus' else 'InAirplane'
        else:
            needState = 'InBus' if transport == 'bus' else 'InAirplane'
            ids = db.session.query(Passenger).filter(Passenger.state == needState).filter(Passenger.transport == tid).all()
            for pas in ids:
                pas.transport = None
                pas.state = 'WaitForAirplane' if transport == 'bus' else 'WaitForBus' # WaitForBus не точно. что делает пассажир после самолёта?
        db.session.commit()
    telelog('ACTION: {}\nTRANSPORT: {} {}\nIDS: {}\nSEATS COUNT: {}'.format(action, transport.upper(), tid, [x.Id for x in ids], seats))

    return jsonify({'result': 'OK', 'passengers': [x.Id for x in ids]}), 200

@app.route('/change_status', methods=['POST'])
def change_status():
    if 'newStatus' not in request.json:
        return 'New status value not found', 400
    if 'passengers' not in request.json:
        return 'Passengers list not found', 400

    old_status = request.json['oldStatus'] if 'oldStatus' in request.json else None
    transportid = request.json['transportID'] if 'transportID' in request.json else None
    new_status = request.json['newStatus']
    passengers = request.json['passengers']

    must_be_with_transport = ['InBus', 'FlewAway', 'InAirplane', 'BoardingToBusFromGate', 'BoardingFromBusToAirplane', 'LandingFromAirplaneToBus']
    if new_status in must_be_with_transport and transportid is None:
        return 'Transport ID not found', 400
    elif new_status not in must_be_with_transport and transportid is not None:
        return 'Transport ID must be null for this status', 400
    if new_status in ['WaitForLuggage', 'Left']:
        return 'Cannot set this status, use status InGate', 400

    telelog('/change_status [POST]\nnew Status: {}, transportID: {}\npassengers:\n{}'.format(new_status,str(transportid),passengers))

    passengers = db.session.query(Passenger).filter(Passenger.Id.in_(passengers))
    if old_status is not None:
        passengers = passengers.filter(Passenger.state == old_status)
    passengers = passengers.all()
    changed = 0
    for p in passengers:
        if not p.state == new_status:
            if new_status != 'InGate':
                p.state = new_status
                changed = changed + 1
                p.transport = transportid
            else:
                if p.luggage is None:
                    p.state = 'Left'
                else:
                    p.state = 'WaitForLuggage'

    if new_status == 'InGate':
        take_luggage()

    db.session.commit()

    return jsonify({'result': 'OK', 'changed': changed, 'passengers': [x.Id for x in passengers]}), 200

'''
@app.route('/flight_away/<uuid:aircraft_id>', methods=['POST'])
def aircraft_flight_away(aircraft_id):
    pas = db.session.query(Passenger).filter_by(Passenger.transport == aircraft_id and Passenger.state == 'InAirplane')
    count = pas.count()
    pas.delete()
    db.session.commit()
    return jsonify({'result': 'OK', 'deleted': count})'''


# Remove left and flewAway
db.session.query(Passenger).filter(or_(Passenger.state == 'FlewAway',Passenger.state == 'Left')).delete()
db.session.commit()