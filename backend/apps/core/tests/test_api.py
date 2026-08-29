from django.contrib.gis.geos import Point
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from apps.core.models import User, Complaint, InfrastructureAsset

class ComplaintAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='citizen_test', password='testpass123', role='CITIZEN')
        self.worker = User.objects.create_user(username='worker_test', password='testpass123', role='FIELD_WORKER')
        self.admin = User.objects.create_user(username='admin_test', password='testpass123', role='CITY_ADMIN')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.user).access_token))

    def test_create_complaint(self):
        r = self.client.post('/api/v1/complaints/', {
            'title': 'Broken streetlight',
            'description': 'Light is not working',
            'category': 'STREETLIGHT',
            'location': {'type': 'Point', 'coordinates': [75.86, 22.72]}
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Complaint.objects.count(), 1)
        self.assertEqual(r.data['code'].startswith('CF-'), True)

    def test_citizen_default_list_filters_to_own(self):
        other = User.objects.create_user(username='other_citizen', password='testpass123', role='CITIZEN')
        Complaint.objects.create(code='CF-X1', citizen=other, title='x1', description='x1', category='OTHER', location=Point(75.8, 22.7, srid=4326))
        Complaint.objects.create(code='CF-X2', citizen=self.user, title='x2', description='x2', category='OTHER', location=Point(75.8, 22.7, srid=4326))
        
        # Default citizen list only shows own complaints
        r = self.client.get('/api/v1/complaints/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['code'], 'CF-X2')

        # With all=true, citizen can browse public complaints
        r_all = self.client.get('/api/v1/complaints/?all=true')
        self.assertEqual(r_all.status_code, 200)
        self.assertEqual(len(r_all.data), 2)

    def test_comment_lifecycle(self):
        c = Complaint.objects.create(code='CF-COMM', citizen=self.user, title='Test', description='Desc', category='OTHER', location=Point(75.8, 22.7, srid=4326))
        # Post comment
        r_post = self.client.post(f'/api/v1/complaints/{c.id}/comment/', {'body': 'Checking on this issue'}, format='json')
        self.assertEqual(r_post.status_code, 201)
        self.assertEqual(r_post.data['body'], 'Checking on this issue')

        # Get comments
        r_get = self.client.get(f'/api/v1/complaints/{c.id}/comment/')
        self.assertEqual(r_get.status_code, 200)
        self.assertEqual(len(r_get.data), 1)

    def test_ai_classify_endpoint(self):
        r = self.client.post('/api/v1/ai/classify/', {
            'title': 'Deep pothole on asphalt road',
            'description': 'Danger of accident near hospital'
        }, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('category', r.data)
        self.assertIn('suggested_priority', r.data)
        self.assertIn('priority_score', r.data)

    def test_worker_resolve_action(self):
        c = Complaint.objects.create(code='CF-RES', citizen=self.user, title='Leak', description='Leak', category='WATER', location=Point(75.8, 22.7, srid=4326), status='IN_PROGRESS')
        # Login as field worker
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.worker).access_token))
        r = self.client.post(f'/api/v1/complaints/{c.id}/resolve/', {'notes': 'Repaired pipe fitting'}, format='multipart')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['status'], 'RESOLVED')
        c.refresh_from_db()
        self.assertEqual(c.status, 'RESOLVED')
        self.assertIsNotNone(c.resolution_evidence)
        self.assertEqual(c.resolution_evidence.notes, 'Repaired pipe fitting')
