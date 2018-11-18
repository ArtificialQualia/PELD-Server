"""
 Flask blueprint to handle logins/logouts and related for EVE SSO
"""

from esipy.exceptions import APIException
from requests.exceptions import ConnectionError

from flask import request
from flask import session
from flask import redirect
from flask import render_template
from flask import url_for
from flask import Blueprint

from flask_login import current_user
from flask_login import login_required
from flask_login import login_user
from flask_login import logout_user

import random
import hashlib
import hmac
import logging

import config
from app.user import User
from app.flask_shared_modules import login_manager
from app.flask_shared_modules import mongo
from app.flask_shared_modules import esisecurity

sso_pages = Blueprint('sso_pages', __name__)

# -----------------------------------------------------------------------
# Login / Logout Routes
# -----------------------------------------------------------------------
def generate_token():
    """Generates a non-guessable OAuth token"""
    chars = ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    rand = random.SystemRandom()
    random_string = ''.join(rand.choice(chars) for _ in range(40))
    return hmac.new(
        config.SECRET_KEY.encode('utf-8'),
        random_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


@sso_pages.route('/sso/login')
def login():
    """ this redirects the user to the EVE SSO login """
    token = generate_token()
    session['token'] = token
    scopes = []
    for key in request.args:
        if key == 'login_type' or key == 'socket_guid' or key == 'character_name':
            session[key] = request.args[key]
        else:
            scopes.append(request.args.get(key))
    return redirect(esisecurity.get_auth_uri(
        scopes=scopes,
        state=token,
    ))

@sso_pages.route('/sso/logout')
@login_required
def logout():
    sso_data = current_user.get_sso_data()
    esisecurity.update_token(sso_data)
    esisecurity.revoke()
    logout_user()
    return redirect(url_for("main_pages.index"))


@sso_pages.route('/sso/callback')
def callback():
    """ This is where the user comes after he logged in SSO """
    # get the code from the login process
    code = request.args.get('code')
    token = request.args.get('state')

    # compare the state with the saved token for CSRF check
    sess_token = session.pop('token', None)
    if sess_token is None or token is None or token != sess_token:
        logging.debug('Expected session token: ' + str(sess_token) )
        logging.debug('Received session token: ' + str(token) )
        return render_template("error.html", error='Login EVE Online SSO failed: Session Token Mismatch')

    # now we try to get tokens
    try:
        auth_response = esisecurity.auth(code)
    except APIException as e:
        return render_template("error.html", error='Login EVE Online SSO failed: %s' % e)
    except ConnectionError as e:
        return render_template("error.html", error='Login EVE Online SSO failed: %s' % e)

    # the character information is retrieved
    cdata = esisecurity.verify()
    
    if 'character_name' in session:
        character_name = session.pop('character_name')
        if cdata['CharacterName'] != character_name:
            return render_template("error.html", error="ERROR: Your character name in PELD (" + character_name +
                                   ") does not match the character you logged in via ESI (" + cdata['CharacterName'] + 
                                   "). Please go back to PELD and try again.")

    # if the user is already authed, they are logged out
    if current_user.is_authenticated:
        logout_user()
    
    # create a user object from custom User class
    user = User(character_data=cdata, auth_response=auth_response, mongo=mongo)
    if 'socket_guid' in session:
        character_filter = {'id': cdata['CharacterID']}
        socket_guid = session.pop('socket_guid')
        data_to_update = {'socket_guid': socket_guid}
        update = {"$set": data_to_update}
        mongo.db.characters.update_one(character_filter, update)

    # register user with flask-login
    login_user(user)
    session.permanent = True

    if 'login_type' in session:
        login_type = session.pop('login_type')
        if login_type == 'member':
            return render_template("error.html", error="You have successfully logged in, you may close this window.")
        else:
            return redirect(url_for("main_pages.main_app"))
    return redirect(url_for("main_pages.main_app"))

@login_manager.user_loader
def load_user(character_id):
    """ Required user loader for Flask-Login """
    try:
        return User(character_id=character_id, mongo=mongo)
    except:
        return None


@login_manager.unauthorized_handler
def unauthorized():
    return redirect(url_for("sso_pages.login", read_fleet='esi-fleets.read_fleet.v1', write_fleet='esi-fleets.write_fleet.v1'))