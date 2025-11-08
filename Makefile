.PHONY: backend-install backend-run frontend-install frontend-dev migrate upgrade seed

backend-install:
	python3 -m venv backend/venv
	backend/venv/bin/pip install -r backend/requirements.txt

backend-run:
	cd backend && FLASK_APP=app flask run --host=0.0.0.0 --port=5000

migrate:
	cd backend && FLASK_APP=app flask db migrate

upgrade:
	cd backend && FLASK_APP=app flask db upgrade

seed:
	cd backend && backend/venv/bin/python seed.py

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev
