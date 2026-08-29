from django.contrib import admin
from .models import *
for m in [User,CitizenProfile,WorkerProfile,Department,Complaint,ComplaintImage,ComplaintComment,ComplaintStatusHistory,MasterIssue,IssueRelation,IssueSupport,Assignment,SLARecord,Escalation,ResolutionEvidence,CommunityVerification,InfrastructureAsset,MaintenanceRecord,InspectionRecord,Incident,IncidentReport,Notification,AuditLog,AIPrediction,RiskScore]: admin.site.register(m)
