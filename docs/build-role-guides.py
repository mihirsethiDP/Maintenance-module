# -*- coding: utf-8 -*-
"""DigitalPaani Maintenance Ops - role-specific guides (two PDFs).

Builds:
  DigitalPaani-Maintenance-Ops-Engineer-Guide.pdf   (field engineers, phone-first)
  DigitalPaani-Maintenance-Ops-Admin-Guide.pdf      (administrators / Amit)

Run:  python docs/build-role-guides.py
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, Image, KeepTogether,
                                NextPageTemplate, PageBreak)

NAVY   = colors.HexColor('#193458')
NAVY_D = colors.HexColor('#132846')
TINT   = colors.HexColor('#f1f4f9')
TINT_B = colors.HexColor('#dde4ee')
SLATE  = colors.HexColor('#334155')
MUTED  = colors.HexColor('#64748b')
LINE   = colors.HexColor('#e2e8f0')

LOGO = os.path.join('D:', os.sep, 'Maintenance Mode', 'logo.png')
OUTDIR = os.path.join('D:', os.sep, 'Maintenance Mode', 'docs')
os.makedirs(OUTDIR, exist_ok=True)

PW, PH = A4
M = 18 * mm
SITE = 'mihirsethidp.github.io/Maintenance-module'


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


def make_header_footer(doc_label):
    def header_footer(canv, doc):
        canv.saveState()
        canv.setFillColor(NAVY)
        canv.rect(0, PH - 13 * mm, PW, 13 * mm, stroke=0, fill=1)
        canv.setFillColor(colors.white)
        canv.setFont('Helvetica-Bold', 9)
        canv.drawString(M, PH - 8.8 * mm, 'DigitalPaani  |  Maintenance Ops')
        canv.setFont('Helvetica', 8)
        canv.drawRightString(PW - M, PH - 8.8 * mm, doc_label)
        canv.setStrokeColor(LINE)
        canv.setLineWidth(0.5)
        canv.line(M, 13 * mm, PW - M, 13 * mm)
        canv.setFillColor(MUTED)
        canv.setFont('Helvetica', 8)
        canv.drawString(M, 8.6 * mm, SITE)
        canv.drawRightString(PW - M, 8.6 * mm, 'Page %d' % (doc.page - 1))
        canv.restoreState()
    return header_footer


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


def cover(title, subtitle, what, contents):
    F = [Spacer(1, 26 * mm)]
    if os.path.exists(LOGO):
        F.append(Image(LOGO, width=78 * mm, height=78 * mm * 283.0 / 743.0))
    F.append(Spacer(1, 16 * mm))
    F.append(Paragraph(title, st_cov1))
    F.append(Paragraph(subtitle, st_cov2))
    F.append(Spacer(1, 10 * mm))
    F.append(callout('What is this tool?', what))
    F.append(Spacer(1, 8 * mm))
    F.append(table(['In this guide', 'What you will find'], contents, [42 * mm, None]))
    F.append(Spacer(1, 12 * mm))
    F.append(Paragraph('Open the tool at <b>' + SITE + '</b> on your phone or computer. '
                       'Install it from the browser menu so it opens like an app, even without signal.', st_small))
    F.append(NextPageTemplate('main'))
    F.append(PageBreak())
    return F


def build(out_name, doc_label, F):
    out = os.path.join(OUTDIR, out_name)
    doc = BaseDocTemplate(out, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=M, bottomMargin=M,
                          title='DigitalPaani Maintenance Ops - ' + doc_label, author='DigitalPaani',
                          subject='How to use the Maintenance Ops tool')
    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[Frame(M, M, PW - 2 * M, PH - 2 * M, id='cover')], onPage=cover_bg),
        PageTemplate(id='main', frames=[Frame(M, 16 * mm, PW - 2 * M, PH - 16 * mm - 17 * mm, id='main')],
                     onPage=make_header_footer(doc_label)),
    ])
    doc.build(F)
    print('WROTE ' + out)


PHONE_INSTALL = table(['Your phone', 'How to install the app'],
    [['iPhone', 'Open the site in <b>Safari</b>, tap the <b>Share</b> button (square with an arrow), '
                'then <b>Add to Home Screen</b>. A "Maintenance" icon appears like any other app.'],
     ['Android', 'Open the site in <b>Chrome</b>, tap the <b>three-dot menu</b>, then '
                 '<b>Add to Home screen</b> (or <b>Install app</b>).']],
    [24 * mm, None])

OFFLINE = callout('No signal at the plant?',
    'The app still opens and shows everything from your last sync - equipment, tasks, full history - '
    'with an amber banner telling you how old the data is. Browsing works offline; saving needs a '
    'connection. If a save fails mid-blip, your entries stay in the form: reconnect and press the '
    'button again.')

PHONE_LAYOUT = Paragraph('On a phone, every list shows as a stack of <b>cards</b>: the equipment name comes '
    'first, its details underneath, and the action button at the bottom of the card. Filters sit in neat '
    'pairs above the list. Nothing scrolls sideways.', st_body)


# ======================================================================
# ENGINEER GUIDE
# ======================================================================
E = []
E += cover('Field Engineer Guide',
           'Your phone is the tool - here is your day in it',
           'It shows you what maintenance is due at your plants, records the work you do, and turns your '
           'completed jobs into signed visit reports - all from your phone.',
           [['Getting set up', 'Signing in, installing the app on your phone, what you can see.'],
            ['Your daily flow', 'Pick up a task, do the work, close it out, report a breakdown.'],
            ['Visit reports', 'Turning a day of completed work into a signed PDF.'],
            ['Quick reference', 'A cheat sheet and answers to common questions.']])

E += section('1. Getting set up', 'Five minutes, once.')

E.append(Paragraph('Signing in', st_h2))
E.append(steps([
    'You will receive an <b>email invitation</b>. Open it and choose your own password.',
    'After that, sign in at <b>' + SITE + '</b> with your email and password.',
    'Forgot the password? Type your email on the sign-in screen and press <b>Forgot password?</b> - '
    'a reset link arrives by email.',
]))

E.append(Paragraph('Install it on your phone', st_h2))
E.append(PHONE_INSTALL)
E.append(Spacer(1, 4))
E.append(PHONE_LAYOUT)
E.append(Spacer(1, 3))
E.append(OFFLINE)

E.append(Paragraph('What you can see', st_h2))
E.append(Paragraph('You see three tabs - <b>Equipment</b>, <b>Maintenance Log</b> and <b>Engineering '
    'Corner</b> - covering the plants assigned to you. If a plant or machine is missing, it has not been '
    'assigned to you yet: ask your administrator.', st_body))
E.append(Spacer(1, 3))
E.append(Paragraph('The <b>bell</b> at the top right is your to-do list: overdue work and jobs due today. '
    'Every notification is a link - tap it and you land on that exact equipment.', st_body))

E += section('2. Your daily flow', 'Everything starts in the Engineering Corner.')

E.append(Paragraph('The Engineering Corner', st_h2))
E.append(table(['Tab', 'What it shows'],
    [['Pending', '<b>Scheduled tasks ready to start</b> (created automatically from the maintenance plan), '
                 '<b>ongoing work</b> you have already started, and anything <b>overdue</b>.'],
     ['Upcoming PPM', 'Planned maintenance for the next 30 days, so you can plan your visits.'],
     ['Visit Reports', 'Everything you completed, grouped by day, ready to become a signed report.']],
    [30 * mm, None]))

E.append(Paragraph('Doing a scheduled job', st_h2))
E.append(steps([
    'Open <b>Engineering Corner</b>, stay on the <b>Pending</b> tab, and find the equipment.',
    'If the work takes a while: press <b>Start Work</b> so everyone can see the machine is being worked '
    'on, do the job, then press <b>Mark Complete</b>.',
    'If you did the job on the spot: press <b>Complete now</b> instead - it records the start and the '
    'finish in one go.',
]))
E.append(Spacer(1, 3))
E.append(Paragraph('The form does the boring parts for you: your name is already filled in as the '
    'technician (change it if someone else did the work - new names are remembered and suggested next '
    'time), and dates start at today.', st_small))

E.append(Paragraph('Closing out a job', st_h3))
E.append(bullets([
    '<b>Service guide</b> - a collapsed reference list of the usual service steps for that equipment '
    'type. Open it if you want a reminder; there is nothing to tick.',
    '<b>Completion notes</b> - optional for scheduled work: tap a ready-made phrase ("No abnormalities", '
    '"Tested OK") or write your own. For breakdowns, notes are required.',
    'Press <b>Confirm</b>, or <b>Confirm &amp; Generate Service Report</b> for a signed PDF of this '
    'single job straight away.',
]))

E.append(Paragraph('Reporting a breakdown', st_h2))
E.append(steps([
    'Find the equipment. Quickest in the plant: <b>scan the QR sticker</b> on the machine with your '
    'phone camera - it opens that exact equipment.',
    'Press <b>Put in Maintenance</b> and set <b>Reason</b> to <b>Breakdown</b>.',
    'Set the priority and the expected completion date.',
    'Describe what happened - required for breakdowns, because it is the story the next person needs.',
    'Press <b>Confirm</b>. The machine is flagged as broken down and your administrator is alerted.',
]))

E.append(Paragraph('Replacing a valve or NRV', st_h2))
E.append(Paragraph('Valves are replaced, not repaired. Open the valve and press <b>Replace Valve</b> '
    '(or <b>Replace NRV</b>), then enter the new valve\'s tag and details. The old valve is retired but '
    'its full history is kept, and the new one takes over the same position.', st_body))

E += section('3. Visit reports', 'A day of work becomes a signed PDF in four taps.')
E.append(steps([
    'Go to <b>Engineering Corner</b>, then the <b>Visit Reports</b> tab.',
    'Pick a date range with the quick filters (Today, Last 7 days, and so on).',
    'Find your visit day and press <b>Generate Report</b> - the report window opens already set to that day.',
    'Enter who prepared and who approved the work, then <b>Preview</b> or <b>Download</b>. On a phone '
    'the PDF opens in your phone\'s own viewer or share sheet.',
]))

E.append(PageBreak())
E += section('4. Quick reference', 'The short version - worth saving to your phone.')

E.append(Paragraph('I want to...', st_h2))
E.append(table(['Task', 'Where to go'],
    [['Start a scheduled job', 'Engineering Corner, Pending tab, then <b>Start Work</b>'],
     ['Record a job done on the spot', '<b>Complete now</b> next to the task - one step'],
     ['Finish a started job', '<b>Mark Complete</b> on the task, or <b>Mark Operational</b> on the equipment'],
     ['Report a breakdown', 'Scan the QR sticker, then <b>Put in Maintenance</b>, reason <b>Breakdown</b>'],
     ['Replace a valve', 'Open the valve, then <b>Replace Valve</b>'],
     ['See what is coming up', 'Engineering Corner, <b>Upcoming PPM</b> tab'],
     ['Produce a visit report', 'Engineering Corner, <b>Visit Reports</b>, then <b>Generate Report</b>'],
     ['Look up a machine\'s history', 'Tap its name anywhere - the equipment page lists every job ever done']],
    [52 * mm, None]))

E.append(Paragraph('Common questions', st_h2))
for q, a in [
    ('Why can I not see a plant or machine?',
     'You only see the plants assigned to you. Ask your administrator to assign the plant.'),
    ('It says the equipment already has an open work-order.',
     'Somebody already started a job on that machine. Finish that one before starting another.'),
    ('The breakdown form will not submit.',
     'For breakdowns, describing what happened is required. For scheduled work, notes are optional.'),
    ('Can I use it without internet?',
     'Yes, for looking things up - the app opens with everything from your last sync and a banner '
     'showing how old the data is. Saving a job needs a connection; your entries stay in the form '
     'while you retry.'),
    ('I did the work but forgot to record it.',
     'Record it the same way when you remember - the completion date is editable, so the record can '
     'show the day the work was actually done.'),
]:
    E.append(KeepTogether([Paragraph(q, st_h3), Paragraph(a, st_body)]))

E.append(Spacer(1, 6))
E.append(callout('Need help?', 'Contact your administrator for anything to do with access, plants and '
                 'equipment. The tool improves regularly; small on-screen differences from this guide '
                 'are normal.'))

build('DigitalPaani-Maintenance-Ops-Engineer-Guide.pdf', 'Engineer Guide', E)


# ======================================================================
# ADMIN GUIDE
# ======================================================================
A = []
A += cover('Administrator Guide',
           'Running the fleet: setup, team, records and reports',
           'It keeps track of every pump, blower, valve and other equipment across your plants, tells '
           'everyone what maintenance is due, records what work was done, and turns that into sign-off '
           'reports you can share with clients.',
           [['Getting started', 'Signing in, roles, notifications and the daily email summary.'],
            ['Your daily overview', 'The Dashboard: fleet status at a glance, and what is out of service.'],
            ['Setting things up', 'Plants, equipment, PPM imports, QR stickers, checklists.'],
            ['Your team', 'Inviting engineers, assigning plants, schedules, deactivation.'],
            ['Records and reports', 'The maintenance log, filters, sign-off reports, exports.'],
            ['Quick reference', 'A cheat sheet and answers to common questions.']])

A += section('1. Getting started', 'Access, roles, and how the tool keeps you informed.')

A.append(Paragraph('Signing in', st_h2))
A.append(steps([
    'Open <b>' + SITE + '</b> and sign in with your email and password.',
    'Forgot the password? Type your email on the sign-in screen and press <b>Forgot password?</b>.',
]))
A.append(Spacer(1, 3))
A.append(PHONE_INSTALL)
A.append(Spacer(1, 4))
A.append(PHONE_LAYOUT)
A.append(Spacer(1, 3))
A.append(OFFLINE)

A.append(Paragraph('Roles', st_h2))
A.append(table(['Role', 'What they can do'],
    [['Engineer', 'See <b>Equipment</b>, <b>Maintenance Log</b> and <b>Engineering Corner</b> for the '
                  'plants assigned to them. Start and complete maintenance, report breakdowns, generate '
                  'visit reports.'],
     ['Admin', 'Everything an engineer can do, across <b>all</b> plants, plus the <b>Dashboard</b>, '
               '<b>Plants</b> and <b>Team</b> tabs: add equipment and plants, import schedules, invite '
               'engineers, assign plants.'],
     ['Superadmin', 'Everything an admin can do, and is the only role that can make someone an Admin '
                    'or remove one.']],
    [26 * mm, None]))

A.append(Paragraph('How the tool keeps you informed', st_h2))
A.append(bullets([
    '<b>The bell</b> (top right) - overdue work, jobs due today, and recent activity such as breakdowns '
    'and completions. Every notification is a link to the exact equipment.',
    '<b>The daily email summary</b> - one email each morning around 7:00 listing what is overdue, due '
    'today and scheduled across your plants. On a day with nothing outstanding, no email is sent.',
    '<b>Breakdown alerts</b> - emailed the moment a machine is reported broken down.',
]))
A.append(Spacer(1, 3))
A.append(Paragraph('Both email types can be switched on or off per person: <b>Team &rarr; Edit</b> on '
    'that person. An engineer\'s emails only cover the plants assigned to them.', st_small))

A += section('2. Your daily overview', 'The Dashboard answers "is anything wrong?" in one look.')
A.append(Paragraph('The four cards at the top count all equipment, and how much is operational, in '
    'maintenance, or broken down. <b>Tap any card</b> to open the Equipment list already filtered to '
    'that status. Below them, <b>Currently out of service</b> lists every machine that is down, with '
    'the reason, who is on it, and whether it is running late.', st_body))
A.append(Spacer(1, 3))
A.append(callout('How "overdue" is counted',
    'Overdue starts from the day a machine entered the tool - a freshly imported plant starts with a '
    'clean slate rather than a fabricated backlog of dates that passed before the tool knew the '
    'machine existed.'))

A += section('3. Setting things up', 'Plants first, then equipment - or both at once with an import.')

A.append(Paragraph('Plants', st_h2))
A.append(bullets([
    '<b>Add Plant</b> - create a new site, then add its equipment.',
    '<b>Import PPM</b> - upload a planned maintenance spreadsheet to load a whole site\'s equipment and '
    'schedule at once. You see a preview first, imported machines are named from their make and model, '
    'and the tool warns you if the same file looks like it was imported before.',
    '<b>QR Codes</b> - a printable sheet of QR stickers for every machine at that plant. Print, cut, '
    'stick them on the equipment: engineers scan them to open the right machine instantly.',
    '<b>PPM Checklists</b> - edit the service-guide steps engineers see when they close a job on each '
    'equipment type.',
]))

A.append(Paragraph('Adding a single machine', st_h2))
A.append(steps([
    'Go to <b>Equipment</b> and press <b>Add Equipment</b>.',
    'Enter the make, model, type and plant - the equipment\'s <b>name is written for you</b> from '
    'Make + Model (a #2 is added if the same model already exists at that plant).',
    'Save. The machine appears on the list, ready for maintenance records.',
]))

A += section('4. Your team', 'People, access, and their work schedules.')
A.append(Paragraph('The <b>Team</b> tab lists everyone with access. For each person:', st_body))
A.append(bullets([
    '<b>Invite User</b> - send an email invitation. They set their own password and join with the role '
    'you chose.',
    '<b>Assign plants</b> - choose which sites an engineer can see. <b>An engineer with no plants '
    'assigned sees nothing</b> - this is the first thing to do after they join, and their email '
    'summaries stay empty until it is done.',
    '<b>Edit</b> - update someone\'s name, phone number and <b>email notification settings</b> (daily '
    'summary and breakdown alerts, per person). Include the country code on phone numbers, for example '
    '+919000010000.',
    '<b>Generate Schedule</b> - a PDF of an engineer\'s upcoming and outstanding work for a day, week, '
    'month or custom range, with the plant named on every line - send it to them at the start of the '
    'period.',
    '<b>Deactivate</b> - switch someone\'s access off. Reversible: their records stay, and Reactivate '
    'restores them. Only the Superadmin can deactivate an Admin.',
]))
A.append(Spacer(1, 3))
A.append(Paragraph('Below the users sits the <b>Technicians</b> list: every field technician ever named '
    'on a work-order, with how many jobs they have on record. New names typed on a job are added '
    'automatically and suggested next time; removing one never changes past records.', st_body))

A += section('5. Records and reports', 'Everything ever recorded, and the documents it becomes.')
A.append(Paragraph('The <b>Maintenance Log</b> holds every job. Filter by plant, equipment type, reason, '
    'status, technician, date range, or the search box that suggests real names as you type. One '
    '<b>Report</b> button covers every sign-off document, with three scopes:', st_body))
A.append(bullets([
    '<b>Current filters</b> - a report over exactly what the log is showing right now.',
    '<b>All equipment</b> - everything you have access to.',
    '<b>Single visit</b> - one day\'s completed work grouped by plant; the same report engineers reach '
    'from Visit Reports.',
]))
A.append(Spacer(1, 3))
A.append(Paragraph('<b>Export</b> downloads the log as Excel or PDF, and each equipment page has its own '
    'Export for just that machine\'s history.', st_body))

A.append(PageBreak())
A += section('6. Quick reference', 'The short version - worth printing and pinning up.')

A.append(Paragraph('I want to...', st_h2))
A.append(table(['Task', 'Where to go'],
    [['See fleet status at a glance', '<b>Dashboard</b> - tap a card to open that list'],
     ['Add a machine', 'Equipment, then <b>Add Equipment</b>'],
     ['Load a whole plant at once', 'Plants, then <b>Import PPM</b>'],
     ['Print QR stickers', 'Plants, then <b>QR Codes</b>'],
     ['Edit service-guide steps', 'Plants, then <b>PPM Checklists</b>'],
     ['Invite an engineer', 'Team, then <b>Invite User</b>'],
     ['Give an engineer access to a site', 'Team, then <b>Assign plants</b>'],
     ['Send an engineer their week\'s work', 'Team, then <b>Generate Schedule</b>'],
     ['Turn someone\'s emails on or off', 'Team, then <b>Edit</b> on that person'],
     ['Remove someone\'s access', 'Team, then <b>Deactivate</b>'],
     ['Export records or reports', 'Maintenance Log, then <b>Export</b> or <b>Report</b>']],
    [58 * mm, None]))

A.append(Paragraph('Common questions', st_h2))
for q, a in [
    ('An engineer says they cannot see their plant.',
     'Open Team and press Assign plants on their row - an engineer with no plants assigned sees nothing.'),
    ('Why did no summary email arrive this morning?',
     'On a day with nothing overdue, due or scheduled, no email is sent - silence means all clear. '
     'Emails also only cover plants the person can see.'),
    ('A machine shows overdue but we only just added it.',
     'Overdue only counts from the day the machine entered the tool, so this should not happen - if it '
     'does, check whether the maintenance date on the imported schedule was already in the past.'),
    ('Can I undo a deactivation?',
     'Yes - Deactivate is reversible. The person\'s records stay, and Reactivate restores their access.'),
    ('Does anything get sent to the customer automatically?',
     'No. Reports are generated as PDFs for you to check and share yourself.'),
    ('I have heard about health scores and parts lists. Where are they?',
     'They exist, switched off for a simpler tool. Everything recorded today feeds them - if they are '
     'switched on later, your history counts from day one.'),
]:
    A.append(KeepTogether([Paragraph(q, st_h3), Paragraph(a, st_body)]))

A.append(Spacer(1, 6))
A.append(callout('Need help?', 'Contact Mihir Sethi for anything to do with accounts, email notifications '
                 'or the tool itself. The tool improves regularly; small on-screen differences from this '
                 'guide are normal.'))

build('DigitalPaani-Maintenance-Ops-Admin-Guide.pdf', 'Administrator Guide', A)
