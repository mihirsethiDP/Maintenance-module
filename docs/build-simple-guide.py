# -*- coding: utf-8 -*-
"""DigitalPaani Maintenance Ops - user how-to guide (PDF)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, Image, KeepTogether,
                                NextPageTemplate, PageBreak, HRFlowable)

NAVY   = colors.HexColor('#193458')
NAVY_D = colors.HexColor('#132846')
TINT   = colors.HexColor('#f1f4f9')
TINT_B = colors.HexColor('#dde4ee')
SLATE  = colors.HexColor('#334155')
MUTED  = colors.HexColor('#64748b')
LINE   = colors.HexColor('#e2e8f0')

LOGO = os.path.join('D:', os.sep, 'Maintenance Mode', 'logo.png')
OUTDIR = os.path.join('D:', os.sep, 'Maintenance Mode', 'docs')
OUT = os.path.join(OUTDIR, 'DigitalPaani-Maintenance-Ops-Simple-Guide.pdf')
os.makedirs(OUTDIR, exist_ok=True)

PW, PH = A4
M = 18 * mm


def S(name, **kw):
    base = dict(fontName='Helvetica', fontSize=9.5, leading=14, textColor=SLATE,
                spaceAfter=4, alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(name, **base)


st_h1    = S('h1', fontName='Helvetica-Bold', fontSize=17, leading=21, textColor=NAVY, spaceAfter=2, spaceBefore=6, keepWithNext=1)
st_h1sub = S('h1sub', fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=10, keepWithNext=1)
st_h2    = S('h2', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=NAVY, spaceBefore=12, spaceAfter=5, keepWithNext=1)
st_h3    = S('h3', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=NAVY_D, spaceBefore=8, spaceAfter=3, keepWithNext=1)
st_body  = S('body')
st_small = S('small', fontSize=8.5, leading=12, textColor=MUTED)
st_step  = S('step', fontSize=9.5, leading=13.5, spaceAfter=3)
st_stepn = S('stepn', fontName='Helvetica-Bold', fontSize=10, leading=13.5, textColor=NAVY, alignment=1)
st_cell  = S('cell', fontSize=8.8, leading=12, spaceAfter=0)
st_cellb = S('cellb', fontName='Helvetica-Bold', fontSize=8.8, leading=12, textColor=NAVY, spaceAfter=0)
st_cellh = S('cellh', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.white, spaceAfter=0)
st_tip   = S('tip', fontSize=9, leading=13, textColor=NAVY_D, spaceAfter=0)
st_cov1  = S('cov1', fontName='Helvetica-Bold', fontSize=27, leading=32, textColor=NAVY, spaceAfter=6)
st_cov2  = S('cov2', fontSize=12.5, leading=18, textColor=MUTED, spaceAfter=4)


def header_footer(canv, doc):
    canv.saveState()
    canv.setFillColor(NAVY)
    canv.rect(0, PH - 13 * mm, PW, 13 * mm, stroke=0, fill=1)
    canv.setFillColor(colors.white)
    canv.setFont('Helvetica-Bold', 9)
    canv.drawString(M, PH - 8.8 * mm, 'DigitalPaani  |  Maintenance Ops')
    canv.setFont('Helvetica', 8)
    canv.drawRightString(PW - M, PH - 8.8 * mm, 'User Guide')
    canv.setStrokeColor(LINE)
    canv.setLineWidth(0.5)
    canv.line(M, 13 * mm, PW - M, 13 * mm)
    canv.setFillColor(MUTED)
    canv.setFont('Helvetica', 8)
    canv.drawString(M, 8.6 * mm, 'mihirsethidp.github.io/Maintenance-module')
    canv.drawRightString(PW - M, 8.6 * mm, 'Page %d' % (doc.page - 1))
    canv.restoreState()


def cover_bg(canv, doc):
    canv.saveState()
    canv.setFillColor(NAVY)
    canv.rect(0, PH - 6 * mm, PW, 6 * mm, stroke=0, fill=1)
    canv.rect(0, 0, PW, 6 * mm, stroke=0, fill=1)
    canv.restoreState()


def steps(items):
    rows = []
    for i, txt in enumerate(items):
        rows.append([Paragraph(str(i + 1) + '.', st_stepn), Paragraph(txt, st_step)])
    t = Table(rows, colWidths=[8 * mm, None])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return t


def bullets(items):
    rows = []
    for txt in items:
        rows.append([Paragraph('&bull;', st_body), Paragraph(txt, st_body)])
    t = Table(rows, colWidths=[4.5 * mm, None])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    return t


def callout(title, text):
    t = Table([[Paragraph('<b>' + title + '</b>&nbsp; ' + text, st_tip)]],
              colWidths=[PW - 2 * M - 8 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), TINT),
        ('BOX', (0, 0), (-1, -1), 0.6, TINT_B),
        ('LINEBEFORE', (0, 0), (0, -1), 2.2, NAVY),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def table(header, rows, widths):
    data = [[Paragraph(h, st_cellh) for h in header]]
    for r in rows:
        data.append([Paragraph(c, st_cellb if i == 0 else st_cell) for i, c in enumerate(r)])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TINT]),
        ('GRID', (0, 0), (-1, -1), 0.4, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return KeepTogether(t) if len(rows) <= 8 else t


def section(title, sub):
    # Rule is a top border on the heading cell, so it cannot separate from the title.
    t = Table([[[Paragraph(title, st_h1), Paragraph(sub, st_h1sub)]]],
              colWidths=[PW - 2 * M])
    t.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1.1, NAVY),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return [Spacer(1, 8), KeepTogether(t)]


F = []

# ---------------- COVER ----------------
F.append(Spacer(1, 26 * mm))
if os.path.exists(LOGO):
    F.append(Image(LOGO, width=78 * mm, height=78 * mm * 283.0 / 743.0))
F.append(Spacer(1, 16 * mm))
F.append(Paragraph('Maintenance Ops', st_cov1))
F.append(Paragraph('The simple guide - keeping clean maintenance records', st_cov2))
F.append(Spacer(1, 10 * mm))
F.append(callout('What is this tool?',
                 'It keeps track of every pump, blower, valve and other equipment across your plants, tells you '
                 'what maintenance is due, records what work was done, and turns that into sign-off reports you '
                 'can share with clients.'))
F.append(Spacer(1, 8 * mm))
F.append(table(['In this guide', 'What you will find'],
               [['Getting started', 'Signing in, what your role can see, notifications, using it on a phone.'],
                ['For engineers', 'Your daily flow: pick up a task, do the work, close it out, report a breakdown.'],
                ['For administrators', 'Equipment, plants, imports, team, reports.'],
                ['Quick reference', 'A one-page cheat sheet and answers to common questions.']],
               [42 * mm, None]))
F.append(Spacer(1, 12 * mm))
F.append(Paragraph('Open the tool at <b>mihirsethidp.github.io/Maintenance-module</b> in any browser on a '
                   'computer or phone - and install it on your phone from the browser menu so it opens '
                   'like an app, even without signal.', st_small))
F.append(NextPageTemplate('main'))
F.append(PageBreak())

# ---------------- 1. GETTING STARTED ----------------
F += section('1. Getting started', 'Everyone starts here, whatever your role.')

F.append(Paragraph('Signing in', st_h2))
F.append(steps([
    'Open <b>mihirsethidp.github.io/Maintenance-module</b> in your browser.',
    'Enter the email address and password you were given, then press <b>Sign in</b>.',
    'If you were invited by email, click the link in that invitation first and choose your own password.',
]))
F.append(Spacer(1, 3))
F.append(callout('Forgot your password?',
                 'Type your email on the sign-in screen, then press <b>Forgot password?</b> just below the '
                 'Sign in button. A reset link arrives by email and brings you straight back to choose a '
                 'new password.'))

F.append(Paragraph('What you can see depends on your role', st_h2))
F.append(table(['Role', 'What you can do'],
               [['Engineer',
                 'See <b>Equipment</b>, <b>Maintenance Log</b> and <b>Engineering Corner</b> for the plants '
                 'assigned to you. Start and complete maintenance, report breakdowns, generate visit reports.'],
                ['Admin',
                 'Everything an engineer can do, across <b>all</b> plants, plus the <b>Dashboard</b>, '
                 '<b>Plants</b> and <b>Team</b> tabs: add equipment and plants, import schedules, invite '
                 'engineers, assign plants.'],
                ['Superadmin',
                 'Everything an admin can do, and is the only role that can make someone an Admin or remove one.']],
               [26 * mm, None]))
F.append(Spacer(1, 4))
F.append(Paragraph('If you are an engineer and cannot find a plant or a piece of equipment, it simply means it '
                   'has not been assigned to you. Ask your administrator.', st_small))

F.append(Paragraph('The notification bell', st_h2))
F.append(Paragraph('The bell at the top right is your to-do list. A red number means there is something that '
                   'needs attention. Click it to see:', st_body))
F.append(bullets([
    '<b>Overdue</b> - work that should already have been done.',
    '<b>Due today</b> - scheduled jobs ready to start today.',
    '<b>Recent activity</b> - breakdowns and completed jobs (administrators only).',
]))
F.append(Spacer(1, 3))
F.append(Paragraph('Every notification is a link: tap it and you land on that exact equipment. Use the plant '
                   'dropdown and the time buttons at the top to narrow the list, and <b>Mark all read</b> to '
                   'clear the red badge.', st_body))

F.append(Paragraph('Finding things', st_h2))
F.append(Paragraph('Every list page has a search box that <b>suggests real names as you type</b> - equipment, '
                   'makes, models, plants, people - so you never have to guess a spelling. Pick a suggestion '
                   'or keep typing; the list filters as you go.', st_body))

F.append(Paragraph('Using it on your phone', st_h2))
F.append(Paragraph('The tool is built for phones, which is how most engineers will use it in the plant. Open '
                   'the site in your phone browser and choose <b>Add to Home screen</b> (or "Install app"): '
                   'you get a proper app icon and it opens full screen. Tables slide sideways with your '
                   'finger; the action buttons stay visible on the right while you slide.', st_body))
F.append(Spacer(1, 3))
F.append(callout('No signal at the plant?',
                 'The app still opens and shows everything from your last sync - equipment, tasks, full '
                 'history - with an amber banner telling you how old the data is. Browsing works offline; '
                 'saving needs a connection. If a save fails mid-blip, your entries stay in the form: '
                 'reconnect and press the button again.'))

# ---------------- 2. ENGINEERS ----------------
F += section('2. For engineers', 'Your day-to-day: what needs doing, and how to record what you did.')

F.append(Paragraph('Start in the Engineering Corner', st_h2))
F.append(Paragraph('This is your workspace. It has three tabs:', st_body))
F.append(table(['Tab', 'What it shows'],
               [['Pending',
                 '<b>Scheduled tasks ready to start</b> (created automatically from the maintenance plan), '
                 '<b>ongoing maintenance</b> you have already started, and <b>overdue</b> work.'],
                ['Upcoming PPM', 'Planned maintenance coming up in the next 30 days, so you can plan your visit.'],
                ['Visit Reports', 'Everything you completed, grouped by day, ready to turn into a signed report.']],
               [30 * mm, None]))

F.append(Paragraph('Doing a scheduled job', st_h2))
F.append(steps([
    'Go to <b>Engineering Corner</b> and stay on the <b>Pending</b> tab.',
    'Find the equipment under "Scheduled tasks ready to start". If the work will take a while, press '
    '<b>Start Work</b> so everyone can see the machine is being worked on. If you did the job on the spot, '
    'press <b>Complete now</b> instead - it records the start and the finish in one go.',
    'Do the physical work on the machine.',
    'Close it out: press <b>Mark Complete</b> (or open the equipment and press <b>Mark Operational</b>).',
]))
F.append(Spacer(1, 3))
F.append(Paragraph('The form does the boring parts for you: your name is already filled in as the technician '
                   '(change it if someone else did the work - new names are remembered and suggested next '
                   'time), and the expected completion date starts at today.', st_small))

F.append(Paragraph('Closing out a job', st_h3))
F.append(bullets([
    '<b>Service guide</b> - a collapsed reference list of the usual service steps for that equipment type. '
    'Open it if you want a reminder; there is nothing to tick.',
    '<b>Completion notes</b> - optional for scheduled work: tap one of the ready-made phrases ("No '
    'abnormalities", "Tested OK") or write your own. For breakdowns, notes are required.',
]))
F.append(Spacer(1, 3))
F.append(Paragraph('Then press <b>Confirm</b>, or <b>Confirm &amp; Generate Service Report</b> if you want a '
                   'signed PDF for this single job straight away.', st_body))

F.append(Paragraph('Reporting a breakdown', st_h2))
F.append(steps([
    'Find the equipment. The quickest way in the plant is to <b>scan the QR sticker</b> on the machine with '
    'your phone camera - it opens that exact equipment.',
    'Press <b>Put in Maintenance</b> and set <b>Reason</b> to <b>Breakdown</b>.',
    'Set the priority and expected completion date.',
    'Describe what happened - for breakdowns this is required, because it is the story the next person needs.',
    'Press <b>Confirm</b>. The equipment is now flagged as broken down and your administrator is notified.',
]))

F.append(Paragraph('Replacing a valve or NRV', st_h2))
F.append(Paragraph('Valves are replaced, not repaired. Open the valve and press <b>Replace Valve</b> (or '
                   '<b>Replace NRV</b>), then enter the new valve\'s tag and details. The old valve is retired '
                   'but its full history is kept, and the new one takes over the same position.', st_body))

F.append(Paragraph('Producing a visit report', st_h2))
F.append(steps([
    'Go to <b>Engineering Corner</b> then the <b>Visit Reports</b> tab.',
    'Pick a date range using the quick filters (Today, Last 7 days, and so on).',
    'Find your visit day and press <b>Generate Report</b> - the report window opens already set to that day.',
    'Enter who prepared and who approved the work, then press <b>Preview</b> or <b>Download</b>. On a phone '
    'the PDF opens in your phone\'s own viewer or share sheet.',
]))

# ---------------- 3. ADMINS ----------------
F += section('3. For administrators', 'Setting up the tool and keeping an eye on the whole fleet.')

F.append(Paragraph('The Dashboard', st_h2))
F.append(Paragraph('Your daily overview. The four cards at the top count all equipment, and how much is '
                   'operational, in maintenance, or broken down. <b>Click any card</b> to open the full '
                   'Equipment list already filtered to that status. The table underneath lists everything '
                   'currently out of service, with the reason, who is on it, and whether it is running late.',
                   st_body))

F.append(Paragraph('Adding equipment', st_h2))
F.append(steps([
    'Go to <b>Equipment</b> and press <b>Add Equipment</b>.',
    'Enter the make, model, type and plant - the equipment\'s <b>name is written for you</b> from Make + '
    'Model (a #2 is added if the same model already exists at that plant).',
    'Save. The new machine appears on the equipment list, ready for maintenance records.',
]))

F.append(Paragraph('Managing plants', st_h2))
F.append(Paragraph('The <b>Plants</b> tab is where you set each site up:', st_body))
F.append(bullets([
    '<b>Add Plant</b> - create a new site, then add its equipment.',
    '<b>Import PPM</b> - upload a planned maintenance spreadsheet to load a whole site\'s equipment and '
    'schedule at once. You see a preview first, imported machines are named from their make and model, and '
    'the tool warns you if the same file looks like it was imported before.',
    '<b>QR Codes</b> - produce a printable sheet of QR stickers for every machine at that plant. Print, cut, '
    'and stick them on the equipment.',
    '<b>PPM Checklists</b> - edit the service guide steps shown to engineers when they close a job on each '
    'equipment type.',
]))

F.append(Paragraph('Managing your team', st_h2))
F.append(Paragraph('The <b>Team</b> tab lists everyone with access. For each person you can:', st_body))
F.append(bullets([
    '<b>Invite User</b> - send an email invitation. They set their own password and join with the role you '
    'chose.',
    '<b>Assign plants</b> - choose which sites an engineer can see. An engineer with no plants assigned sees '
    'nothing, so this is the first thing to do after they join.',
    '<b>Edit</b> - update someone\'s name and phone number. Include the country code on phone numbers (for '
    'example +919000010000), as this will be used for WhatsApp alerts.',
    '<b>Deactivate</b> - switch someone\'s access off (reversible - their records stay, and Reactivate '
    'restores them). Only the Superadmin can deactivate an Admin.',
    '<b>Generate Schedule</b> - produce a PDF of an engineer\'s upcoming and outstanding work for a day, week, '
    'month or custom range, to send them at the start of the period.',
]))
F.append(Spacer(1, 3))
F.append(Paragraph('Below the users sits the <b>Technicians</b> list: every field technician ever named on a '
                   'work-order, with how many jobs they have on record. New names typed on a job are added '
                   'automatically and suggested next time; removing one never changes past records.', st_body))

F.append(Paragraph('Records and reports', st_h2))
F.append(Paragraph('The <b>Maintenance Log</b> holds every job ever recorded. Filter by plant, equipment type, '
                   'reason, status, technician, date range, or the suggesting search box. One <b>Report</b> '
                   'button covers every sign-off document, with three scopes:', st_body))
F.append(bullets([
    '<b>Current filters</b> - a report over exactly what the log is showing right now.',
    '<b>All equipment</b> - everything you have access to.',
    '<b>Single visit</b> - one day\'s completed work grouped by plant; the same report engineers reach from '
    'Visit Reports.',
]))
F.append(Spacer(1, 3))
F.append(Paragraph('<b>Export</b> downloads the log as Excel or PDF, and individual equipment pages have their '
                   'own Export for just that machine\'s history.', st_body))

# ---------------- 4. QUICK REFERENCE ----------------
F.append(PageBreak())
F += section('4. Quick reference', 'The short version - worth printing and pinning up.')

F.append(Paragraph('I want to...', st_h2))
F.append(table(['Task', 'Where to go'],
               [['Start a scheduled job', 'Engineering Corner, Pending tab, then <b>Start Work</b>'],
                ['Record a job done on the spot', 'Press <b>Complete now</b> next to the task - one step'],
                ['Finish a started job', 'Equipment page, then <b>Mark Operational</b>'],
                ['Report a breakdown', 'Scan the QR sticker, or find the equipment, then <b>Put in Maintenance</b>'],
                ['Replace a valve', 'Open the valve, then <b>Replace Valve</b>'],
                ['See what is coming up', 'Engineering Corner, <b>Upcoming PPM</b> tab'],
                ['Produce a visit report', 'Engineering Corner, <b>Visit Reports</b>, then <b>Generate Report</b>'],
                ['Add a machine', 'Equipment, then <b>Add Equipment</b> (administrators)'],
                ['Load a whole plant at once', 'Plants, then <b>Import PPM</b> (administrators)'],
                ['Give an engineer access', 'Team, then <b>Assign plants</b> (administrators)'],
                ['Print QR stickers', 'Plants, then <b>QR Codes</b> (administrators)'],
                ['Export records or reports', 'Maintenance Log, then <b>Export</b> or <b>Report</b>']],
               [52 * mm, None]))

F.append(Paragraph('Common questions', st_h2))
QA = [
    ('Why can I not see a plant or machine?',
     'Engineers only see the plants assigned to them. Ask an administrator to assign it to you.'),
    ('It says the equipment already has an open work-order.',
     'Somebody has already started a job on that machine. Finish that one before starting another.'),
    ('The breakdown form will not submit.',
     'For breakdowns, describing what happened is required - it is the story the next person needs. For '
     'scheduled work, notes are optional.'),
    ('Can I use it without internet?',
     'Yes, for looking things up: the app opens and shows everything from your last sync, with a banner '
     'showing how old the data is. Saving a job needs a connection - your entries stay in the form while '
     'you retry.'),
    ('Does anything get sent to the customer automatically?',
     'No. Reports are generated as PDFs for you to check and share yourself.'),
    ('I have heard about health scores and parts lists. Where are they?',
     'They exist, switched off for a simpler tool. Everything you record today feeds them - if they are '
     'switched on later, your history counts from day one.'),
]
for q, a in QA:
    F.append(KeepTogether([Paragraph(q, st_h3), Paragraph(a, st_body)]))

F.append(Spacer(1, 6))
F.append(callout('Need help?',
                 'Contact your administrator, or Amit Gosain for anything to do with access, plants and '
                 'equipment set-up. The tool improves regularly; small on-screen differences from this '
                 'guide are normal.'))

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=M, bottomMargin=M,
                      title='DigitalPaani Maintenance Ops - Simple Guide', author='DigitalPaani',
                      subject='How to use the Maintenance Ops tool')
doc.addPageTemplates([
    PageTemplate(id='cover', frames=[Frame(M, M, PW - 2 * M, PH - 2 * M, id='cover')], onPage=cover_bg),
    PageTemplate(id='main', frames=[Frame(M, 16 * mm, PW - 2 * M, PH - 16 * mm - 17 * mm, id='main')],
                 onPage=header_footer),
])
doc.build(F)
print('WROTE ' + OUT)
