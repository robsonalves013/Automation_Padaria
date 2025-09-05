from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db  # Importa o objeto 'db' do novo arquivo
from routes.vendas_bp import vendas_bp
from routes.estoque_bp import estoque_bp
from routes.relatorios_bp import relatorios_bp

# Inicializa o Flask
app = Flask(__name__)

# Configurações do app
app.config.from_object(Config)

# Inicializa o banco de dados com o app
db.init_app(app)

# Configura o CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/')
def home():
    return 'API da Padaria Majurak está no ar!'

if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            print("Tabelas do banco de dados criadas com sucesso.")
        except Exception as e:
            print(f"Erro ao criar tabelas: {e}")
            
    app.run(debug=True)