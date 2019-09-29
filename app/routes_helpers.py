"""
 Helper functions for routes and background process
"""

from flask_login import current_user

from flask_socketio import disconnect

from app.flask_shared_modules import mongo
from app.flask_shared_modules import socketio
from app.flask_shared_modules import esiapp
from app.flask_shared_modules import esiclient
from app.flask_shared_modules import esisecurity

from requests import exceptions
from pymongo import ReturnDocument

import logging
import pyswagger
import functools


def authenticated_only(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped

def emit_to_char(emit_type, data, sids=None, char_id=None, namespace=None):
    if char_id:
        id_filter = {'id': char_id}
        result = mongo.db.characters.find_one(id_filter)
        if result is not None and 'sid' in result:
            sids = result['sid']
        else:
            sids = []
    for sid in sids:
        socketio.emit(emit_type, data, room=sid, namespace=namespace)

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, pyswagger.primitives._time.Datetime):
        return obj.to_json()
    raise TypeError ("Type %s not serializable" % type(obj))

def decode_fleet_member(member):
    member['character_name'] = decode_character_id(member['character_id'])
    member['ship_name'] = decode_ship_id(member['ship_type_id'])
    member['location_name'] = decode_system_id(member['solar_system_id'])
    member.pop('join_time')
    member.pop('solar_system_id')
    member.pop('squad_id')
    member.pop('takes_fleet_warp')
    member.pop('wing_id')
    return member

def id_from_name(_name):
    id_filter = {'name': _name}
    result = mongo.db.entities.find_one(id_filter)
    if result is not None:
        return result['id']
    op = esiapp.op['post_universe_ids'](
        names=[_name]
    )
    request = esiclient.request(op)
    try:
        esi_error_check_basic(request, 'ship data', str(_name))
    except EsiError:
        return 0
    if ('inventory_types' in request.data):
        add_db_entity(request.data['inventory_types'][0]['id'], _name)
        return request.data['inventory_types'][0]['id']
    else:
        add_db_entity(-1, _name)
        return -1

def decode_character_id(_id):
    id_filter = {'id': _id}
    result = mongo.db.entities.find_one(id_filter)
    if result is not None:
        return result['name']
    op = esiapp.op['get_characters_character_id'](
        character_id=_id
    )
    request = esiclient.request(op)
    esi_error_check_basic(request, 'public character data', str(_id))
    add_db_entity(_id, request.data['name'])
    return request.data['name']

def decode_ship_id(_id):
    id_filter = {'id': _id}
    result = mongo.db.entities.find_one(id_filter)
    if result is not None:
        return result['name']
    op = esiapp.op['get_universe_types_type_id'](
        type_id=_id
    )
    request = esiclient.request(op)
    esi_error_check_basic(request, 'ship data', str(_id))
    add_db_entity(_id, request.data['name'])
    return request.data['name']

def decode_system_id(_id):
    id_filter = {'id': _id}
    result = mongo.db.entities.find_one(id_filter)
    if result is not None:
        return result['name']
    op = esiapp.op['get_universe_systems_system_id'](
        system_id=_id
    )
    request = esiclient.request(op)
    esi_error_check_basic(request, 'system data', str(_id))
    add_db_entity(_id, request.data['name'])
    return request.data['name']

def esi_error_check_basic(request, _type, entity):
    if request.status != 200:
        error_string = request.data['error'] if request.data else str(request.status)
        logging.error('error getting ' + _type + ' for: ' + entity)
        logging.error('error is: %s', error_string)
        raise EsiError(error_string)

def add_db_sid(_id, sid):
    _filter = {'id': _id}
    data_to_update = {}
    data_to_update['sid'] = sid
    update = {"$addToSet": data_to_update}
    mongo.db.characters.find_one_and_update(_filter, update, upsert=True)

def remove_db_sid(_id, sid):
    _filter = {'id': _id}
    data_to_update = {}
    data_to_update['sid'] = sid
    update = {"$pull": data_to_update}
    doc = mongo.db.characters.find_one_and_update(_filter, update, return_document=ReturnDocument.AFTER)
    if len(doc['sid']) == 0:
        fleets = mongo.db.fleets.find({'connected_webapps': _id})
        if fleets is not None:
            for fleet in fleets:
                fleet['connected_webapps'].remove(_id)
                update = {'$set': {'connected_webapps': fleet['connected_webapps']}}
                mongo.db.fleets.update_one({'id': fleet['id']}, update)

def add_db_entity(_id, name):
    _filter = {'id': _id}
    data_to_update = {}
    data_to_update['id'] = _id
    data_to_update['name'] = name
    update = {"$set": data_to_update}
    mongo.db.entities.find_one_and_update(_filter, update, upsert=True)

def update_token(current_user):
    sso_data = current_user.get_sso_data()
    esisecurity.update_token(sso_data)
    if sso_data['expires_in'] <= 10:
        try:
            tokens = esisecurity.refresh()
        except exceptions.SSLError:
            logging.error('ssl error refreshing token for: %s', current_user.get_id())
            raise EsiError('ssl error refreshing token')
        except Exception as e:
            logging.error('error refreshing token for: %s', current_user.get_id())
            logging.error('error is: %s', e)
            raise EsiError(e)
        current_user.update_token(tokens)
    return True

class EsiError(Exception):
    pass

class EsiException(Exception):
    pass
