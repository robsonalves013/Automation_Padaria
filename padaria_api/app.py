from flask import Flask
from models import db
from config import Config
from routes.estoque import estoque_bp
from routes.vendas import vendas_bp
from routes.relatorios import relatorios_bp
from flask_cors import CORS

# Cria a instância da aplicação Flask
app = Flask(__name__)

# Carrega as configurações do arquivo config.py
app.config.from_object(Config)

# Habilita o CORS para toda a aplicação.
CORS(app)

# Inicializa o banco de dados com a aplicação
db.init_app(app)

# Registra os Blueprints para modularizar as rotas
app.register_blueprint(estoque_bp, url_prefix='/api')
app.register_blueprint(vendas_bp, url_prefix='/api')
app.register_blueprint(relatorios_bp, url_prefix='/api')

# Cria as tabelas do banco de dados se elas não existirem.
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    """Rota inicial para verificar se a API está funcionando."""
    return "API do Sistema de Gestão da Padaria Majurak Online!"

if __name__ == '__main__':
    app.run(debug=True)