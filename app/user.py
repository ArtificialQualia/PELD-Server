"""
 Class representing a user, most user information comes from EVE SSO's verify()
"""
from pymongo import ReturnDocument

from flask_login.mixins import UserMixin

from datetime import datetime
from datetime import timedelta

datetime_format = "%Y-%m-%dT%X"

class User(UserMixin):
    def __init__(self, character_id=None, character_data=None, auth_response=None, mongo=None):
        super().__init__()
        self.mongo = mongo
        if character_id is not None:
            character_filter = {'id': character_id}
            user_data = mongo.db.characters.find_one(character_filter)
            if user_data is None:
                raise Exception()
        else:
            data_to_update = {}
            data_to_update['id'] = character_data['CharacterID']
            data_to_update['name'] = character_data['CharacterName']
            character_filter = {'id': character_data['CharacterID']}
            auth_response['access_token_expires'] = datetime.strptime(character_data['ExpiresOn'], datetime_format)
            auth_response.pop('expires_in')
            data_to_update['tokens'] = auth_response
            if 'Scopes' not in character_data:
                data_to_update['scopes'] = ''
            else:
                data_to_update['scopes'] = character_data['Scopes'].strip().split(' ')
            update = {"$set": data_to_update}
            user_data = mongo.db.characters.find_one_and_update(character_filter, update, return_document=ReturnDocument.AFTER, upsert=True)
        self.character_id = user_data['id']
        self.character_name = user_data['name']
        self.scopes = user_data['scopes']
        self.access_token = user_data['tokens']['access_token']
        self.refresh_token = user_data['tokens']['refresh_token']
        self.access_token_expires = user_data['tokens']['access_token_expires']
        self.fleet_id = user_data.get('fleet_id', None)
        
        
    def get_id(self):
        return self.character_id
    
    def get_sso_data(self):
        """ Little "helper" function to get formated data for esipy security
        """
        return {
            'access_token': self.access_token,
            'refresh_token': self.refresh_token,
            'expires_in': (
                self.access_token_expires - datetime.utcnow()
            ).total_seconds()
        }
        
    def set_fleet_id(self, _id):
        character_filter = {'id': self.character_id}
        update = {
            '$set': {
                'fleet_id': _id
            }
        }
        self.mongo.db.characters.find_one_and_update(character_filter, update)
        self.fleet_id = _id

    def update_token(self, token_response):
        """ helper function to update token data from SSO response """
        self.access_token = token_response['access_token']
        self.access_token_expires = datetime.utcnow() + timedelta(seconds=token_response['expires_in'])
        self.refresh_token = token_response['refresh_token']
        character_filter = {'id': self.character_id}
        update = {
            '$set': {
                'tokens': {
                    'access_token': self.access_token,
                    'refresh_token': self.refresh_token,
                    'access_token_expires': self.access_token_expires
                }
            }
        }
        self.mongo.db.characters.find_one_and_update(character_filter, update)
