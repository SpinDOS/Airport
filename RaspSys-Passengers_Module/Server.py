from sql import db, getApp
import uuid
import random
import datetime
import requests
from flask import request, jsonify
app = getApp()
from telelog import telelog

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
    state = db.Column(db.Enum('Unknown', 'WaitForBus', 'InBus', 'WaitForAirplane', 'InAirplane', 'WaitForLuggage', 'Left')) # InBus => InBusToAirport & InBusToAirplane; WaitForBus => WaitForBusToAirport & WaitForBusToAirplane ?
    transport = db.Column(db.String(36)) # ID транспорта, в котором находиться пассажир

    def serialize(self, extended = False):
        if extended:
            return {'id': self.Id, 'first_name': self.first_name, 'last_name': self.last_name, 'patronymic': self.patronymic, 'gender': self.gender, 'birthdate': self.birthdate,'luggage': self.luggage,'flight': self.flight, 'state': self.state, 'transport': self.transport}
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
        lug = request.args.get('lug', default = random.randint(12,17), type = int)
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
        if 'flightID' not in request.json.keys():
            return 'No flightID parameter', 400

        pas = int(request.json['pas']) if 'pas' in request.json else 20
        lug = int(request.json['lug']) if 'lug' in request.json else random.randint(12,17)
        serlug = int(request.json['serlug']) if 'serlug' in request.json else random.randint(0,4)
        arriving = True if 'arriving' in request.json and request.json['arriving'] in ['True', 'true', '1'] else False
        flight = request.json['flightID']

        if (pas < 0 or pas > 100 or serlug < 0 or serlug > 50 or lug < 0 or pas < lug):
            return '', 400

        transportID = None
        if (arriving):
            if 'transportID' not in request.json.keys():
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
        luggage = uuid.uuid4() if j < lug else None
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
        new_passenger = Passenger(Id = str(id), first_name = name, last_name = surname, patronymic = patronymic, gender = gender, birthdate = birthdate, luggage = str(luggage), flight = str(flight), state = place, transport = transport)
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
        res = requests.post('http://dmitryshepelev15.pythonanywhere.com/api/baggage', json=data)


    return jsonify({'passengers_count': pas, 'luggage_count': {'passengers': lug, 'service': serlug}, 'passengers': serialized_passengers, 'service_luggage': service_luggage})


waiting_luggage = set([])
@app.route('/luggage_notify', methods=['POST'])
def notify_luggage():
    global waiting_luggage
    global service_luggage_in_system

    if 'luggage' not in request.json:
        return '', 400

    received = [x for x in request.json['luggage']]
    waiting_luggage.append(received)
    waiting_passengers = db.session.query(Passenger).filter(Passenger.state == 'WaitForLuggage').all()
    waiting_passengers_bags = set([x.luggage for x in waiting_passengers])

    recevied_bags = (waiting_passengers_bags | set(service_luggage_in_system)) & waiting_luggage # багаж и пассажиры, которые нашли друг друга
    passengers_recevied_bags = list(filter(lambda x: x.luggage in recevied_bags, waiting_passengers)) # пассажиры, багаж которых прибыл
    waiting_luggage = [n for n in waiting_luggage if n not in recevied_bags] # удаляем из waiting luggage
    service_luggage_in_system = [n for n in service_luggage_in_system if n not in recevied_bags]

    # удалить пассажиров, которые с багажом
    db.session.query(Passenger).filter_by(Passenger.in_(passengers_recevied_bags)).delete()
    db.session.commit()
    # сообщить диману о том что багаж забрали
    requests.delete('http://dmitryshepelev15.pythonanywhere.com/api/baggage/delete', json=recevied_bags)
    return '', 200

@app.route('/passengers', methods=['POST','GET','DELETE'])
def passengers_api():
    if request.method == 'GET':
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