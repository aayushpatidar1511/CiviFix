from rest_framework import serializers
from .models import *
class UserSerializer(serializers.ModelSerializer):
    class Meta: model=User; fields=['id','username','email','first_name','last_name','role','phone']
class RegisterSerializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True,min_length=8)
    class Meta: model=User; fields=['username','email','password','first_name','last_name','role','phone']
    def create(self,v):
        p=v.pop('password'); u=User(**v); u.set_password(p); u.save(); return u
class ComplaintImageSerializer(serializers.ModelSerializer):
    class Meta: model=ComplaintImage; fields=['id','image','created_at']
class AssignmentSerializer(serializers.ModelSerializer):
    worker=UserSerializer(read_only=True)
    class Meta: model=Assignment; fields='__all__'; read_only_fields=['assigned_by','assigned_at','started_at','completed_at']
class ResolutionEvidenceSerializer(serializers.ModelSerializer):
    worker = UserSerializer(read_only=True)
    class Meta:
        model = ResolutionEvidence
        fields = ['id', 'worker', 'before_image', 'after_image', 'notes', 'confidence', 'captured_at']

class CommentSerializer(serializers.ModelSerializer):
    author=UserSerializer(read_only=True)
    class Meta: model=ComplaintComment; fields=['id','complaint','author','body','created_at']; read_only_fields=['complaint','author','created_at']

class ComplaintSerializer(serializers.ModelSerializer):
    citizen=UserSerializer(read_only=True); department_name=serializers.CharField(source='department.name',read_only=True); supports_count=serializers.IntegerField(source='supports.count',read_only=True); assignment=AssignmentSerializer(read_only=True); images=ComplaintImageSerializer(many=True,read_only=True); sla_deadline=serializers.DateTimeField(source='sla.deadline',read_only=True); sla_breached=serializers.BooleanField(source='sla.breached',read_only=True); location=serializers.JSONField()
    resolution_evidence=ResolutionEvidenceSerializer(read_only=True)
    comments=CommentSerializer(many=True,read_only=True)
    verifications=serializers.SerializerMethodField()

    class Meta: model=Complaint; fields='__all__'; read_only_fields=['code','citizen','status','priority','priority_score','priority_reasons','department','resolved_at','created_at','updated_at']
    def get_verifications(self,obj):
        return {
            'total': obj.verifications.count(),
            'fixed': obj.verifications.filter(fixed=True).count(),
            'not_fixed': obj.verifications.filter(fixed=False).count(),
            'items': [{'id':v.id,'citizen':v.citizen.username,'fixed':v.fixed,'comment':v.comment,'created_at':v.created_at} for v in obj.verifications.all()]
        }
    def validate_location(self,v):
        if not isinstance(v,dict) or v.get('type')!='Point' or len(v.get('coordinates',[]))!=2: raise serializers.ValidationError('location must be a GeoJSON Point with [longitude, latitude].')
        return v
    def create(self,v):
        from django.contrib.gis.geos import Point
        loc=v.pop('location'); v['location']=Point(float(loc['coordinates'][0]),float(loc['coordinates'][1]),srid=4326); return super().create(v)
    def to_representation(self,obj):
        data=super().to_representation(obj); data['location']={'type':'Point','coordinates':[obj.location.x,obj.location.y]} if obj.location else None; return data
class DepartmentSerializer(serializers.ModelSerializer):
    class Meta: model=Department; fields='__all__'
class NotificationSerializer(serializers.ModelSerializer):
    class Meta: model=Notification; fields='__all__'
class AssetSerializer(serializers.ModelSerializer):
    location=serializers.JSONField(required=False)
    maintenance_count=serializers.IntegerField(source='maintenance.count',read_only=True)
    inspections_count=serializers.IntegerField(source='inspections.count',read_only=True)
    class Meta: model=InfrastructureAsset; fields='__all__'
    def validate_location(self,v):
        if not isinstance(v,dict) or v.get('type')!='Point' or len(v.get('coordinates',[]))!=2: raise serializers.ValidationError('location must be a GeoJSON Point with [longitude, latitude].')
        return v
    def create(self,v):
        from django.contrib.gis.geos import Point
        loc=v.pop('location',None)
        if loc: v['location']=Point(float(loc['coordinates'][0]),float(loc['coordinates'][1]),srid=4326)
        return super().create(v)
    def to_representation(self,obj):
        data=super().to_representation(obj); data['location']={'type':'Point','coordinates':[obj.location.x,obj.location.y]} if obj.location else None; return data
class HistorySerializer(serializers.ModelSerializer):
    actor=UserSerializer(read_only=True)
    class Meta: model=ComplaintStatusHistory; fields='__all__'

class EmailLogSerializer(serializers.ModelSerializer):
    class Meta: model=EmailLog; fields='__all__'
