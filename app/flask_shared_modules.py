"""
 This file contains many of the objects that need to be shared between flask and background workers
 Many of them are later initiated in main.py, but some like the ESI library is used as-is
"""

from esipy import App
from esipy import EsiClient
from esipy import EsiSecurity

from flask_pymongo import PyMongo
from flask_login import LoginManager
from flask_socketio import SocketIO

import redis

import config

# define mongo global for other modules
mongo = PyMongo()

# define login_manager global for other modules
login_manager = LoginManager()
login_manager.login_view = 'login'

# Initialize ESI connection, all three below globals are needed to set up ESI connection
esiapp = App.create(config.ESI_SWAGGER_JSON)

# init the security object
esisecurity = EsiSecurity(
    app=esiapp,
    redirect_uri=config.ESI_CALLBACK,
    client_id=config.ESI_CLIENT_ID,
    secret_key=config.ESI_SECRET_KEY,
    headers={'User-Agent': config.ESI_USER_AGENT}
)

# init the client
esiclient = EsiClient(
    security=esisecurity,
    cache=None,
    headers={'User-Agent': config.ESI_USER_AGENT}
)

# direct access to redis is needed for some components, like statistics caching
r = redis.StrictRedis(host=config.REDIS_URL, port=config.REDIS_PORT, db=0)

# init socket.io
socketio = SocketIO()