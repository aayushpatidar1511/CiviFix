from django.utils import timezone
from ..models import Complaint,MaintenanceRecord,InspectionRecord

def calculate_asset_risk(asset):
    complaints=Complaint.objects.filter(location__distance_lte=(asset.location,2000)).count() if asset.location else 0
    repairs=asset.maintenance.count(); inspections=asset.inspections.count(); age=0
    if asset.installation_date: age=max(0,(timezone.now().date()-asset.installation_date).days/365)
    score=min(100,age*4+complaints*5+repairs*3+max(0,30-inspections*5))
    health=max(0,100-score); reasons=[]
    if age>10: reasons.append('Asset age exceeds 10 years')
    if complaints>=5: reasons.append('Frequent nearby complaints')
    if repairs>=3: reasons.append('Repeated maintenance history')
    if inspections==0: reasons.append('No inspection history')
    return round(score,2),round(health,2),reasons
