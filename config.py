import os

class Config:
    # Chave secreta usada para segurança de sessões e cookies
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'sua-chave-secreta-muito-segura'
    
    # URI do banco de dados (SQLite nesse exemplo)
    SQLALCHEMY_DATABASE_URI = 'sqlite:///padaria.db'
    
    # Desativa o rastreamento de modificações do SQLAlchemy para melhorar a performance
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuração de CORS para permitir requisições do seu frontend
    CORS_HEADERS = 'Content-Type'