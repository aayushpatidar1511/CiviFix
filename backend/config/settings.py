import os
from pathlib import Path
BASE_DIR=Path(__file__).resolve().parent.parent
SECRET_KEY=os.getenv('DJANGO_SECRET_KEY','dev-change-me'); DEBUG=os.getenv('DJANGO_DEBUG','true').lower()=='true'; ALLOWED_HOSTS=os.getenv('DJANGO_ALLOWED_HOSTS','*').split(',')
INSTALLED_APPS=['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','django.contrib.gis','corsheaders','rest_framework','rest_framework_simplejwt','drf_spectacular','apps.core']
MIDDLEWARE=['corsheaders.middleware.CorsMiddleware','django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware']
ROOT_URLCONF='config.urls'; WSGI_APPLICATION='config.wsgi.application'; AUTH_USER_MODEL='core.User'
TEMPLATES=[{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
DATABASES={'default':{'ENGINE':os.getenv('DB_ENGINE','django.contrib.gis.db.backends.postgis'),'NAME':os.getenv('POSTGRES_DB','civifix'),'USER':os.getenv('POSTGRES_USER','civifix'),'PASSWORD':os.getenv('POSTGRES_PASSWORD','civifix'),'HOST':os.getenv('POSTGRES_HOST','localhost'),'PORT':os.getenv('POSTGRES_PORT','5432')}}
LANGUAGE_CODE='en-us'; TIME_ZONE='UTC'; USE_I18N=True; USE_TZ=True; STATIC_URL='/static/'; MEDIA_URL='/media/'; MEDIA_ROOT=BASE_DIR/'media'; DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
CORS_ALLOWED_ORIGINS=[x for x in os.getenv('CORS_ALLOWED_ORIGINS','http://localhost:3000').split(',') if x]; REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES':['rest_framework_simplejwt.authentication.JWTAuthentication'],'DEFAULT_PERMISSION_CLASSES':['rest_framework.permissions.IsAuthenticated'],'DEFAULT_SCHEMA_CLASS':'drf_spectacular.openapi.AutoSchema'}
SPECTACULAR_SETTINGS={'TITLE':'CiviFix API','DESCRIPTION':'Smart City civic intelligence platform','VERSION':'1.0.0'}
CELERY_BROKER_URL=os.getenv('REDIS_URL','redis://localhost:6379/0'); CELERY_RESULT_BACKEND=CELERY_BROKER_URL
CELERY_BEAT_SCHEDULE={'check-sla-breaches':{'task':'apps.core.tasks.check_sla_breaches','schedule':300}}
EMAIL_BACKEND=os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend' if os.getenv('EMAIL_HOST_USER') else 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST=os.getenv('EMAIL_HOST','smtp.gmail.com')
EMAIL_PORT=int(os.getenv('EMAIL_PORT','587'))
EMAIL_USE_TLS=os.getenv('EMAIL_USE_TLS','True').lower() in ['true','1']
EMAIL_HOST_USER=os.getenv('EMAIL_HOST_USER','')
EMAIL_HOST_PASSWORD=os.getenv('EMAIL_HOST_PASSWORD','')
DEFAULT_FROM_EMAIL=os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'CiviFix Municipal Support <notifications@civifix.local>')
