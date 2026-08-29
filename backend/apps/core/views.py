from uuid import uuid4
from django.db.models import Count,Avg,Q
from django.utils import timezone
from django.http import JsonResponse
from rest_framework import status,viewsets
from rest_framework.decorators import action,api_view,permission_classes
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.parsers import MultiPartParser,FormParser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import *
from .serializers import *
from .permissions import IsAdmin,IsOfficerOrAdmin
from .services.logic import *
from .services.email_service import notify_complaint_registered, notify_status_update, notify_worker_assigned

def health(request): return JsonResponse({'status':'ok','service':'civifix-api','time':timezone.now().isoformat()})

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    s=RegisterSerializer(data=request.data); s.is_valid(raise_exception=True); u=s.save();
    if u.role==User.Role.CITIZEN: CitizenProfile.objects.get_or_create(user=u)
    return Response({'user':UserSerializer(u).data,'access':str(RefreshToken.for_user(u).access_token),'refresh':str(RefreshToken.for_user(u))},status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workers(request):
    return Response(UserSerializer(User.objects.filter(role=User.Role.FIELD_WORKER).order_by('first_name','username'),many=True).data)

class ComplaintViewSet(viewsets.ModelViewSet):
    serializer_class=ComplaintSerializer
    def get_queryset(self):
        u=self.request.user
        qs=Complaint.objects.all().select_related('department','citizen').prefetch_related('comments','images','verifications').order_by('-created_at')
        if getattr(self, 'detail', False) or self.action in ['retrieve','support','comment','similar','history','resolve','transition','assign','community_verify']: return qs
        show_all = self.request.query_params.get('all','').lower() in ['true','1']
        if show_all: return qs
        if u.role==User.Role.CITIZEN: return qs.filter(citizen=u)
        if u.role==User.Role.FIELD_WORKER: return qs.filter(assignment__worker=u)
        if u.role==User.Role.DEPARTMENT_OFFICER: return qs.filter(Q(department__head=u)|Q(department__isnull=True))
        return qs
    def perform_create(self,serializer):
        d=serializer.validated_data
        c=serializer.save(citizen=self.request.user,code='CF-'+uuid4().hex[:8].upper())
        score,level,reasons=score_priority(c); c.priority_score=score;c.priority=level;c.priority_reasons=reasons
        mapping={'POTHOLE':'Road','ROAD':'Road','STREETLIGHT':'Electrical','WATER':'Water','DRAINAGE':'Water','GARBAGE':'Sanitation','ELECTRICITY':'Electrical'}
        dep=Department.objects.filter(name__icontains=mapping.get(c.category,'')).first(); c.department=dep;c.save(); set_sla(c)
        ComplaintStatusHistory.objects.create(complaint=c,actor=self.request.user,new_status=c.status,reason='Report submitted'); audit(self.request.user,'complaint.created',c); notify(self.request.user,'Complaint submitted',f'{c.code} has been received.',c)
        try:
            notify_complaint_registered(c)
        except Exception as e:
            print(f"[EMAIL ERROR perform_create]: {e}")
    @action(detail=True,methods=['post'])
    def transition(self,request,pk=None):
        c=self.get_object(); new=request.data.get('status'); reason=request.data.get('reason','')
        allowed=set(x for x,_ in Complaint.Status.choices)
        if new not in allowed: return Response({'detail':'Invalid status'},400)
        if request.user.role==User.Role.CITIZEN and new not in ['REOPENED']: return Response({'detail':'Not allowed'},403)
        old=c.status;c.status=new
        if new=='RESOLVED': c.resolved_at=timezone.now()
        c.save(); ComplaintStatusHistory.objects.create(complaint=c,actor=request.user,old_status=old,new_status=new,reason=reason); audit(request.user,'complaint.status_changed',c,{'old':old,'new':new}); notify(c.citizen,'Complaint status updated',f'{c.code}: {new}',c)
        try:
            notify_status_update(c, old, new, reason, request.user)
        except Exception as e:
            print(f"[EMAIL ERROR transition]: {e}")
        return Response(ComplaintSerializer(c).data)
    @action(detail=True,methods=['post'])
    def assign(self,request,pk=None):
        c=self.get_object()
        if request.user.role not in [User.Role.DEPARTMENT_OFFICER,User.Role.CITY_ADMIN]:
            return Response({'detail':'Only department officers or admins can assign workers'},status=403)
        worker_id=request.data.get('worker_id')
        if not worker_id: return Response({'detail':'worker_id is required'},status=400)
        worker=User.objects.filter(id=worker_id,role=User.Role.FIELD_WORKER).first()
        if not worker: return Response({'detail':'Worker not found'},status=404)
        assignment,_=Assignment.objects.update_or_create(complaint=c,defaults={'worker':worker,'assigned_by':request.user})
        old=c.status; c.status='ASSIGNED'; c.save(update_fields=['status','updated_at'])
        ComplaintStatusHistory.objects.create(complaint=c,actor=request.user,old_status=old,new_status='ASSIGNED',reason=f'Assigned to {worker.first_name or worker.username}')
        audit(request.user,'complaint.assigned',c,{'worker_id':worker.id,'worker':worker.username})
        notify(c.citizen,'Worker assigned',f'{worker.first_name or worker.username} has been dispatched to {c.code}.',c)
        notify(worker,'New assignment',f'You have been assigned to complaint {c.code}.',c)
        try:
            notify_worker_assigned(c, worker, request.user)
            notify_status_update(c, old, 'ASSIGNED', f'Dispatched field worker {worker.first_name or worker.username}', request.user)
        except Exception as e:
            print(f"[EMAIL ERROR assign]: {e}")
        return Response({'assignment_id':assignment.id,'status':c.status,'worker':UserSerializer(worker).data})
    @action(detail=True,methods=['post'],url_path='community-verify')
    def community_verify(self,request,pk=None):
        c=self.get_object()
        fixed=bool(request.data.get('fixed',True))
        comment=request.data.get('comment','')
        CommunityVerification.objects.update_or_create(complaint=c,citizen=request.user,defaults={'fixed':fixed,'comment':comment})
        negative_votes=c.verifications.filter(fixed=False).count()
        if not fixed and negative_votes>=2:
            old=c.status; c.status='REOPENED'; c.save(update_fields=['status','updated_at'])
            ComplaintStatusHistory.objects.create(complaint=c,actor=request.user,old_status=old,new_status='REOPENED',reason=f'Reopened by community ({negative_votes} dispute votes)')
            audit(request.user,'complaint.reopened_by_community',c,{'negative_votes':negative_votes})
            notify(c.citizen,'Complaint reopened',f'{c.code} has been reopened due to community review disputes.',c)
            try:
                notify_status_update(c, old, 'REOPENED', 'Reopened after citizen verification disputes.', request.user)
            except Exception as e:
                print(f"[EMAIL ERROR community_verify]: {e}")
        elif fixed:
            c.status='COMMUNITY_VERIFIED'; c.save(update_fields=['status','updated_at'])
        return Response({'fixed':fixed,'negative_votes':negative_votes,'status':c.status})
    @action(detail=True,methods=['post'])
    def support(self,request,pk=None):
        c=self.get_object(); IssueSupport.objects.get_or_create(complaint=c,citizen=request.user); c.priority_score,c.priority,c.priority_reasons=score_priority(c); c.save(); return Response({'supported':True,'count':c.supports.count()})
    @action(detail=True,methods=['get','post'])
    def comment(self,request,pk=None):
        c=self.get_object()
        if request.method=='POST':
            s=CommentSerializer(data=request.data); s.is_valid(raise_exception=True); obj=s.save(complaint=c,author=request.user); return Response(CommentSerializer(obj).data,201)
        comments=c.comments.all().select_related('author').order_by('created_at')
        return Response(CommentSerializer(comments,many=True).data)
    @action(detail=True,methods=['get'])
    def similar(self,request,pk=None):
        c=self.get_object(); return Response([{'id':x.id,'code':x.code,'title':x.title,'similarity':round(sim,3)} for x,sim in similar(c)])
    @action(detail=True,methods=['get'])
    def history(self,request,pk=None): return Response(HistorySerializer(self.get_object().status_history.all().order_by('timestamp'),many=True).data)
    @action(detail=True,methods=['post'],parser_classes=[MultiPartParser,FormParser])
    def upload_image(self,request,pk=None):
        c=self.get_object(); img=request.FILES.get('image')
        if not img: return Response({'detail':'No image provided'},status=400)
        obj=ComplaintImage.objects.create(complaint=c,image=img,uploaded_by=request.user)
        return Response(ComplaintImageSerializer(obj).data,status=201)
    @action(detail=True,methods=['post'],parser_classes=[MultiPartParser,FormParser])
    def resolve(self,request,pk=None):
        c=self.get_object()
        if request.user.role not in [User.Role.FIELD_WORKER,User.Role.DEPARTMENT_OFFICER,User.Role.CITY_ADMIN]:
            return Response({'detail':'Forbidden'},status=403)
        notes=request.data.get('notes','')
        before_img=request.FILES.get('before_image')
        after_img=request.FILES.get('after_image')
        ResolutionEvidence.objects.update_or_create(
            complaint=c,
            defaults={
                'worker':request.user,
                'notes':notes,
                'before_image':before_img if before_img else getattr(getattr(c,'resolution_evidence',None),'before_image',None),
                'after_image':after_img if after_img else getattr(getattr(c,'resolution_evidence',None),'after_image',None),
                'confidence':0.95,
                'captured_at':timezone.now()
            }
        )
        old=c.status; c.status='RESOLVED'; c.resolved_at=timezone.now(); c.save(update_fields=['status','resolved_at','updated_at'])
        ComplaintStatusHistory.objects.create(complaint=c,actor=request.user,old_status=old,new_status='RESOLVED',reason=notes or 'Resolved with proof of work')
        audit(request.user,'complaint.resolved',c,{'notes':notes})
        notify(c.citizen,'Complaint resolved',f'{c.code} has been resolved by field worker.',c)
        try:
            notify_status_update(c, old, 'RESOLVED', notes or 'Resolved by field worker with proof photos.', request.user)
        except Exception as e:
            print(f"[EMAIL ERROR resolve]: {e}")
        return Response(ComplaintSerializer(c).data)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset=Department.objects.all().order_by('name'); serializer_class=DepartmentSerializer; permission_classes=[IsOfficerOrAdmin]
class AssetViewSet(viewsets.ModelViewSet):
    queryset=InfrastructureAsset.objects.all().order_by('-risk_score'); serializer_class=AssetSerializer
    def get_permissions(self): return [IsAdmin()] if self.action in ['create','update','partial_update','destroy'] else [IsAuthenticated()]
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=NotificationSerializer
    def get_queryset(self): return Notification.objects.filter(user=self.request.user).order_by('-created_at')
    @action(detail=True,methods=['post'])
    def read(self,request,pk=None):
        n=self.get_object();n.read=True;n.save(update_fields=['read']);return Response({'read':True})
    @action(detail=False,methods=['post'])
    def mark_all_read(self,request):
        Notification.objects.filter(user=request.user,read=False).update(read=True)
        return Response({'read_all':True})

@api_view(['GET'])
def dashboard(request):
    if not request.user.is_authenticated:return Response({'detail':'Authentication required'},401)
    qs=Complaint.objects.all()
    if request.user.role==User.Role.CITIZEN: qs=qs.filter(citizen=request.user)
    total=qs.count(); open_count=qs.exclude(status__in=['RESOLVED','COMMUNITY_VERIFIED','CLOSED','REJECTED']).count(); resolved=qs.filter(status__in=['RESOLVED','COMMUNITY_VERIFIED','CLOSED']).count(); critical=qs.filter(priority='CRITICAL').exclude(status='CLOSED').count()
    cats=list(qs.values('category').annotate(count=Count('id')).order_by('-count')); depts=list(Department.objects.annotate(count=Count('complaints')).values('name','count'))
    return Response({'total_complaints':total,'open_complaints':open_count,'resolved_complaints':resolved,'critical_issues':critical,'categories':cats,'departments':depts,'sla_breaches':SLARecord.objects.filter(breached=True).count(),'infrastructure_risk':round(InfrastructureAsset.objects.aggregate(a=Avg('risk_score'))['a'] or 0,2)})

@api_view(['GET'])
def map_data(request):
    qs=Complaint.objects.exclude(status='CLOSED').select_related('department')
    if request.user.is_authenticated and request.user.role==User.Role.CITIZEN and request.query_params.get('mine','').lower()=='true':
        qs=qs.filter(citizen=request.user)
    return Response([{'id':c.id,'code':c.code,'title':c.title,'category':c.category,'status':c.status,'priority':c.priority,'priority_score':c.priority_score,'address':c.address,'department_name':c.department.name if c.department else 'General','supports_count':c.supports.count(),'lat':c.location.y if c.location else 22.7196,'lng':c.location.x if c.location else 75.8577,'created_at':c.created_at.isoformat() if c.created_at else None} for c in qs[:500]])

@api_view(['GET'])
def analytics(request):
    qs=Complaint.objects.all(); return Response({'status':list(qs.values('status').annotate(count=Count('id'))),'priority':list(qs.values('priority').annotate(count=Count('id'))),'category':list(qs.values('category').annotate(count=Count('id'))),'monthly':list(qs.extra(select={'month':"date_trunc('month', created_at)"}).values('month').annotate(count=Count('id')).order_by('month'))})

@api_view(['POST'])
def classify(request):
    from .services.ai import AIClassificationService
    title=request.data.get('title',''); description=request.data.get('description',''); cat,conf=AIClassificationService().predict(title,description)
    score,priority,reasons=score_priority(type('C',(),{'title':title,'description':description,'supports':type('S',(),{'count':lambda self:0})(),'category':cat,'created_at':timezone.now()})())
    return Response({'category':cat,'confidence':conf,'suggested_priority':priority,'priority_score':score,'reasons':reasons})

@api_view(['POST'])
def assign(request,pk):
    c=Complaint.objects.get(pk=pk); u=request.user
    if u.role not in [User.Role.CITY_ADMIN,User.Role.DEPARTMENT_OFFICER]: return Response({'detail':'Forbidden'},403)
    worker_id=request.data.get('worker_id'); worker=User.objects.filter(pk=worker_id,role=User.Role.FIELD_WORKER).first()
    if not worker:return Response({'detail':'Field worker not found'},400)
    a,_=Assignment.objects.update_or_create(complaint=c,defaults={'worker':worker,'assigned_by':u}); c.status='ASSIGNED';c.save(update_fields=['status','updated_at']);ComplaintStatusHistory.objects.create(complaint=c,actor=u,new_status='ASSIGNED',reason='Assigned to field worker');notify(worker,'New assignment',f'{c.code} assigned to you.',c);return Response({'assignment_id':a.id,'status':'ASSIGNED','worker':UserSerializer(worker).data})

@api_view(['POST'])
def community_verify(request,pk):
    c=Complaint.objects.get(pk=pk)
    if c.status not in ['RESOLVED','COMMUNITY_VERIFIED']: return Response({'detail':'Complaint is not awaiting verification'},400)
    fixed=bool(request.data.get('fixed')); obj,_=CommunityVerification.objects.update_or_create(complaint=c,citizen=request.user,defaults={'fixed':fixed,'comment':request.data.get('comment','')})
    negatives=c.verifications.filter(fixed=False).count()
    if fixed: c.status='COMMUNITY_VERIFIED'
    elif negatives>=2: c.status='REOPENED'; c.resolved_at=None
    c.save(update_fields=['status','resolved_at','updated_at']); ComplaintStatusHistory.objects.create(complaint=c,actor=request.user,new_status=c.status,reason='Community verification'); return Response({'fixed':fixed,'negative_votes':negatives,'status':c.status})

@api_view(['POST'])
def asset_risk(request,pk):
    from .services.risk import calculate_asset_risk
    a=InfrastructureAsset.objects.get(pk=pk); risk,health,reasons=calculate_asset_risk(a);a.risk_score=risk;a.health_score=health;a.save(update_fields=['risk_score','health_score']); RiskScore.objects.update_or_create(asset=a,defaults={'score':risk,'category':'HIGH' if risk>=70 else 'MEDIUM' if risk>=40 else 'LOW','reasons':reasons,'model_version':'baseline-v1'});return Response({'risk_score':risk,'health_score':health,'reasons':reasons})

@api_view(['GET'])
@permission_classes([AllowAny])
def geocode_search(request):
    import urllib.request, urllib.parse, json
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response([])

    queries_to_try = [f"{q}, Indore", q] if 'indore' not in q.lower() else [q]

    combined_results = []
    seen_names = set()

    for query_str in queries_to_try:
        try:
            url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(query_str)}&limit=5&addressdetails=1"
            req = urllib.request.Request(url, headers={'User-Agent': 'CiviFix-SmartCity/1.0 (admin@civifix.local)'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                for item in (data or []):
                    name = item.get('display_name', '')
                    if name not in seen_names:
                        seen_names.add(name)
                        combined_results.append(item)
        except Exception:
            pass

    if combined_results:
        combined_results.sort(key=lambda x: 0 if 'indore' in x.get('display_name', '').lower() else (1 if 'madhya pradesh' in x.get('display_name', '').lower() else 2))
        return Response(combined_results[:8])

    # Fallback to Photon API
    for query_str in queries_to_try:
        try:
            url = f"https://photon.komoot.io/api/?q={urllib.parse.quote(query_str)}&limit=5"
            req = urllib.request.Request(url, headers={'User-Agent': 'CiviFix-SmartCity/1.0'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                for f in data.get('features', []):
                    props = f.get('properties', {})
                    coords = f.get('geometry', {}).get('coordinates', [0, 0])
                    name = props.get('name') or props.get('street') or q
                    city = props.get('city') or props.get('state') or ''
                    display = f"{name}, {city}".strip(', ')
                    if display not in seen_names:
                        seen_names.add(display)
                        combined_results.append({
                            'display_name': display,
                            'lat': str(coords[1]),
                            'lon': str(coords[0]),
                        })
        except Exception:
            pass

    return Response(combined_results[:8])

@api_view(['GET'])
@permission_classes([AllowAny])
def email_logs(request):
    complaint_id = request.query_params.get('complaint_id')
    qs = EmailLog.objects.all().order_by('-created_at')
    if complaint_id:
        qs = qs.filter(complaint_id=complaint_id)
    recipient = request.query_params.get('recipient')
    if recipient:
        qs = qs.filter(recipient__icontains=recipient)
    return Response(EmailLogSerializer(qs[:50], many=True).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def geocode_reverse(request):
    import urllib.request, json
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon') or request.query_params.get('lng')
    if not lat or not lon:
        return Response({'display_name': 'Unknown Location'})
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'CiviFix-SmartCity/1.0 (admin@civifix.local)'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and data.get('display_name'):
                return Response(data)
    except Exception:
        pass

    # Fallback to Photon Reverse
    try:
        url = f"https://photon.komoot.io/reverse?lat={lat}&lon={lon}"
        req = urllib.request.Request(url, headers={'User-Agent': 'CiviFix-SmartCity/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            features = data.get('features', [])
            if features:
                props = features[0].get('properties', {})
                name = props.get('name') or props.get('street') or 'Selected Location'
                city = props.get('city') or props.get('state') or ''
                return Response({'display_name': f"{name}, {city}".strip(', ')})
    except Exception:
        pass

    try:
        lat_f, lon_f = float(lat), float(lon)
        return Response({'display_name': f"Location ({lat_f:.4f}, {lon_f:.4f})"})
    except Exception:
        return Response({'display_name': 'Selected Location'})
