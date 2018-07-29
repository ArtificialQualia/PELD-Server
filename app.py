"""
 Main entry point into webapp.
 sets up Flask, initializes all the modules needed, and registers the routes
"""

import pymongo

import config

from flask import Flask

from app.sso import sso_pages
from app.routes import main_pages
from app.flask_shared_modules import login_manager
from app.flask_shared_modules import mongo
from app.flask_shared_modules import socketio

from datetime import datetime

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
socketio.init_app(app)

# create indexes in database, runs on every startup to prevent manual db setup and ensure compliance
# if this is a production server, then we must run this with @postfork so it runs after uwsgi forks
# processes so that it has access to app_context(), in development servers it can be run directly
def ensure_db_indexes():
    with app.app_context():
        mongo.db.characters.create_index('id', unique=True)
try:
    from uwsgidecorators import postfork
    @postfork
    def postfork_ensure_db_indexes():
        ensure_db_indexes()
except ImportError as e:
    ensure_db_indexes()

# Register all our blueprints (routes that come from other files)
# this could theoretically be changed to mount the routes on other endpoints
app.register_blueprint(sso_pages)
app.register_blueprint(main_pages)

# End Globals

#profiler code for testing, disabled unless we need to performance test
#from werkzeug.contrib.profiler import ProfilerMiddleware
#app.config['PROFILE'] = True
#app.wsgi_app = ProfilerMiddleware(app.wsgi_app, restrictions=[20])

if __name__ == '__main__':
    socketio.run(app, port=config.PORT, host=config.HOST)