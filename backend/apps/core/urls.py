from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import *
router=DefaultRouter(); router.register('complaints',ComplaintViewSet,basename='complaint'); router.register('departments',DepartmentViewSet); router.register('infrastructure',AssetViewSet); router.register('notifications',NotificationViewSet,basename='notification')
urlpatterns=router.urls+[path('auth/register/',register),path('auth/me/',me),path('workers/',workers),path('analytics/dashboard/',dashboard),path('analytics/',analytics),path('map/',map_data),path('ai/classify/',classify),path('complaints/<int:pk>/assign/',assign),path('complaints/<int:pk>/community-verify/',community_verify),path('infrastructure/<int:pk>/calculate-risk/',asset_risk),path('geocode/search/',geocode_search),path('geocode/reverse/',geocode_reverse),path('emails/',email_logs)]
