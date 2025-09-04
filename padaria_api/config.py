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

    # Configurações de E-mail
    MAIL_SERVER = 'smtp.gmail.com'  # Exemplo para o Gmail
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'seu_email@gmail.com'
    MAIL_PASSWORD = 'sua_senha_de_app' # Use uma senha de aplicativo se for Gmail ou outro provedor
    MAIL_SENDER = 'seu_email@gmail.com'
    MAIL_RECEIVER = 'email_do_destinatario@exemplo.com'