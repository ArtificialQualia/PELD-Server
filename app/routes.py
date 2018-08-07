"""
 Primary routes file
 Contains all the important routes for the application, along with some helper functions
"""

import pymongo

from flask import render_template
from flask import url_for
from flask import abort
from flask import request
from flask import jsonify
from flask import Blueprint

from flask_login import current_user
from flask_login import login_required

from flask_socketio import emit

import config
from app.flask_shared_modules import mongo
#from app.flask_shared_modules import r
from app.flask_shared_modules import socketio
from app.flask_shared_modules import esiapp
from app.flask_shared_modules import esiclient
from app.flask_shared_modules import esisecurity

from requests import exceptions
from esipy.exceptions import APIException

import json
import copy
import logging
import pyswagger

main_pages = Blueprint('main_pages', __name__)

logging.basicConfig(format='%(asctime)s %(levelname)s: %(message)s', level=logging.DEBUG)

def background_fleet(user, sid):
    while True:
        id_filter = {'id': user.character_id}
        result = mongo.db.characters.find_one(id_filter)
        if not result or result['sid'] != sid:
            logging.error('sid changed, exiting background update for: ' + str(sid))
            return
        try:
            fleet = get_fleet(user)
            socketio.emit('fleet_update', json.dumps(fleet, default=json_serial), room=sid)
        except EsiError as e:
            socketio.emit('error', str(e), room=sid)
        except EsiException as e:
            socketio.emit('exception', str(e), room=sid)
            return
        socketio.sleep(5)

@main_pages.route("/")
@login_required
def index():
    return render_template("index.html")

@socketio.on('connect')
def handle_message():
    logging.debug('client connected')

@socketio.on('kick')
def handle_kick(_id):
    update_token(current_user)
    op = esiapp.op['delete_fleets_fleet_id_members_member_id'](
        member_id=_id,
        fleet_id=current_user.fleet_id
    )
    request = esiclient.request(op)
    if request.status != 204:
        logging.error('error performing kick for ' + str(_id))
        logging.error('error is: ' + request.data['error'])
        emit('error', request.data['error'])
    emit('info', 'member kicked')

@socketio.on('move')
def handle_move(info):
    if info['role'] == 'squad_commander':
        emit('error', "Due to a CCP bug, squad commanders can't be set via ESI.  See: https://github.com/esi/esi-issues/issues/690")
        return
    movement = {'role': info['role']}
    if info['squad'] > 0:
        movement['squad_id'] = info['squad']
    if info['wing'] > 0:
        movement['wing_id'] = info['wing']
    print(movement)
    update_token(current_user)
    op = esiapp.op['put_fleets_fleet_id_members_member_id'](
        member_id=info['id'],
        fleet_id=current_user.fleet_id,
        movement=movement
    )
    request = esiclient.request(op)
    if request.status != 204:
        logging.error('error performing move for ' + str(info['id']))
        logging.error('error is: ' + request.data['error'])
        emit('error', request.data['error'])
        return
    emit('info', info['name']+' moved to '+info['role'])
    
@socketio.on('register_fleet_handler')
def handle_fleet():
    try:
        check_fleet()
    except EsiError as e:
        emit('exception', str(e))
        return
    except EsiException as e:
        emit('exception', str(e))
        return
    user = copy.copy(current_user)
    sid = request.sid
    add_db_sid(current_user.character_id, sid)
    socketio.start_background_task(target=lambda: background_fleet(user, sid))
    
def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, pyswagger.primitives._time.Datetime):
        return obj.to_json()
    raise TypeError ("Type %s not serializable" % type(obj))
    
@socketio.on('disconnect')
def test_disconnect():
    logging.debug('Client disconnected')

def check_fleet():
    update_token(current_user)
    current_user.fleet_id = None
    op = esiapp.op['get_characters_character_id_fleet'](
        character_id=current_user.get_id()
    )
    fleet = esiclient.request(op)
    if fleet.status != 200:
        logging.error('error getting fleet for: ' + str(current_user.get_id()))
        logging.error('error is: ' + fleet.data['error'])
        raise EsiException(fleet.data['error'])
    current_user.set_fleet_id(fleet.data['fleet_id'])

def get_fleet(current_user):
    fleet = {'name': 'Fleet'}
    fleet['wings'] = get_fleet_wings(current_user)
    fleet['wings'] = sorted(fleet['wings'], key=lambda e:e['id'])
    fleet_members = get_fleet_members(current_user)
    for member in fleet_members:
        decoded_member = decode_fleet_member(member.copy())
        if member['squad_id'] == -1 and member['wing_id'] == -1:
            fleet['fleet_commander'] = decoded_member
        for wing in fleet['wings']:
            if member['wing_id'] == wing['id']:
                if member['squad_id'] == -1:
                    wing['wing_commander'] = decoded_member
                for squad in wing['squads']:
                    if member['squad_id'] == squad['id']:
                        if member['role_name'].startswith('Squad Commander'):
                            squad['squad_commander'] = decoded_member
                        else:
                            if 'members' not in squad:
                                squad['members'] = []
                            squad['members'].append(decoded_member)
    return fleet

def get_fleet_members(current_user):
    update_token(current_user)
    op = esiapp.op['get_fleets_fleet_id_members'](
        fleet_id=current_user.fleet_id
    )
    fleet = esiclient.request(op)
    if fleet.status >= 400 and fleet.status < 500:
        logging.error('error getting fleet members for: ' + str(current_user.get_id()))
        logging.error('error is: ' + fleet.data['error'])
        if fleet.status == 404:
            raise EsiException(fleet.data['error'] + ' (you must have the fleet boss role to use this tool, blame CCP)')
        else:
            raise EsiException(fleet.data['error'])
    elif fleet.status >= 500:
        logging.error('error getting fleet members for: ' + str(current_user.get_id()))
        logging.error('error is: ' + fleet.data['error'])
        raise EsiError(fleet.data['error'])
    return fleet.data

def get_fleet_wings(current_user):
    update_token(current_user)
    op = esiapp.op['get_fleets_fleet_id_wings'](
        fleet_id=current_user.fleet_id
    )
    fleet = esiclient.request(op)
    if fleet.status >= 400 and fleet.status < 500:
        logging.error('error getting fleet wings for: ' + str(current_user.get_id()))
        logging.error('error is: ' + fleet.data['error'])
        if fleet.status == 404:
            raise EsiException(fleet.data['error'] + ' (you must have the fleet boss role to use this tool, blame CCP)')
        else:
            raise EsiException(fleet.data['error'])
    elif fleet.status >= 500:
        logging.error('error getting fleet wings for: ' + str(current_user.get_id()))
        logging.error('error is: ' + fleet.data['error'])
        raise EsiError(fleet.data['error'])
    fleet.data.sort(key=lambda x: x['id'])
    for wing in fleet.data:
        wing['squads'].sort(key=lambda x: x['id'])
    return fleet.data

def decode_fleet_member(member):
    member['character_name'] = decode_character_id(member['character_id'])
    member['ship_name'] = decode_ship_id(member['ship_type_id'])
    member['location_name'] = decode_system_id(member['solar_system_id'])
    member.pop('join_time')
    member.pop('role')
    member.pop('solar_system_id')
    member.pop('squad_id')
    member.pop('takes_fleet_warp')
    member.pop('wing_id')
    return member

def decode_character_id(_id):
    id_filter = {'id': _id}
    result = mongo.db.entities.find_one(id_filter)
    if result is not None:
        return result['name']
    op = esiapp.op['get_characters_character_id'](
        character_id=_id
    )
    request = esiclient.request(op)
    if request.status != 200:
        logging.error('error getting public character data for: ' + str(_id))
        logging.error('error is: ' + request.data['error'])
        raise EsiError(request.data['error'])
    add_db_entity(_id, request.data['name'])
    return request.data['name']

def add_db_sid(_id, sid):
    _filter = {'id': _id}
    data_to_update = {}
    data_to_update['sid'] = sid
    update = {"$set": data_to_update}
    mongo.db.characters.find_one_and_update(_filter, update, upsert=True)

def add_db_entity(_id, name):
    _filter = {'id': _id}
    data_to_update = {}
    data_to_update['id'] = _id
    data_to_update['name'] = name
    update = {"$set": data_to_update}
    mongo.db.entities.find_one_and_update(_filter, update, upsert=True)

def decode_ship_id(_id):
    id_filter = {'id': _id}
    result = mongo.db.entities.find_one(id_filter)
    if result is not None:
        return result['name']
    op = esiapp.op['get_universe_types_type_id'](
        type_id=_id
    )
    request = esiclient.request(op)
    if request.status != 200:
        logging.error('error getting ship data for: ' + str(_id))
        logging.error('error is: ' + request.data['error'])
        raise EsiError(request.data['error'])
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
    if request.status != 200:
        logging.error('error getting system data for: ' + str(_id))
        logging.error('error is: ' + request.data['error'])
        raise EsiError(request.data['error'])
    add_db_entity(_id, request.data['name'])
    return request.data['name']

def update_token(current_user):
    sso_data = current_user.get_sso_data()
    esisecurity.update_token(sso_data)
    if sso_data['expires_in'] <= 5000:
        try:
            tokens = esisecurity.refresh()
        except exceptions.SSLError:
            logging.error('ssl error refreshing token for: ' + str(current_user.get_id()))
            raise EsiError('ssl error refreshing token')
        except Exception as e:
            logging.error('error refreshing token for: ' + str(current_user.get_id()))
            logging.error('error is: ' + str(e))
            raise EsiException(e)
        current_user.update_token(tokens)
    return True
    

@main_pages.route('/faq')
def faq():
    return render_template('faq.html')
            
def make_img_url(entry_type, entry_id):
    """ helper to create image urls that come from the EVE images server """
    if entry_type == 'character':
        return 'https://image.eveonline.com/Character/' + str(entry_id) + '_32.jpg'
    elif entry_type == 'ship':
        return 'https://image.eveonline.com/Render/' + str(entry_id) + '_32.png'
    elif entry_type == 'item':
        return 'https://image.eveonline.com/Type/' + str(entry_id) + '_32.png'
    elif entry_type == 'station':
        return 'https://image.eveonline.com/Render/' + str(entry_id) + '_32.png'
    elif entry_type == 'alliance' or entry_type == 'corporation':
        return 'https://image.eveonline.com/' + entry_type + '/' + str(entry_id) + '_32.png'
    else:
        return ''

def redis_bytes_to_data(redis_object):
    """ helper function to turn the raw bytes returned from redis into their proper values """
    decoded_object = {}
    for key, value in redis_object.items():
        if key.decode('utf-8') == 'wallet' or key.decode('utf-8') == 'amount':
            decoded_object[key.decode('utf-8')] = float(value.decode('utf-8'))
        elif key.decode('utf-8').endswith('id'):
            decoded_object[key.decode('utf-8')] = int(value.decode('utf-8'))
        else:
            decoded_object[key.decode('utf-8')] = value.decode('utf-8')
    return decoded_object

class EsiError(Exception):
    pass

class EsiException(Exception):
    pass
