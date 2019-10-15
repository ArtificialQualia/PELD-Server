"""
 Primary routes file
 Contains all the important routes for the application, along with some helper functions
"""

from flask import render_template
from flask import request
from flask import Blueprint
from flask import session

from flask_login import current_user
from flask_login import login_required

from flask_socketio import emit

from app.user import User
from app.flask_shared_modules import mongo
from app.flask_shared_modules import socketio
from app.flask_shared_modules import esiapp
from app.flask_shared_modules import esiclient
from app.routes_helpers import (add_db_sid, authenticated_only, update_token, EsiException,
                                id_from_name, EsiError, remove_db_sid, emit_to_char )
from app.background_fleet import (background_fleet, update_fleet_metadata)
from app.version import version

import json
import copy
import logging

main_pages = Blueprint('main_pages', __name__)

@main_pages.route("/app")
@login_required
def main_app():
    return render_template("app.html")

@main_pages.route("/")
def index():
    return render_template("index.html", version=version)
    
@main_pages.route('/faq')
def faq():
    return render_template('faq.html')
    
@main_pages.route('/help')
def help():
    return render_template('help.html')

@socketio.on('connect')
def handle_connect():
    logging.debug('client connected')

@socketio.on('connect', namespace='/client')
def handle_client_connect():
    logging.debug('client in /client connected')
    
@socketio.on('disconnect')
def handle_disconnect():
    logging.debug('Client disconnected, removing sid from db')
    if current_user.is_authenticated:
        remove_db_sid(current_user.character_id, request.sid)
    
@socketio.on('disconnect', namespace='/client')
def handle_client_disconnect():
    try:
        _id = session['user'].character_id
        _filter = {'id': _id}
    except KeyError:
        socket_guid = request.cookies.get('socket_guid', 0)
        _filter = {'socket_guid': socket_guid}
    doc = mongo.db.characters.find_one(_filter)
    if doc != None and doc['client_sid'] == request.sid:
        remove_client_from_fleets(doc['id'])

@socketio.on('kick')
@authenticated_only
def handle_kick(_id):
    update_token(current_user)
    op = esiapp.op['delete_fleets_fleet_id_members_member_id'](
        member_id=_id,
        fleet_id=current_user.get_fleet_id()
    )
    request = esiclient.request(op)
    if request.status != 204:
        error_string = request.data['error'] if request.data else str(request.status)
        logging.error('error performing kick for %s', _id)
        logging.error('error is: %s', error_string)
        emit('error', error_string)
        return
    emit('info', 'member kicked')

@socketio.on('move')
@authenticated_only
def handle_move(info):
    movement = {'role': info['role']}
    if info['squad'] > 0:
        movement['squad_id'] = info['squad']
    if info['wing'] > 0:
        movement['wing_id'] = info['wing']
    update_token(current_user)
    op = esiapp.op['put_fleets_fleet_id_members_member_id'](
        member_id=info['id'],
        fleet_id=current_user.get_fleet_id(),
        movement=movement
    )
    request = esiclient.request(op)
    if request.status != 204:
        error_string = request.data['error'] if request.data else str(request.status)
        logging.error('error performing move for %s', info['id'])
        logging.error('error is: %s', error_string)
        emit('error', error_string)
        return
    emit('info', info['name']+' moved to '+info['role'])

@socketio.on('register_client', namespace='/client')
def register_client(info={}):
    socket_guid = info.get('socket_guid', request.cookies.get('socket_guid', 0))
    name = info.get('name', request.cookies.get('name', None))
    _filter = {'socket_guid': socket_guid}
    doc = mongo.db.characters.find_one(_filter)
    if doc != None and doc['name'] == name:
        _filter = {'id': doc['id']}
        data_to_update = {}
        data_to_update['version'] = info.get('version', 'v2.4.0')
        data_to_update['client_sid'] = request.sid
        update = {"$set": data_to_update}
        mongo.db.characters.update_one(_filter, update)
        session['user'] = User(character_id=doc['id'], mongo=mongo)
        emit('client_registered')
    
@socketio.on('peld_data', namespace='/client')
def handle_peld_data(entry):
    if 'owner' not in entry['entry']:
        entry['entry']['owner'] = request.cookies['name']
    if entry['entry']['shipType'] != entry['entry']['pilotName']:
        entry['entry']['shipType'] = entry['entry']['shipType'].strip('*')
        entry['entry']['shipTypeId'] = id_from_name(entry['entry']['shipType'])
    else:
        entry['entry'].pop('shipType')
    fleet = process_incoming_peld(socket_guid=entry.get('socket_guid', None), name=entry['entry']['owner'])
    if 'socket_guid' in entry:
        entry.pop('socket_guid')
    if fleet:
        emit_peld_data(json.dumps(entry), fleet)

def emit_peld_data(entry, fleet):
    for char_id in fleet['connected_webapps']:
        char_doc = mongo.db.characters.find_one({'id': char_id})
        if char_id == fleet['fc_id'] or fleet['fleet_access'][char_doc['fleet_role']]:
            emit_to_char('peld_data', entry, sids=char_doc['sid'])
    if fleet['client_access']:
        for char_id in fleet['connected_clients']:
            char_doc = mongo.db.characters.find_one({'id': char_id})
            if char_doc and 'sid' in char_doc:
                socketio.emit('peld_data', entry, room=char_doc['client_sid'], namespace='/client')
    
@socketio.on('peld_check', namespace='/client')
def handle_peld_check(data={}):
    fleet = process_incoming_peld(update_metadata=True, **data)
    if fleet:
        data = {
            'connected': len(fleet['connected_clients']),
            'total': len(fleet['members']),
            'client_access': fleet['client_access'],
            'fc_connected': fleet['fc_id'] in fleet['connected_webapps']
        }
        emit('peld_check', json.dumps(data))
            
def process_incoming_peld(update_metadata=False, socket_guid=None, name=None):
    if not socket_guid:
        socket_guid = request.cookies.get('socket_guid', 0)
        name = request.cookies.get('name', None)
    try:
        _id = session['user'].character_id
    except KeyError:
        _filter = {'socket_guid': socket_guid}
        doc = mongo.db.characters.find_one(_filter)
        if doc != None and doc['name'] == name:
            _id = doc['id']
            session['user'] = User(character_id=doc['id'], mongo=mongo)
        else:
            return None
    if update_metadata:
        try:
            return update_fleet_metadata(session['user'], client=True)
        except (EsiError, EsiException) as e:
            if str(e) == 'Character is not in a fleet':
                emit('peld_error', 'Character is not in a fleet')
                remove_client_from_fleets(_id)
            return None
    return mongo.db.fleets.find_one({'connected_clients': _id})

def remove_client_from_fleets(char_id):
    fleets = mongo.db.fleets.find({'connected_clients': char_id})
    if fleets is not None:
        for fleet in fleets:
            fleet['connected_clients'].remove(char_id)
            update = {'$set': {'connected_clients': fleet['connected_clients']}}
            mongo.db.fleets.update_one({'id': fleet['id']}, update)

@socketio.on('register_fleet_handler')
@authenticated_only
def handle_fleet():
    current_user.sid = request.sid
    current_user.set_fleet_id(0)
    add_db_sid(current_user.character_id, request.sid)

    try:
        fleet_doc = update_fleet_metadata(current_user)
    except (EsiError, EsiException) as e:
        emit('exception', str(e))
        return

    if fleet_doc['fc_id'] == current_user.character_id:
        fleet_settings = {
            'fleet_access': fleet_doc['fleet_access'],
            'boss': fleet_doc['fc_id'],
            'client_access': fleet_doc['client_access']
        }
        fleet_settings_serial = json.dumps(fleet_settings)
        emit('fleet_settings', fleet_settings_serial)
    
    user = copy.copy(current_user)
    sid = request.sid
    socketio.start_background_task(target=lambda: background_fleet(user, sid))

@socketio.on('fleet_settings')
@authenticated_only
def handle_fleet_settings(fleet_settings):
    fleet_settings = json.loads(fleet_settings)
    _filter = {'id': current_user.get_fleet_id()}
    fleet_doc = mongo.db.fleets.find_one(_filter)

    if fleet_doc['fc_id'] != current_user.character_id:
        emit('error', 'Only Fleet Boss may change fleet settings')
        return

    data_to_update = {
        'fleet_access': fleet_settings['fleet_access'],
        'client_access': fleet_settings['client_access']
    }
    update = {'$set': data_to_update,
              '$currentDate': {'updated_time': {'$type': 'date'} }
             }
    mongo.db.fleets.update_one(_filter, update)
