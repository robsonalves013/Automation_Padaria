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

    # Configurações de E-mail para OUTLOOK
    MAIL_SERVER = 'smtp.office365.com'  # Servidor SMTP para contas da Microsoft
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'robtechservice@outlook.com'
    MAIL_PASSWORD = 'ioohmnnkugrsulss' # A senha de aplicativo é obrigatória para maior segurança
    MAIL_SENDER = 'robtechservice@outlook.com'
    MAIL_RECEIVER = 'padariamajurak@gmail.com'
