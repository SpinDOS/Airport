from sql import db, getApp
import uuid
import random
import datetime
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
    state = db.Column(db.Enum('Unknown', 'WaitForBus', 'InBus', 'WaitForAirplane', 'InAirplane'))

    def serialize(self, extended = False):
        if extended:
            return {'id': self.Id, 'first_name': self.first_name, 'last_name': self.last_name, 'patronymic': self.patronymic, 'gender': self.gender, 'birthdate': self.birthdate,'luggage': self.luggage,'flight': self.flight, 'state': self.state}
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

@app.route('/passengers', methods=['POST','GET','DELETE'])
def passengers_api():
    if request.method == 'GET':
        try:
            if 'id' in request.args.keys():
                id = request.args['id']
                res = db.session.query(Passenger).filter(Passenger.Id == id).first()
                if (res is None):
                    return 404
            elif 'ids' in request.args.keys():
                ids = request.args['ids'].split(',')
                res = db.session.query(Passenger).filter(Passenger.Id.in_(ids)).all()
            else:
                res = db.session.query(Passenger).all()
            return jsonify([p.serialize('extended' in request.args.keys()) for p in res])
        except:
            return 400 # Invalid UUIDs

    elif request.method == 'POST':
        count = request.json['count'] if 'count' in request.json else 1
        place = request.json['place'] if 'place' in request.json else 'Unknown'
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
            flight = uuid.uuid4() # задавать входным параметром
            new_passenger = Passenger(Id = str(id), first_name = name, last_name = surname, patronymic = patronymic, gender = gender, birthdate = birthdate, luggage = str(luggage), flight = str(flight), state = place)
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