from celery import shared_task
from django.utils import timezone
from .models import SLARecord,Escalation,Complaint,User,Notification
@shared_task
def check_sla_breaches():
 now=timezone.now(); n=0
 for sla in SLARecord.objects.filter(deadline__lt=now,breached=False).select_related('complaint'):
  sla.breached=True;sla.breached_at=now;sla.save(update_fields=['breached','breached_at']); c=sla.complaint;c.status='ESCALATED';c.save(update_fields=['status','updated_at']); Escalation.objects.create(complaint=c,level=1,reason='SLA deadline breached');
  for u in User.objects.filter(role__in=['DEPARTMENT_OFFICER','CITY_ADMIN']): Notification.objects.create(user=u,title='SLA breach',message=f'{c.code} has breached its SLA.',complaint=c)
  n+=1
 return n
