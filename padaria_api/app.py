from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import Config
from routes.vendas_bp import vendas_bp
from routes.estoque_bp import estoque_bp
from routes.relatorios_bp import relatorios_bp

# Inicializa o Flask e o CORS
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configura o banco de dados
app.config.from_object(Config)
db = SQLAlchemy(app)

# Registra os Blueprints para as rotas
app.register_blueprint(vendas_bp, url_prefix='/api')
app.register_blueprint(estoque_bp, url_prefix='/api')
app.register_blueprint(relatorios_bp, url_prefix='/api')


@app.route('/')
def home():
    return 'API da Padaria Majurak está no ar!'

if __name__ == '__main__':
    with app.app_context():
        # Cria as tabelas do banco de dados se elas não existirem
        try:
            db.create_all()
            print("Tabelas do banco de dados criadas com sucesso.")
        except Exception as e:
            print(f"Erro ao criar tabelas: {e}")
            
    app.run(debug=True)