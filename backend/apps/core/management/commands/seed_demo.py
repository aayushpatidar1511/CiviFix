from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone
from apps.core.models import *
from apps.core.services.logic import set_sla

class Command(BaseCommand):
    help = 'Seed realistic demo data for CiviFix platform'

    def handle(self, *args, **kwargs):
        pw = 'CiviFix@2026'
        users = {}
        user_data = [
            ('aayush_patidar', 'aayush.admin@civifix.local', 'CITY_ADMIN', 'Aayush', 'Patidar', '+91-98765-43210'),
            ('aayushpatidar', 'aayushpatidar@civifix.local', 'CITY_ADMIN', 'Aayush', 'Patidar', '+91-98765-43210'),
            ('admin', 'admin@civifix.local', 'CITY_ADMIN', 'Aayush', 'Patidar', '+91-98765-43210'),
            ('department_user', 'department.user@civifix.local', 'DEPARTMENT_OFFICER', 'Department', 'User', '+91-98765-43211'),
            ('officer', 'officer@civifix.local', 'DEPARTMENT_OFFICER', 'Department', 'User', '+91-98765-43211'),
            ('worker', 'worker@civifix.local', 'FIELD_WORKER', 'Field', 'Worker', '+91-98765-43212'),
            ('aayush', 'aayush@civifix.local', 'CITIZEN', 'Aayush', 'Patidar', '+91-98765-43213'),
            ('citizen', 'citizen@civifix.local', 'CITIZEN', 'Aayush', 'Patidar', '+91-98765-43213'),
        ]

        for username, email, role, fname, lname, phone in user_data:
            u, _ = User.objects.get_or_create(username=username, defaults={'email': email, 'role': role, 'first_name': fname, 'last_name': lname, 'phone': phone})
            u.email = email
            u.role = role
            u.first_name = fname
            u.last_name = lname
            u.phone = phone
            u.set_password(pw)
            u.save()
            users[role] = u

        CitizenProfile.objects.get_or_create(user=users['CITIZEN'], defaults={'address': 'Flat 402, Shivalik Heights, MG Road'})

        departments_data = [
            ('Road & Highway Department', 'ROAD', ['ROAD', 'POTHOLE', 'FOOTPATH']),
            ('Water Supply & Drainage Department', 'WATER', ['WATER', 'DRAINAGE']),
            ('Electrical & Streetlight Department', 'ELEC', ['STREETLIGHT', 'ELECTRICITY']),
            ('Solid Waste & Sanitation Department', 'SAN', ['GARBAGE', 'PUBLIC_TOILET']),
            ('Parks & Urban Amenities Department', 'PARK', ['PARK', 'PUBLIC_BUILDING']),
            ('Traffic & Transport Department', 'TRAFFIC', ['TRAFFIC_SIGNAL', 'PUBLIC_TRANSPORT']),
        ]

        created_deps = {}
        for name, code, cats in departments_data:
            dep, _ = Department.objects.get_or_create(code=code, defaults={'name': name, 'categories': cats, 'head': users['DEPARTMENT_OFFICER']})
            dep.name = name
            dep.categories = cats
            dep.head = users['DEPARTMENT_OFFICER']
            dep.save()
            created_deps[code] = dep

        WorkerProfile.objects.get_or_create(
            user=users['FIELD_WORKER'],
            defaults={'department': created_deps['ROAD'], 'employee_id': 'EMP-FW-802', 'skills': ['Pavement Repair', 'Asphalt Patching', 'Storm Drainage', 'Heavy Equipment'], 'current_location': Point(75.8577, 22.7196, srid=4326)}
        )

        # Seed Infrastructure Assets
        assets_data = [
            ('AST-BRG-101', 'Flyover & Overpass', 'Palasia Flyover Expansion Joint', Point(75.8839, 22.7244, srid=4326), 72.0, 38.0, {'lanes': 4, 'daily_traffic': '85,000 veh/day', 'ward': 'Ward 14'}),
            ('AST-WTR-204', 'Water Distribution Trunk', 'Narmada Phase-3 Main Feeder Line', Point(75.8577, 22.7196, srid=4326), 45.0, 78.5, {'diameter_mm': 1200, 'pressure_bar': 4.2, 'ward': 'Ward 08'}),
            ('AST-ELE-305', 'Substation Transformer', 'Vijay Nagar 33kV Power Station Unit-2', Point(75.8950, 22.7533, srid=4326), 88.0, 18.0, {'capacity_mva': 20, 'cooling': 'Oil Immersion', 'ward': 'Ward 22'}),
            ('AST-DRN-408', 'Stormwater Culvert', 'Old City Main Storm Culvert System', Point(75.8550, 22.7160, srid=4326), 34.0, 84.0, {'length_km': 3.2, 'catchment_ha': 450, 'ward': 'Ward 03'}),
            ('AST-RD-501', 'Arterial Corridor', 'Ring Road Sector-A Pavement', Point(75.9010, 22.7310, srid=4326), 91.0, 12.0, {'surfacing': 'Stone Mastic Asphalt', 'ward': 'Ward 19'}),
            ('AST-SAN-602', 'Waste Transfer Facility', 'Bhanwar Kuan Solid Waste Compact Unit', Point(75.8620, 22.6950, srid=4326), 66.0, 44.0, {'capacity_tpd': 150, 'fleet_assigned': 12, 'ward': 'Ward 28'}),
        ]

        now = timezone.now()
        for asset_id, asset_type, name, loc, health, risk, meta in assets_data:
            meta['name'] = name
            asset, _ = InfrastructureAsset.objects.update_or_create(
                asset_id=asset_id,
                defaults={
                    'asset_type': asset_type,
                    'location': loc,
                    'installation_date': (now - timedelta(days=365 * 6)).date(),
                    'last_inspection': (now - timedelta(days=28)).date(),
                    'last_repair': (now - timedelta(days=95)).date(),
                    'health_score': health,
                    'risk_score': risk,
                    'metadata': meta,
                }
            )
            if asset.inspections.count() == 0:
                InspectionRecord.objects.create(
                    asset=asset,
                    inspected_at=now - timedelta(days=28),
                    health_score=health,
                    notes='Quarterly structural and sensor telemetry audit complete.',
                    inspector=users['DEPARTMENT_OFFICER']
                )
            if asset.maintenance.count() == 0:
                MaintenanceRecord.objects.create(
                    asset=asset,
                    description='Preventative servicing, sealing, and pressure calibration.',
                    performed_at=now - timedelta(days=95),
                    cost=42500.00,
                    worker=users['FIELD_WORKER']
                )
            RiskScore.objects.update_or_create(
                asset=asset,
                defaults={
                    'score': risk,
                    'category': 'HIGH' if risk >= 70 else 'MEDIUM' if risk >= 40 else 'LOW',
                    'reasons': ['Asset operating continuously under high load', 'Telemetry sensor indicates pressure variance'] if risk >= 70 else ['Normal operational variance'],
                    'model_version': 'baseline-v1.2'
                }
            )

        # Seed Complaints
        complaints_data = [
            ('CF-20001', 'Pothole crater causing hazardous traffic slowdown', 'A dangerous 2-foot wide pothole has formed right in front of the metro station exit, damaging vehicles and causing traffic jams.', 'POTHOLE', 'ASSIGNED', 'HIGH', Point(75.8577, 22.7196, srid=4326), 'Opposite Metro Station Gate 2, Lakeview Road', 'ROAD'),
            ('CF-20002', 'High-mast streetlight blackout across intersection', 'The four main street lamps at Palasia Square intersection have been pitch black for 3 nights, posing pedestrian safety risks.', 'STREETLIGHT', 'IN_PROGRESS', 'MEDIUM', Point(75.8839, 22.7244, srid=4326), 'Palasia Square Junction, Near Police Booth', 'ELEC'),
            ('CF-20003', 'Massive water pipeline burst flooding roadway', 'Clean drinking water is gushing out from an underground pipeline fracture, flooding two lanes and reducing water pressure in the colony.', 'WATER', 'ESCALATED', 'CRITICAL', Point(75.8620, 22.7120, srid=4326), 'Sector B Road, Old Rajwada Market', 'WATER'),
            ('CF-20004', 'Commercial garbage dumping on public footpath', 'Bulk restaurant waste bags left uncollected for 4 days near Chhappan Dukan, blocking the walkway and causing foul odor.', 'GARBAGE', 'RESOLVED', 'LOW', Point(75.8900, 22.7280, srid=4326), 'Chhappan Dukan Lane 4, New Palasia', 'SAN'),
            ('CF-20005', 'Open drainage manhole cover missing after heavy rain', 'Uncovered deep stormwater manhole without any warning signs, directly in front of the primary school.', 'DRAINAGE', 'UNDER_REVIEW', 'CRITICAL', Point(75.8680, 22.7350, srid=4326), 'Near Govt. Girls Primary School, Tilak Nagar', 'WATER'),
            ('CF-20006', 'Fallen electrical tree branch resting on power cable', 'High winds caused an overhead tree limb to snap and rest directly on live 11kV distribution cables.', 'ELECTRICITY', 'ASSIGNED', 'HIGH', Point(75.8750, 22.7410, srid=4326), 'Plot 55, Scheme 54, Vijay Nagar', 'ELEC'),
            ('CF-20007', 'Broken tactile paving on pedestrian sidewalk', 'Cracked and missing accessibility tiles along the pedestrian corridor making walking unsafe for visually impaired residents.', 'FOOTPATH', 'REPORTED', 'MEDIUM', Point(75.8520, 22.7150, srid=4326), 'Jawahar Marg Promenade, Central Ward', 'ROAD'),
            ('CF-20008', 'Damaged bus shelter roof leaking during showers', 'The fiberglass canopy of the city transit stop is fractured and water drips continuously onto waiting passengers.', 'PUBLIC_TRANSPORT', 'REPORTED', 'LOW', Point(75.8810, 22.7050, srid=4326), 'BRTS Corridor Station 9, Bhanwar Kuan', 'TRAFFIC'),
        ]

        priority_scores = {'LOW': 25, 'MEDIUM': 50, 'HIGH': 75, 'CRITICAL': 92}
        priority_reasons_map = {
            'CRITICAL': ['Immediate hazard to public safety', 'Sensitive facility or school nearby', 'High structural disruption'],
            'HIGH': ['Active pedestrian & vehicular corridor', 'Multiple citizen reports received', 'Infrastructure disruption'],
            'MEDIUM': ['Civic amenity disruption', 'Standard turnaround window'],
            'LOW': ['Non-hazardous maintenance queue']
        }

        for code, title, desc, cat, st, pri, loc, addr, dep_code in complaints_data:
            dep = created_deps.get(dep_code, created_deps['ROAD'])
            c, created = Complaint.objects.update_or_create(
                code=code,
                defaults={
                    'citizen': users['CITIZEN'],
                    'title': title,
                    'description': desc,
                    'category': cat,
                    'status': st,
                    'priority': pri,
                    'priority_score': priority_scores[pri],
                    'priority_reasons': priority_reasons_map[pri],
                    'location': loc,
                    'address': addr,
                    'department': dep,
                }
            )
            set_sla(c)
            if c.status_history.count() == 0:
                ComplaintStatusHistory.objects.create(complaint=c, actor=users['CITIZEN'], old_status='', new_status='REPORTED', reason='Citizen filed civic report via mobile app')
                if st in ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED']:
                    ComplaintStatusHistory.objects.create(complaint=c, actor=users['DEPARTMENT_OFFICER'], old_status='REPORTED', new_status='ASSIGNED', reason=f'Assigned to field worker {users["FIELD_WORKER"].get_full_name()}')
                if st in ['IN_PROGRESS', 'RESOLVED']:
                    ComplaintStatusHistory.objects.create(complaint=c, actor=users['FIELD_WORKER'], old_status='ASSIGNED', new_status='IN_PROGRESS', reason='Work commenced on site with inspection team')
                if st == 'RESOLVED':
                    ComplaintStatusHistory.objects.create(complaint=c, actor=users['FIELD_WORKER'], old_status='IN_PROGRESS', new_status='RESOLVED', reason='Repairs completed, debris cleared and tested.')
                    c.resolved_at = now - timedelta(hours=4)
                    c.save(update_fields=['resolved_at'])

            if st in ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED']:
                Assignment.objects.update_or_create(
                    complaint=c,
                    defaults={'worker': users['FIELD_WORKER'], 'assigned_by': users['DEPARTMENT_OFFICER']}
                )

            if st == 'RESOLVED':
                ResolutionEvidence.objects.update_or_create(
                    complaint=c,
                    defaults={
                        'worker': users['FIELD_WORKER'],
                        'notes': 'Sanitation truck deployed. Waste cleared, disinfectant applied, and neighborhood dustbins sanitized.',
                        'confidence': 0.98,
                        'captured_at': now - timedelta(hours=4)
                    }
                )
                CommunityVerification.objects.update_or_create(
                    complaint=c,
                    citizen=users['CITIZEN'],
                    defaults={'fixed': True, 'comment': 'Footpath is completely clear now. Great response time!'}
                )

            if c.comments.count() == 0:
                ComplaintComment.objects.create(
                    complaint=c,
                    author=users['CITIZEN'],
                    body='Reported with photo. Please expedite as traffic is heavy during rush hours.'
                )
                if st in ['ASSIGNED', 'IN_PROGRESS']:
                    ComplaintComment.objects.create(
                        complaint=c,
                        author=users['FIELD_WORKER'],
                        body='Our crew has arrived at the location with repair equipment.'
                    )

            IssueSupport.objects.get_or_create(complaint=c, citizen=users['CITIZEN'])

        # Seed Notifications
        Notification.objects.get_or_create(
            user=users['CITY_ADMIN'],
            title='Critical Alert: SLA Breached',
            defaults={'message': 'CF-20003 (Water pipeline burst) has exceeded the 12-hour resolution window and has been escalated.', 'read': False}
        )
        Notification.objects.get_or_create(
            user=users['DEPARTMENT_OFFICER'],
            title='New Priority Issue Filed',
            defaults={'message': 'CF-20005 (Open drainage manhole) reported in Tilak Nagar requires urgent dispatch.', 'read': False}
        )
        Notification.objects.get_or_create(
            user=users['FIELD_WORKER'],
            title='Task Dispatched to You',
            defaults={'message': 'You have been assigned to CF-20001 (Pothole crater on Lakeview Road).', 'read': False}
        )
        Notification.objects.get_or_create(
            user=users['CITIZEN'],
            title='Issue Resolved',
            defaults={'message': 'Your report CF-20004 (Garbage dumping) has been marked as resolved. Please verify the fix.', 'read': False}
        )

        self.stdout.write(self.style.SUCCESS(f'CiviFix demo seeded successfully! Accounts ready with password: {pw}'))
