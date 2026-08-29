import logging
from django.core.mail import send_mail
from django.conf import settings
from apps.core.models import EmailLog, User

logger = logging.getLogger(__name__)

def dispatch_email(recipient_email, subject, body, complaint=None):
    """
    Core helper to send email and record to EmailLog database.
    """
    if not recipient_email:
        return None
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        log = EmailLog.objects.create(
            recipient=recipient_email,
            subject=subject,
            body=body,
            complaint=complaint,
            status='SENT'
        )
        print(f"[CIVIFIX EMAIL DISPATCHED] -> {recipient_email} | Subject: {subject}")
        return log
    except Exception as e:
        logger.error(f"Email failed to {recipient_email}: {str(e)}")
        log = EmailLog.objects.create(
            recipient=recipient_email,
            subject=subject,
            body=body,
            complaint=complaint,
            status='FAILED',
            error_message=str(e)
        )
        return log

def notify_complaint_registered(complaint):
    """
    Triggered when a complaint is registered:
    1. Sends confirmation email to Citizen with complaint tracking code & details.
    2. Sends dispatch alert email to the Department Officer / Head.
    """
    # 1. Citizen Email Notification
    if complaint.citizen and complaint.citizen.email:
        citizen_subject = f"✅ [CiviFix] Complaint Registered: {complaint.code} - {complaint.title}"
        citizen_body = f"""Dear {complaint.citizen.first_name or complaint.citizen.username},

Your civic complaint has been successfully registered on the CiviFix Smart City Platform.

📋 COMPLAINT DETAILS:
- Tracking Code: {complaint.code}
- Title: {complaint.title}
- Category: {complaint.category}
- Priority Level: {complaint.priority} (Score: {complaint.priority_score})
- Assigned Department: {complaint.department.name if complaint.department else 'Municipal Operations'}
- Location: {complaint.address or 'Reported Coordinates'}
- Current Status: {complaint.status}

Our field operations team has been notified. You will receive automatic email updates at each stage as our teams inspect, assign, and resolve your complaint.

Track your issue live on CiviFix:
http://localhost:3000

Thank you for being an active citizen and helping keep our city clean and safe!

Best regards,
CiviFix Smart City Administration
"""
        dispatch_email(complaint.citizen.email, citizen_subject, citizen_body, complaint)

    # 2. Department Email Notification
    dept_email = None
    if complaint.department and complaint.department.head and complaint.department.head.email:
        dept_email = complaint.department.head.email
    else:
        # Fallback to active Department Officer
        officer = User.objects.filter(role=User.Role.DEPARTMENT_OFFICER).first()
        if officer and officer.email:
            dept_email = officer.email

    if dept_email:
        dept_subject = f"🚨 [New Incident Alert] {complaint.code} - {complaint.title}"
        dept_body = f"""ATTN: Department Operations,

A new civic complaint has been filed and routed to {complaint.department.name if complaint.department else 'Operations'} for immediate dispatch.

INCIDENT DETAILS:
- Incident Code: {complaint.code}
- Priority: {complaint.priority} (Score: {complaint.priority_score})
- Category: {complaint.category}
- Reported By: {complaint.citizen.first_name} {complaint.citizen.last_name} ({complaint.citizen.email} | {complaint.citizen.phone or 'No phone'})
- Address: {complaint.address or 'GPS Coordinates'}

Description:
{complaint.description}

Please log in to the Department Portal to assign field personnel and verify SLA deadlines:
http://localhost:3000

--
CiviFix Automated Municipal Dispatch
"""
        dispatch_email(dept_email, dept_subject, dept_body, complaint)

def notify_status_update(complaint, old_status, new_status, reason="", actor=None):
    """
    Triggered when complaint progresses across its lifecycle:
    (e.g., UNDER_REVIEW, VERIFIED, ASSIGNED, IN_PROGRESS, RESOLVED, COMMUNITY_VERIFIED, CLOSED, REOPENED)
    Sends status update email to Citizen.
    """
    if not complaint.citizen or not complaint.citizen.email:
        return

    actor_info = f"{actor.first_name} {actor.last_name} ({actor.role})" if actor else "Operations Desk"

    status_descriptions = {
        'UNDER_REVIEW': 'Your complaint is now under review by our department verification team.',
        'VERIFIED': 'A municipal field inspector has verified the issue on ground.',
        'ASSIGNED': 'A specialized field worker has been assigned to execute the repair.',
        'IN_PROGRESS': 'Field personnel have arrived at the location and repair work is underway.',
        'RESOLVED': 'The issue has been marked RESOLVED! The field worker has submitted photographic proof of completion.',
        'COMMUNITY_VERIFIED': 'Local residents have verified and confirmed that the issue was properly repaired.',
        'REOPENED': 'The complaint has been reopened for follow-up maintenance.',
        'CLOSED': 'The complaint resolution has been finalized and closed.',
    }

    step_info = status_descriptions.get(new_status, f"The complaint has transitioned to {new_status}.")

    subject = f"📢 [CiviFix Update] Complaint {complaint.code} is now {new_status}"
    body = f"""Dear {complaint.citizen.first_name or complaint.citizen.username},

We are writing to update you on the progress of your civic complaint.

STATUS UPDATE:
- Complaint Code: {complaint.code}
- Title: {complaint.title}
- Previous Status: {old_status}
- New Status: {new_status}
- Action Taken By: {actor_info}
- Update Notes: {reason or step_info}

What happens next:
{step_info}

View live progress, inspector comments, and resolution photos:
http://localhost:3000

Thank you,
CiviFix Smart City Administration
"""
    dispatch_email(complaint.citizen.email, subject, body, complaint)

def notify_worker_assigned(complaint, worker, assigned_by=None):
    """
    Sends email to Field Worker when assigned a work order.
    """
    if not worker or not worker.email:
        return

    assigner = f"{assigned_by.first_name} {assigned_by.last_name}" if assigned_by else "Department Officer"

    subject = f"🛠️ [Work Order Dispatched] Task {complaint.code}: {complaint.title}"
    body = f"""Hello {worker.first_name or worker.username},

You have been assigned a new civic repair work order by {assigner}.

TASK DETAILS:
- Task Code: {complaint.code}
- Title: {complaint.title}
- Category: {complaint.category}
- Priority: {complaint.priority}
- Location: {complaint.address or 'GPS Coordinates'}

Description:
{complaint.description}

Please navigate to the site, complete the repair, and upload Before & After proof photos on CiviFix:
http://localhost:3000

--
CiviFix Field Workforce Management
"""
    dispatch_email(worker.email, subject, body, complaint)
