import os

class Config:
    MASTER_PASSWORD = os.environ.get('MASTER_PASSWORD', '120724')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///padaria.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configurações de e-mail para envio de relatórios
    EMAIL_HOST = 'smtp.office365.com'  # Exemplo para Outlook
    EMAIL_PORT = 587
    EMAIL_HOST_USER = 'robtechservice@outlook.com'
    EMAIL_HOST_PASSWORD = 'ioohmnnkugrsulss' # Use uma senha de aplicativo!