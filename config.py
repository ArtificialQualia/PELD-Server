# -*- encoding: utf-8 -*-
import datetime

# -----------------------------------------------------
# Application configurations
# ------------------------------------------------------
SECRET_KEY = 'SuperSecretRnadomString.'
PORT = 5000
HOST = 'localhost'

# -----------------------------------------------------
# MongoDB Configs
# -----------------------------------------------------
MONGO_URI = 'mongodb://localhost:27017/peld'

# -----------------------------------------------------
# ESI Configs
# -----------------------------------------------------
ESI_DATASOURCE = 'tranquility'  # Change it to 'singularity' to use the test server
ESI_SWAGGER_JSON = 'https://esi.tech.ccp.is/latest/swagger.json?datasource=%s' % ESI_DATASOURCE
ESI_SECRET_KEY = 'I8h8jLuNsP0Poq2lpP4coPVDWrgpTJ4c051QCkBA'  # your secret key
ESI_CLIENT_ID = 'b1ab603536224789b39609c46fdf3c2f'  # your client ID
ESI_CALLBACK = 'http://%s:%d/sso/callback' % (HOST, PORT)  # the callback URI you gave CCP
ESI_USER_AGENT = 'peld-server by Demogorgon Asmodeous'

# ------------------------------------------------------
# Session settings for flask login
# ------------------------------------------------------
PERMANENT_SESSION_LIFETIME = datetime.timedelta(days=30)
REMEMBER_COOKIE_REFRESH_EACH_REQUEST = True

# -----------------------------------------------------
# Redis Configs
# -----------------------------------------------------
REDIS_URL = 'localhost'
REDIS_PORT = 6379
