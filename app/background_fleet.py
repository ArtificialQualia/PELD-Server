"""
 Background processing for connected web apps
"""

from app.flask_shared_modules import mongo
from app.flask_shared_modules import socketio
from app.flask_shared_modules import esiapp
from app.flask_shared_modules import esiclient

from app.routes_helpers import (update_token, EsiException, emit_to_char, decode_fleet_member,
                                EsiError, esi_error_check_basic, remove_db_sid, json_serial)

from pymongo import ReturnDocument

import json
import logging


def background_fleet(user, sid):
    while True:
        try:
            fleet_doc = update_fleet_metadata(user)
        except (EsiError, EsiException) as e:
            emit_to_char('error', str(e), char_id=user.character_id)
            fleet_doc = mongo.db.fleets.find_one({'id': user.fleet_id})

        id_filter = {'id': user.character_id}
        result = mongo.db.characters.find_one(id_filter)
        if sid not in result['sid']:
            remove_db_sid(user.character_id, sid)
            logging.error('sid changed, exiting background update for: %s', sid)
            return

        if fleet_doc['fc_id'] != user.character_id:
            if fleet_doc['fc_id'] not in fleet_doc['connected_webapps']:
                emit_to_char('error', 'Fleet Boss is not connected to PELD-Fleet. Please have the Fleet Boss connect to PELD-Fleet', char_id=user.character_id)
            socketio.sleep(5)
            continue

        try:
            fleet = get_fleet(user, fleet_doc)
        except EsiError as e:
            emit_to_char('error', str(e), sids=result['sid'])
            socketio.sleep(5)
            continue
        except EsiException as e:
            if str(e) == 'not fleet boss':
                if fleet_doc.get('fc_id', 0) == user.character_id:
                    emit_to_char('error', 'You are no longer Fleet Boss. Please have the new Fleet Boss connect to PELD-Fleet', sids=result['sid'])
                    socketio.sleep(5)
                    continue
            else:
                emit_to_char('exception', str(e), sids=result['sid'])
            return
        
        fleet_serial = json.dumps(fleet, default=json_serial)

        # send update to fleet boss
        emit_to_char('fleet_update', fleet_serial, sids=result['sid'])
        if user.character_id in fleet_doc['connected_webapps']:
            fleet_doc['connected_webapps'].remove(user.character_id)

        # send update to fleet members who have been granted access
        if fleet_doc['fleet_access']['fleet_commander']:
            char_id = fleet.get('fleet_commander', {}).get('character_id', 0)
            if char_id in fleet_doc['connected_webapps']:
                emit_to_char('fleet_update', fleet_serial, char_id=char_id)
                fleet_doc['connected_webapps'].remove(char_id)
        for wing in fleet['wings']:
            if fleet_doc['fleet_access']['wing_commander']:
                char_id = wing.get('wing_commander', {}).get('character_id', 0)
                if char_id in fleet_doc['connected_webapps']:
                    emit_to_char('fleet_update', fleet_serial, char_id=char_id)
                    fleet_doc['connected_webapps'].remove(char_id)
            for squad in wing['squads']:
                if fleet_doc['fleet_access']['squad_commander']:
                    char_id = squad.get('squad_commander', {}).get('character_id', 0)
                    if char_id in fleet_doc['connected_webapps']:
                        emit_to_char('fleet_update', fleet_serial, char_id=char_id)
                        fleet_doc['connected_webapps'].remove(char_id)
                if fleet_doc['fleet_access']['squad_member'] and 'members' in squad:
                    for member in squad['members']:
                        char_id = member.get('character_id', 0)
                        if char_id in fleet_doc['connected_webapps']:
                            emit_to_char('fleet_update', fleet_serial, char_id=char_id)
                            fleet_doc['connected_webapps'].remove(char_id)
        for char_id in fleet_doc['connected_webapps']:
            emit_to_char('error', 'Your Fleet Boss has not granted you access to PELD-Fleet. '+
                        'You will not get data until you are granted access', char_id=char_id)
        socketio.sleep(5)
    
def update_fleet_metadata(current_user):
    data_to_update = {}
    update_token(current_user)

    op = esiapp.op['get_characters_character_id_fleet'](
        character_id=current_user.get_id()
    )
    fleet = esiclient.request(op)
    esi_error_check_basic(fleet, 'fleet', str(current_user.get_id()))

    data_to_update['id'] = fleet.data['fleet_id']
    data_to_update['fc_id'] = fleet.data['fleet_boss_id']
    current_user.set_fleet_id(fleet.data['fleet_id'])
    current_user.set_fleet_role(fleet.data['role'])

    # remove from old fleets
    docs = mongo.db.fleets.find({'connected_webapps': current_user.character_id})
    if docs is not None:
        for fleet in docs:
            if fleet['id'] != current_user.fleet_id and current_user.character_id in fleet['connected_webapps']:
                fleet['connected_webapps'].remove(current_user.character_id)
                update = {'$set': {'connected_webapps': fleet['connected_webapps']}}
                mongo.db.fleets.update_one({'id': fleet['id']}, update)
    
    _filter = {'id': current_user.fleet_id}
    doc = mongo.db.fleets.find_one(_filter)
    if doc is not None:
        if current_user.character_id not in doc['connected_webapps']:
            doc['connected_webapps'].append(current_user.character_id)
            data_to_update['connected_webapps'] = doc['connected_webapps']
    else:
        data_to_update['connected_webapps'] = [current_user.character_id]
        data_to_update['connected_clients'] = []
        data_to_update['fleet_access'] = {
            'fleet_commander': False,
            'wing_commander': False,
            'squad_commander': False,
            'squad_member': False
        }
    
    update = {'$set': data_to_update,
              '$currentDate': {'updated_time': {'$type': 'date'} }
             }
    return mongo.db.fleets.find_one_and_update(_filter, update, upsert=True, return_document=ReturnDocument.AFTER)

def get_fleet(current_user, fleet_doc):
    fleet = {'name': 'Fleet'}
    fleet['wings'] = get_fleet_wings(current_user)
    fleet_members, connected_clients = get_fleet_members(current_user, fleet_doc)
    for member in fleet_members:
        decoded_member = decode_fleet_member(member.copy())
        decoded_member['peld_connected'] = decoded_member['character_id'] in connected_clients
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
    fleet['wings'] = sorted(fleet['wings'], key=lambda e:e['id'])
    for wing in fleet['wings']:
        wing['squads'] = sorted(wing['squads'], key=lambda e:e['id'])
    fleet['metadata'] = {'boss': fleet_doc['fc_id'], 'fleet_access': fleet_doc['fleet_access']}
    return fleet

def get_fleet_members(current_user, fleet_doc):
    update_token(current_user)
    op = esiapp.op['get_fleets_fleet_id_members'](
        fleet_id=current_user.fleet_id
    )
    fleet = esiclient.request(op)
    if fleet.status >= 400 and fleet.status < 500:
        error_string = fleet.data['error'] if fleet.data else str(fleet.status)
        logging.error('error getting fleet members for: %s', current_user.get_id())
        logging.error('error is: %s', error_string)
        if fleet.status == 404:
            if error_string == "Not found":
                raise EsiError(error_string)
            raise EsiException('not fleet boss')
        else:
            raise EsiError(error_string)
    elif fleet.status >= 500:
        error_string = fleet.data['error'] if fleet.data else str(fleet.status)
        logging.error('error getting fleet members for: %s', current_user.get_id())
        logging.error('error is: %s', error_string)
        raise EsiError(error_string)
    new_members = [member['character_id'] for member in fleet.data]

    data_to_update = {}
    # audit conncted sockets to ensure they are still in fleet
    for member in fleet_doc.get('connected_clients', []):
        if member not in new_members:
            fleet_doc['connected_clients'].remove(member)
    data_to_update['connected_clients'] = fleet_doc.get('connected_clients', [])
    for member in fleet_doc.get('connected_webapps', []):
        if member not in new_members:
            fleet_doc['connected_webapps'].remove(member)
            emit_to_char('error', 'You are no longer in the fleet', char_id=member)
    data_to_update['connected_webapps'] = fleet_doc.get('connected_webapps', [])
    
    data_to_update['id'] = current_user.fleet_id
    data_to_update['fc_id'] = current_user.character_id
    data_to_update['members'] = new_members
    update = {'$set': data_to_update, 
              '$currentDate': {'updated_time': {'$type': 'date'} }
              }
    _filter = {'id': current_user.fleet_id}
    mongo.db.fleets.update_one(_filter, update, upsert=True)
    return fleet.data, data_to_update['connected_clients']

def get_fleet_wings(current_user):
    update_token(current_user)
    op = esiapp.op['get_fleets_fleet_id_wings'](
        fleet_id=current_user.fleet_id
    )
    fleet = esiclient.request(op)
    if fleet.status >= 400 and fleet.status < 500:
        error_string = fleet.data['error'] if fleet.data else str(fleet.status)
        logging.error('error getting fleet wings for: %s', current_user.get_id())
        logging.error('error is: %s', error_string)
        if fleet.status == 404:
            if error_string == "Not found":
                raise EsiError(error_string)
            raise EsiException('not fleet boss')
        else:
            raise EsiError(error_string)
    elif fleet.status >= 500:
        error_string = fleet.data['error'] if fleet.data else str(fleet.status)
        logging.error('error getting fleet wings for: %s', current_user.get_id())
        logging.error('error is: %s', error_string)
        raise EsiError(error_string)
    fleet.data.sort(key=lambda x: x['id'])
    for wing in fleet.data:
        wing['squads'].sort(key=lambda x: x['id'])
    return fleet.data

