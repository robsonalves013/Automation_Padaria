# Novo app.py
import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from models import db
from config import Config
from routes.estoque import estoque_bp
from routes.vendas import vendas_bp
from routes.relatorios import relatorios_bp

# Inicializa o aplicativo Flask e o CORS
app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Inicializa o SQLAlchemy e as migrações
db.init_app(app)
migrate = Migrate(app, db)

# Registra os Blueprints
app.register_blueprint(estoque_bp, url_prefix='/api')
app.register_blueprint(vendas_bp, url_prefix='/api')
app.register_blueprint(relatorios_bp, url_prefix='/api')

@app.route('/')
def index():
    return "API do Sistema de Gestão da Padaria Majurak"

if __name__ == '__main__':
    # Cria o banco de dados se ele não existir
    with app.app_context():
        if not os.path.exists(Config.DATABASE_PATH):
            db.create_all()
    app.run(debug=True)