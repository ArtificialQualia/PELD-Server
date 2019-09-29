"""
 Main entry point into webapp.
 sets up Flask, initializes all the modules needed, and registers the routes
"""

import eventlet
eventlet.monkey_patch()

import pymongo

import config

from flask import Flask

from app.sso import sso_pages
from app.routes import main_pages
from app.flask_shared_modules import login_manager
from app.flask_shared_modules import mongo
from app.flask_shared_modules import socketio
from app.version import version

from datetime import datetime
from pkg_resources import parse_version
import logging

logging.basicConfig(format='%(asctime)s %(levelname)s: %(message)s', level=config.LOG_LEVEL)

# -----------------
# Globals for flask, also see app/flask_shared_modules.py
# -----------------

# Create main flask app
app = Flask(__name__)
app.config.from_object(config)

# Initialize database connection
mongo.init_app(app)

# Initialize LoginManager, this for used for managing user sessions
login_manager.init_app(app)

# Initialize socket.io for socket handling
socketio.init_app(app, message_queue="redis://"+config.REDIS_URL)

# create indexes in database, runs on every startup to prevent manual db setup and ensure compliance
with app.app_context():
    mongo.db.characters.create_index('id', unique=True)
    mongo.db.characters.create_index('socket_guid')
    mongo.db.entities.create_index('id', unique=True)
    mongo.db.entities.create_index('name')
    mongo.db.fleets.create_index('updated_time', expireAfterSeconds=86400)
    mongo.db.fleets.create_index('members')
    mongo.db.fleets.create_index('connected_webapps')
    mongo.db.fleets.create_index('id')
    mongo.db.characters.update({}, {'$set': {'sid': []}}, multi=True)
    # 'schema' updates for version upgrades
    doc = mongo.db.version.find_one({})
    if not doc:
        db_version = parse_version('v1.0')
    else:
        db_version = parse_version(doc['db_version'])
    #if parse_version('v1.1.0') > db_version:
    mongo.db.version.update({}, {'$set': {'db_version': version}}, upsert=True)

# Register all our blueprints (routes that come from other files)
# this could theoretically be changed to mount the routes on other endpoints
app.register_blueprint(sso_pages)
app.register_blueprint(main_pages)

# End Globals

if __name__ == '__main__':
    # Running host on 0.0.0.0 is ok, since it is run behind nginx and docker
    socketio.run(app, port=config.PORT, host="0.0.0.0")