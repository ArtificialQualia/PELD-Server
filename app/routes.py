"""
 Primary routes file
 Contains all the important routes for the application, along with some helper functions
"""

import pymongo
import bson
from bson import json_util

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

import re
import json
from collections import OrderedDict
from datetime import datetime
from datetime import timezone
import pyswagger

main_pages = Blueprint('main_pages', __name__)

@main_pages.route("/")
@login_required
def index():
    return render_template("index.html")

@socketio.on('connect')
def handle_message():
    print('Client connected')

@socketio.on('register_fleet_handler')
def handle_fleet():
    print('handlign fleet')
    check_fleet()
    fleet = get_fleet()
    emit('fleet_update', json.dumps(fleet, default=json_serial))
    
def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, pyswagger.primitives._time.Datetime):
        return obj.to_json()
    raise TypeError ("Type %s not serializable" % type(obj))
    
@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

def check_fleet():
    update_token()
    current_user.fleet_id = None
    op = esiapp.op['get_characters_character_id_fleet'](
        character_id=current_user.get_id()
    )
    fleet = esiclient.request(op)
    if fleet.status == 404:
        print('not in fleet')
    elif fleet.status != 200:
        print('error getting fleet status for ' + str(current_user.get_id()))
    current_user.fleet_id = fleet.data['fleet_id']

def get_fleet():
    fleet = {'name': 'Fleet'}
    fleet['wings'] = get_fleet_wings()
    fleet_members = get_fleet_members()
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
    op = esiapp.op['get_characters_character_id'](
        character_id=_id
    )
    request = esiclient.request(op)
    if request.status != 200:
        print('error getting character data for ' + str(_id))
        return None
    return request.data['name']

def decode_ship_id(_id):
    op = esiapp.op['get_universe_types_type_id'](
        type_id=_id
    )
    request = esiclient.request(op)
    if request.status != 200:
        print('error getting ship data for ' + str(_id))
        return None
    return request.data['name']

def decode_system_id(_id):
    op = esiapp.op['get_universe_systems_system_id'](
        system_id=_id
    )
    request = esiclient.request(op)
    if request.status != 200:
        print('error getting system data for ' + str(_id))
        return None
    return request.data['name']

def get_fleet_members():
    update_token()
    op = esiapp.op['get_fleets_fleet_id_members'](
        fleet_id=current_user.fleet_id
    )
    fleet = esiclient.request(op)
    if fleet.status == 404:
        print('no fleet boss')
        return None
    elif fleet.status != 200:
        print('error getting fleet members for ' + str(current_user.get_id()))
        return None
    return fleet.data

def get_fleet_wings():
    update_token()
    op = esiapp.op['get_fleets_fleet_id_wings'](
        fleet_id=current_user.fleet_id
    )
    fleet = esiclient.request(op)
    if fleet.status == 404:
        print('no fleet boss')
        return None
    elif fleet.status != 200:
        print('error getting fleet wings for ' + str(current_user.get_id()))
        return None
    return fleet.data

def update_token():
    sso_data = current_user.get_sso_data()
    esisecurity.update_token(sso_data)
    if sso_data['expires_in'] <= 5:
        try:
            tokens = esisecurity.refresh()
        except exceptions.SSLError:
            print('ssl error refreshing token for ' + str(current_user.get_id()))
            return False
        except APIException as e:
            print('error refreshing token for: ' + str(current_user.get_id()))
            print('error is: ' + str(e))
            return False
        current_user.update_token(tokens)
    return True
    

@main_pages.route('/faq')
def faq():
    return render_template('faq.html')

@main_pages.route('/account')
@login_required
def account():
    """ account management page, includes ESI scopes management.  Removes specified scopes when a query string is passed. """
    character_filter = {'id': current_user.character_id}
    character_data = mongo.db.entities.find_one_or_404(character_filter)
    scopes_list = character_data['scopes'].split()
    
    # if a proper query string was passed, remove the named scope from the user's DB entry
    remove_scope = request.args.get('remove_scope')
    if remove_scope is not None:
        data_to_update = {}
        for scope in scopes_list:
            if scope == remove_scope:
                scopes_list.remove(scope)
        data_to_update['scopes'] = " ".join(scopes_list)
        update = {"$set": data_to_update}
        character_data = mongo.db.entities.find_one_and_update(character_filter, update, return_document=pymongo.ReturnDocument.AFTER)
        scopes_list = character_data['scopes'].split()
    
    character_data['scopes'] = scopes_list
    return render_template('account.html', user=character_data)
            
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
