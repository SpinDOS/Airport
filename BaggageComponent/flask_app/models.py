from BaggageComponent.flask_app import db


class Baggage(db.Model):
    class Status:
        WAIT_FOR_CAR = 'Wait_for_car'
        WAIT_FOR_PASSENGER = 'Wait_for_passenger'

    __tablename__ = 'baggage'

    id = db.Column(db.String(36), primary_key=True)
    flight_id = db.Column(db.String(36), nullable=False)
    status = db.Column(db.String(24), default=Status.WAIT_FOR_CAR)

    def serialize(self):
        return {'id': self.id, 'flight_id': self.flight_id, 'status': self.status}

    def __str__(self):
        return f'{self.id}. {self.flight_id} {self.status}'
