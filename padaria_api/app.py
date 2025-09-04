# app.py
from flask import Flask
from models import db
from config import Config
from routes.estoque import estoque_bp
from routes.vendas import vendas_bp
from routes.relatorios import relatorios_bp

app = Flask(__name__)
app.config.from_object(Config)

# Inicializa o banco de dados
db.init_app(app)

# Registra os Blueprints (conjuntos de rotas)
app.register_blueprint(estoque_bp, url_prefix='/api')
app.register_blueprint(vendas_bp, url_prefix='/api')
app.register_blueprint(relatorios_bp, url_prefix='/api')

# ---
# A forma correta de criar as tabelas no Flask 2.0+
# Este bloco cria as tabelas assim que o app é executado
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return "API da Padaria Online!"

if __name__ == '__main__':
    # Roda a aplicação em modo de debug para desenvolvimento
    app.run(debug=True)