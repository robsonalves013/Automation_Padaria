from flask import Flask, render_template
from padaria_api.routes import api_bp
from config import Config

def create_app():
    # 'static_folder' e 'template_folder' indicam onde encontrar esses arquivos.
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(Config)
    
    # Registra o Blueprint da sua API com o prefixo '/api'
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return render_template('index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)