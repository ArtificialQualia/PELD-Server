# -*- encoding: utf-8 -*-
import datetime
import logging

# -----------------------------------------------------
# Application configurations
# ------------------------------------------------------
SECRET_KEY = 'REPLACE_ME'
PORT = 5000
HOST = 'REPLACE_ME'
VERSION = 'v1.0'
LOG_LEVEL = logging.WARNING

# -----------------------------------------------------
# MongoDB Configs
# -----------------------------------------------------
MONGO_URI = 'mongodb://db:27017/peld'

# -----------------------------------------------------
# ESI Configs
# -----------------------------------------------------
ESI_SWAGGER_JSON = './app/swagger.json'
ESI_SECRET_KEY = 'REPLACE_ME'  # your secret key
ESI_CLIENT_ID = 'REPLACE_ME'  # your client ID
ESI_CALLBACK = 'https://%s/sso/callback' % HOST
ESI_USER_AGENT = 'peld-server by Demogorgon Asmodeous'

# ------------------------------------------------------
# Session settings for flask login
# ------------------------------------------------------
PERMANENT_SESSION_LIFETIME = datetime.timedelta(days=30)
REMEMBER_COOKIE_REFRESH_EACH_REQUEST = True

# -----------------------------------------------------
# Redis Configs
# -----------------------------------------------------
REDIS_URL = 'redis'
