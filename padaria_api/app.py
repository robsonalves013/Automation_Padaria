from flask import Flask, render_template
from flask_cors import CORS
from config import Config
from extensions import db
from routes.vendas_bp import vendas_bp
from routes.estoque_bp import estoque_bp
from routes.relatorios_bp import relatorios_bp
# Importe os modelos para garantir que o SQLAlchemy os reconheça
from models import ProdutoEstoque, Venda, VendaItem

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

CORS(app, resources={r"/api/*": {"origins": "*"}})

app.register_blueprint(vendas_bp, url_prefix='/api')
app.register_blueprint(estoque_bp, url_prefix='/api')
app.register_blueprint(relatorios_bp, url_prefix='/api')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    with app.app_context():
        # Isso criará as tabelas do banco de dados com base nos modelos que você importou.
        # É essencial importar o arquivo de modelos para que isso funcione corretamente.
        db.create_all()
    app.run(debug=True)