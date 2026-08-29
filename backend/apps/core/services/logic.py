from datetime import timedelta
from django.utils import timezone
from django.contrib.gis.measure import D
from django.db.models import Q
from ..models import *
SLA={'CRITICAL':12,'HIGH':24,'MEDIUM':72,'LOW':168}
def score_priority(c):
    text=(c.title+' '+c.description).lower(); score=20; reasons=[]
    if any(x in text for x in ['danger','accident','unsafe','hospital','school']): score+=25; reasons.append('Public safety or sensitive facility mentioned')
    reports=c.supports.count()+1
    if reports>=5: score+=20; reasons.append('Multiple citizen reports')
    age=(timezone.now()-c.created_at).total_seconds()/86400 if c.created_at else 0
    if age>=5: score+=15; reasons.append('Active for 5+ days')
    if c.category in ['ROAD','POTHOLE','DRAINAGE','WATER']: score+=10; reasons.append('Infrastructure disruption category')
    score=min(100,score); level='CRITICAL' if score>=80 else 'HIGH' if score>=60 else 'MEDIUM' if score>=35 else 'LOW'
    return score,level,reasons
def set_sla(c):
    deadline=timezone.now()+timedelta(hours=SLA[c.priority]); SLARecord.objects.update_or_create(complaint=c,defaults={'deadline':deadline,'breached':False})
def notify(user,title,message,complaint=None): Notification.objects.create(user=user,title=title,message=message,complaint=complaint)
def audit(actor,action,obj,metadata=None): AuditLog.objects.create(actor=actor,action=action,object_type=obj.__class__.__name__,object_id=str(obj.pk),metadata=metadata or {})
def similar(c):
    qs=Complaint.objects.filter(~Q(pk=c.pk),status__in=['REPORTED','UNDER_REVIEW','VERIFIED','ASSIGNED','IN_PROGRESS','ESCALATED'],category=c.category,location__distance_lte=(c.location,D(km=2)))
    words=set((c.title+' '+c.description).lower().split()); out=[]
    for x in qs[:30]:
        other=set((x.title+' '+x.description).lower().split()); sim=len(words&other)/max(1,len(words|other))
        if sim>=.2: out.append((x,sim))
    return sorted(out,key=lambda z:z[1],reverse=True)[:5]
