import os

class Config:
    # Cria o caminho para o arquivo do banco de dados SQLite
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DATABASE_PATH = os.path.join(BASE_DIR, 'padaria.db')
    
    # Configuração do SQLAlchemy
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Senha mestre para operações críticas
    MASTER_PASSWORD = '120724'