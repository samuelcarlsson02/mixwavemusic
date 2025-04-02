import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

class DBConnector:
    def __init__(self):
        connection_params = {
            "host": os.getenv("DB_HOST"),
            "user": os.getenv("DB_USER"),
            "password": os.getenv("DB_PASSWORD"),
            "database": os.getenv("DB_NAME")
        }

        try:
            self.connection = psycopg2.connect(**connection_params)
            print("Connection to the database successful!")

        except Exception as e:
            print(f"Unable to connect to the database. Error: {e}")
            self.connection = None

    def close_connection(self):
        if self.connection is not None:
            self.connection.close()
            print("Connection closed.")