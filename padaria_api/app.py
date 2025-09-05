from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db

# Importe os blueprints (rotas)
from routes.vendas_bp import vendas_bp
from routes.estoque_bp import estoque_bp
from routes.relatorios_bp import relatorios_bp

app = Flask(__name__)
app.config.from_object(Config)

# Inicializa o banco de dados com o app
db.init_app(app)

# Registra os blueprints com um prefixo de URL
app.register_blueprint(vendas_bp, url_prefix='/api')
app.register_blueprint(estoque_bp, url_prefix='/api')
app.register_blueprint(relatorios_bp, url_prefix='/api')

# Configura o CORS para permitir requisições do frontend
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/')
def home():
    return 'API da Padaria Majurak está no ar!'

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)