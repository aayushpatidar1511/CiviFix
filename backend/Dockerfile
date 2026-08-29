FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gdal-bin libgdal-dev libgeos-dev libproj-dev && rm -rf /var/lib/apt/lists/*
COPY requirements/base.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python","manage.py","runserver","0.0.0.0:8000"]
