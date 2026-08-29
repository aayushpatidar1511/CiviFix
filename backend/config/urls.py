from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView
from drf_spectacular.views import SpectacularAPIView,SpectacularSwaggerView
from apps.core.views import health
urlpatterns=[path('health/',health),path('api/auth/login/',TokenObtainPairView.as_view(),name='token'),path('api/auth/refresh/',TokenRefreshView.as_view()),path('api/schema/',SpectacularAPIView.as_view()),path('api/docs/',SpectacularSwaggerView.as_view(url_name='schema')),path('api/v1/',include('apps.core.urls'))]+static(settings.MEDIA_URL,document_root=settings.MEDIA_ROOT)
