from rest_framework.permissions import BasePermission
from .models import User
class IsAdmin(BasePermission):
    def has_permission(self,request,view): return request.user.is_authenticated and request.user.role==User.Role.CITY_ADMIN
class IsOfficerOrAdmin(BasePermission):
    def has_permission(self,request,view): return request.user.is_authenticated and request.user.role in [User.Role.CITY_ADMIN,User.Role.DEPARTMENT_OFFICER]
