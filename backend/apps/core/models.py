from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    class Role(models.TextChoices):
        CITIZEN='CITIZEN','Citizen'; FIELD_WORKER='FIELD_WORKER','Field Worker'; DEPARTMENT_OFFICER='DEPARTMENT_OFFICER','Department Officer'; CITY_ADMIN='CITY_ADMIN','City Admin'
    role=models.CharField(max_length=30,choices=Role.choices,default=Role.CITIZEN)
    phone=models.CharField(max_length=30,blank=True)

class CitizenProfile(models.Model):
    user=models.OneToOneField(User,on_delete=models.CASCADE,related_name='citizen_profile')
    address=models.CharField(max_length=255,blank=True)

class Department(models.Model):
    name=models.CharField(max_length=120,unique=True); code=models.CharField(max_length=30,unique=True); head=models.ForeignKey(User,null=True,blank=True,on_delete=models.SET_NULL,related_name='headed_departments'); categories=models.JSONField(default=list,blank=True)
    def __str__(self): return self.name

class WorkerProfile(models.Model):
    user=models.OneToOneField(User,on_delete=models.CASCADE,related_name='worker_profile'); department=models.ForeignKey(Department,on_delete=models.PROTECT,related_name='workers'); employee_id=models.CharField(max_length=50,unique=True); skills=models.JSONField(default=list,blank=True); current_location=models.PointField(srid=4326,null=True,blank=True)

class Complaint(models.Model):
    class Status(models.TextChoices):
        REPORTED='REPORTED'; UNDER_REVIEW='UNDER_REVIEW'; VERIFIED='VERIFIED'; ASSIGNED='ASSIGNED'; IN_PROGRESS='IN_PROGRESS'; RESOLVED='RESOLVED'; COMMUNITY_VERIFIED='COMMUNITY_VERIFIED'; CLOSED='CLOSED'; REJECTED='REJECTED'; REOPENED='REOPENED'; ESCALATED='ESCALATED'
    class Priority(models.TextChoices): LOW='LOW'; MEDIUM='MEDIUM'; HIGH='HIGH'; CRITICAL='CRITICAL'
    CATEGORY_CHOICES=[(x,x.replace('_',' ').title()) for x in ['ROAD','POTHOLE','STREETLIGHT','WATER','DRAINAGE','GARBAGE','TRAFFIC_SIGNAL','PUBLIC_TRANSPORT','PARK','FOOTPATH','PUBLIC_TOILET','ELECTRICITY','PUBLIC_BUILDING','OTHER']]
    code=models.CharField(max_length=30,unique=True,db_index=True); citizen=models.ForeignKey(User,on_delete=models.PROTECT,related_name='complaints'); title=models.CharField(max_length=200); description=models.TextField(); category=models.CharField(max_length=40,choices=CATEGORY_CHOICES,default='OTHER',db_index=True); status=models.CharField(max_length=30,choices=Status.choices,default=Status.REPORTED,db_index=True); priority=models.CharField(max_length=20,choices=Priority.choices,default=Priority.MEDIUM,db_index=True); priority_score=models.PositiveSmallIntegerField(default=0); priority_reasons=models.JSONField(default=list,blank=True); location=models.PointField(srid=4326); address=models.CharField(max_length=255,blank=True); department=models.ForeignKey(Department,null=True,blank=True,on_delete=models.SET_NULL,related_name='complaints'); created_at=models.DateTimeField(auto_now_add=True); updated_at=models.DateTimeField(auto_now=True); resolved_at=models.DateTimeField(null=True,blank=True)
    class Meta: indexes=[models.Index(fields=['status','priority']),models.Index(fields=['category','created_at'])]

class ComplaintImage(models.Model):
    complaint=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='images'); image=models.FileField(upload_to='complaints/%Y/%m/'); uploaded_by=models.ForeignKey(User,on_delete=models.PROTECT); created_at=models.DateTimeField(auto_now_add=True)
class ComplaintComment(models.Model):
    complaint=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='comments'); author=models.ForeignKey(User,on_delete=models.PROTECT); body=models.TextField(); created_at=models.DateTimeField(auto_now_add=True)
class ComplaintStatusHistory(models.Model):
    complaint=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='status_history'); actor=models.ForeignKey(User,null=True,on_delete=models.SET_NULL); old_status=models.CharField(max_length=30,blank=True); new_status=models.CharField(max_length=30); reason=models.TextField(blank=True); timestamp=models.DateTimeField(auto_now_add=True)
class MasterIssue(models.Model):
    title=models.CharField(max_length=200); location=models.PointField(srid=4326); created_at=models.DateTimeField(auto_now_add=True)
class IssueRelation(models.Model):
    relation_type=models.CharField(max_length=30,choices=[('duplicate','Duplicate'),('related','Related'),('possible_cause','Possible cause'),('consequence','Consequence'),('affected_by','Affected by')]); source=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='relations_from'); target=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='relations_to'); confidence=models.FloatField(default=0)
class IssueSupport(models.Model):
    complaint=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='supports'); citizen=models.ForeignKey(User,on_delete=models.CASCADE); created_at=models.DateTimeField(auto_now_add=True)
    class Meta: constraints=[models.UniqueConstraint(fields=['complaint','citizen'],name='unique_issue_support')]
class Assignment(models.Model):
    complaint=models.OneToOneField(Complaint,on_delete=models.CASCADE,related_name='assignment'); worker=models.ForeignKey(User,on_delete=models.PROTECT,related_name='assignments'); assigned_by=models.ForeignKey(User,on_delete=models.PROTECT,related_name='created_assignments'); assigned_at=models.DateTimeField(auto_now_add=True); started_at=models.DateTimeField(null=True); completed_at=models.DateTimeField(null=True)
class SLARecord(models.Model):
    complaint=models.OneToOneField(Complaint,on_delete=models.CASCADE,related_name='sla'); deadline=models.DateTimeField(); breached=models.BooleanField(default=False); breached_at=models.DateTimeField(null=True); created_at=models.DateTimeField(auto_now_add=True)
class Escalation(models.Model):
    complaint=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='escalations'); level=models.PositiveSmallIntegerField(); reason=models.TextField(); created_at=models.DateTimeField(auto_now_add=True); resolved=models.BooleanField(default=False)
class ResolutionEvidence(models.Model):
    complaint=models.OneToOneField(Complaint,on_delete=models.CASCADE,related_name='resolution_evidence'); worker=models.ForeignKey(User,on_delete=models.PROTECT); before_image=models.FileField(upload_to='evidence/before/'); after_image=models.FileField(upload_to='evidence/after/'); location=models.PointField(srid=4326,null=True); captured_at=models.DateTimeField(default=timezone.now); confidence=models.FloatField(default=0); notes=models.TextField(blank=True)
class CommunityVerification(models.Model):
    complaint=models.ForeignKey(Complaint,on_delete=models.CASCADE,related_name='verifications'); citizen=models.ForeignKey(User,on_delete=models.CASCADE); fixed=models.BooleanField(); comment=models.TextField(blank=True); created_at=models.DateTimeField(auto_now_add=True)
    class Meta: constraints=[models.UniqueConstraint(fields=['complaint','citizen'],name='unique_community_vote')]
class InfrastructureAsset(models.Model):
    asset_id=models.CharField(max_length=50,unique=True); asset_type=models.CharField(max_length=50); location=models.PointField(srid=4326); installation_date=models.DateField(null=True); last_inspection=models.DateField(null=True); last_repair=models.DateField(null=True); health_score=models.FloatField(default=100); risk_score=models.FloatField(default=0); metadata=models.JSONField(default=dict,blank=True); created_at=models.DateTimeField(auto_now_add=True)
class MaintenanceRecord(models.Model):
    asset=models.ForeignKey(InfrastructureAsset,on_delete=models.CASCADE,related_name='maintenance'); description=models.TextField(); performed_at=models.DateTimeField(); cost=models.DecimalField(max_digits=12,decimal_places=2,null=True); worker=models.ForeignKey(User,null=True,on_delete=models.SET_NULL)
class InspectionRecord(models.Model):
    asset=models.ForeignKey(InfrastructureAsset,on_delete=models.CASCADE,related_name='inspections'); inspected_at=models.DateTimeField(); health_score=models.FloatField(); notes=models.TextField(blank=True); inspector=models.ForeignKey(User,null=True,on_delete=models.SET_NULL)
class Incident(models.Model):
    title=models.CharField(max_length=200); categories=models.JSONField(default=list); area=models.PointField(srid=4326,null=True); confidence=models.FloatField(default=0); start_time=models.DateTimeField(); end_time=models.DateTimeField(null=True); status=models.CharField(max_length=30,default='POTENTIAL')
class IncidentReport(models.Model):
    incident=models.ForeignKey(Incident,on_delete=models.CASCADE,related_name='reports'); complaint=models.OneToOneField(Complaint,on_delete=models.CASCADE)
class Notification(models.Model):
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name='notifications'); title=models.CharField(max_length=200); message=models.TextField(); read=models.BooleanField(default=False); created_at=models.DateTimeField(auto_now_add=True); complaint=models.ForeignKey(Complaint,null=True,blank=True,on_delete=models.CASCADE)
class AuditLog(models.Model):
    actor=models.ForeignKey(User,null=True,on_delete=models.SET_NULL); action=models.CharField(max_length=100); object_type=models.CharField(max_length=100); object_id=models.CharField(max_length=100); metadata=models.JSONField(default=dict,blank=True); timestamp=models.DateTimeField(auto_now_add=True)
class AIPrediction(models.Model):
    complaint=models.OneToOneField(Complaint,on_delete=models.CASCADE,related_name='ai_prediction'); category=models.CharField(max_length=40); confidence=models.FloatField(); suggested_department=models.ForeignKey(Department,null=True,on_delete=models.SET_NULL); suggested_priority=models.CharField(max_length=20); model_version=models.CharField(max_length=50); created_at=models.DateTimeField(auto_now_add=True); overridden=models.BooleanField(default=False)
class RiskScore(models.Model):
    asset=models.OneToOneField(InfrastructureAsset,on_delete=models.CASCADE,related_name='risk_detail'); score=models.FloatField(); category=models.CharField(max_length=20); reasons=models.JSONField(default=list); model_version=models.CharField(max_length=50); created_at=models.DateTimeField(auto_now_add=True)

class EmailLog(models.Model):
    recipient=models.EmailField()
    subject=models.CharField(max_length=255)
    body=models.TextField()
    complaint=models.ForeignKey(Complaint,null=True,blank=True,on_delete=models.CASCADE,related_name='email_logs')
    status=models.CharField(max_length=20,default='SENT')
    error_message=models.TextField(blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.recipient} - {self.subject}"
