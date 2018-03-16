from flask import (
    jsonify,
    request
)

from BaggageComponent.flask_app import app, db
from BaggageComponent.flask_app.models import Baggage


@app.route('/api/baggage', methods=['POST'])
def add_baggage_list():
    params = request.json
    flight_id = params['flight_id']
    ids = params['baggage_ids']
    registration = params.get('registration')
    status = Baggage.Status.WAIT_FOR_CAR \
        if registration is not None \
        else Baggage.Status.WAIT_FOR_PASSENGER
    for id in ids:
        baggage = Baggage(id=id, flight_id=flight_id, status=status)
        db.session.add(baggage)
    db.session.commit()
    return jsonify({"status": "ok"})


@app.route('/api/baggage', methods=['DELETE'])
def retrieve_baggage_list():
    params = request.json
    flight_id = params['flight_id']
    count = params['count']
    baggage_list = Baggage.query.filter_by(flight_id=flight_id).limit(count).all()
    for baggage in baggage_list:
        db.session.delete(baggage)
    db.session.commit()
    return jsonify([baggage.id for baggage in baggage_list])


@app.route('/api/baggage/delete', methods=['DELETE'])
def pick_up_baggage():
    baggage_id = request.json['baggage_id']
    baggage = Baggage.query.get_or_404(baggage_id)
    db.session.delete(baggage)
    db.session.commit()
    return jsonify(baggage.serialize())


@app.route('/api/baggage/<uuid:flight_id>', methods=['GET'])
def get_baggage_list(flight_id):
    baggage_list = Baggage.query.filter_by(flight_id=str(flight_id)).all()
    if 'length' in request.args.keys():
        return jsonify({'baggage_count': len(baggage_list)})
    return jsonify([baggage.id for baggage in baggage_list])


if __name__ == '__main__':
    app.run()
