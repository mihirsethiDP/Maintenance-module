# -*- coding: utf-8 -*-
"""DigitalPaani Maintenance Ops - role-specific guides (three PDFs).

Builds:
  DigitalPaani-Maintenance-Ops-Technician-Guide.pdf  (field technicians, phone-first)
  DigitalPaani-Maintenance-Ops-Engineer-Guide.pdf    (service engineers)
  DigitalPaani-Maintenance-Ops-Admin-Guide.pdf       (administrators / Amit)

Covers the full field-service build: technician logins and My Work, assignment,
photos and the review loop, issues, holds, work-order numbers, co-signed
service reports, and the Oversight page. Every button name is written exactly
as it appears in app.js.

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
    rows = [[Paragraph(str(i + 1) + '.', st_stepn), Paragraph(t, st_step)] for i, t in enumerate(items)]
    t = Table(rows, colWidths=[8 * mm, None])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return t


def bullets(items):
    rows = [[Paragraph('&bull;', st_body), Paragraph(t, st_body)] for t in items]
    t = Table(rows, colWidths=[4.5 * mm, None])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    return t


def callout(title, text):
    t = Table([[Paragraph('<b>' + title + '</b>&nbsp; ' + text, st_tip)]],
              colWidths=[PW - 2 * M - 8 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), TINT),
        ('BOX', (0, 0), (-1, -1), 0.6, TINT_B),
        ('LINEBEFORE', (0, 0), (0, -1), 2.2, NAVY),
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
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
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return KeepTogether(t) if len(rows) <= 8 else t


def section(title, sub):
    t = Table([[[Paragraph(title, st_h1), Paragraph(sub, st_h1sub)]]], colWidths=[PW - 2 * M])
    t.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1.1, NAVY),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
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
    'The app still opens and shows everything from your last sync, with an amber banner telling you '
    'how old the data is. Browsing works offline; saving needs a connection. If a save fails mid-blip, '
    'your entries stay in the form: reconnect and press the button again.')

WO_NUMBER = Paragraph('Every job created since late August carries a <b>number like WO-2026-0147</b>. '
    'It shows on the job, in the log, and on service reports — use it when you talk about a job on '
    'the phone. Older jobs from before numbering have none.', st_body)


# ======================================================================
# TECHNICIAN GUIDE
# ======================================================================
T = []
T += cover('Technician Guide',
           'Your jobs, your photos, your sign-off',
           'It tells you which machines to work on, keeps a record of what you did with photos, and '
           'creates the service report that your engineer and the client sign.',
           [['Getting started', 'Signing in and putting the app on your phone.'],
            ['My Work', 'Your jobs: open, completed, and reports.'],
            ['Doing a job', 'Start, work, photos, and closing it.'],
            ['Found a problem?', 'Telling your engineer about a part that needs attention.'],
            ['The service report', 'Getting your engineer and the client to sign.'],
            ['Quick reference', 'One page to keep on your phone.']])

T += section('1. Getting started', 'Do this once.')
T.append(Paragraph('Signing in', st_h2))
T.append(steps([
    'You get an <b>email invitation</b>. Open it and choose your own password.',
    'After that, go to <b>' + SITE + '</b>, type your email and password, and press <b>Sign in</b>.',
    'Forgot your password? Type your email on the sign-in screen and press <b>Forgot password?</b>. '
    'A new link comes to your email.',
]))
T.append(Paragraph('Put the app on your phone', st_h2))
T.append(PHONE_INSTALL)
T.append(Spacer(1, 4))
T.append(Paragraph('You will see <b>My Work</b> when you sign in. That is your home screen — every job '
                   'you have to do is there.', st_body))
T.append(Spacer(1, 3))
T.append(OFFLINE)
T.append(Spacer(1, 3))
T.append(callout('You can visit any plant',
                 'You are not tied to one site. You can look up <b>any</b> plant and any machine in the '
                 'tool — useful when you are sent somewhere new. You can only start and close the jobs '
                 'that are given to you.'))

T += section('2. My Work', 'Three tabs. Everything you need is in them.')
T.append(table(['Tab', 'What is in it'],
    [['Open', 'Jobs waiting for you. Also any job your engineer sent back for a fix — those show a '
              'red <b>Returned</b> label and his note.'],
     ['Completed', 'Jobs you finished. <b>Awaiting review</b> means your engineer has not looked at it '
                   'yet. <b>Completed</b> means he approved it.'],
     ['Reports', 'One line for each day you worked at a plant. This is where the service report is '
                 'made and signed.']],
    [26 * mm, None]))
T.append(Spacer(1, 4))
T.append(Paragraph('The <b>bell</b> at the top shows a red number when something needs you — a new job, '
                   'or a job sent back. Tap it to go straight there.', st_body))
T.append(Spacer(1, 3))
T.append(Paragraph('If a job shows <b>"Check back &lt;date&gt;"</b>, your engineer has put it on hold — '
                   'usually waiting for a part. Nothing for you to do until then.', st_body))
T.append(Spacer(1, 3))
T.append(WO_NUMBER)

T += section('3. Doing a job', 'Start it, do it, close it.')
T.append(steps([
    'Open <b>My Work</b>. Find the machine in the <b>Open</b> tab.',
    'Press <b>Start Work</b>. Now everyone can see you are working on that machine.',
    'Do the work on the machine.',
    'Press <b>Mark Complete</b>. Fill in the form and press <b>Confirm</b>.',
]))
T.append(Spacer(1, 3))
T.append(Paragraph('Small job, finished in a few minutes? Press <b>Complete now</b> instead of Start Work. '
                   'It records the start and the finish together.', st_small))
T.append(Paragraph('The closing form', st_h3))
T.append(bullets([
    '<b>Service guide</b> — tap to open it if you want a reminder of the usual steps for that machine. '
    'Nothing to tick.',
    '<b>Photos</b> — press <b>Add photos</b> and use your camera. If the job says photos are needed, '
    'you cannot close it without at least one. Breakdowns always need photos.',
    '<b>Completion notes</b> — tap a ready-made phrase ("No abnormalities", "Tested OK") or type your '
    'own. For a breakdown you must describe what happened.',
]))
T.append(Spacer(1, 3))
T.append(callout('What photos to take',
                 'The machine before you start, the part you worked on, and the machine working again at '
                 'the end. Also photograph the nameplate if the make or model is not in the tool. Up to 8 '
                 'photos per job — they go into the report the client sees.'))
T.append(Paragraph('If your engineer sends a job back', st_h2))
T.append(Paragraph('It appears at the top of your <b>Open</b> tab with a red <b>Returned</b> label and his '
                   'note — for example "add a photo of the new seal". The machine stays in service; only '
                   'the record needs fixing.', st_body))
T.append(Spacer(1, 3))
T.append(steps([
    'Read his note.',
    'Press <b>Fix &amp; resubmit</b>.',
    'Change the notes, add the photos he asked for, and press <b>Resubmit for review</b>.',
]))

T += section('4. Found a problem?', 'Tell your engineer. He decides what happens next.')
T.append(Paragraph('If you see a part that needs <b>servicing</b>, <b>repair</b>, or <b>replacement</b> — '
                   'even on a machine you were not sent for — report it. Two ways:', st_body))
T.append(bullets([
    '<b>While closing a job:</b> in the closing form, open <b>"Found something needing attention?"</b>, '
    'write what is wrong, and choose repair, servicing or replacement.',
    '<b>Any other time:</b> open the machine (scan its <b>QR sticker</b> with your camera — fastest) '
    'and press <b>Report issue</b>.',
]))
T.append(Spacer(1, 3))
T.append(Paragraph('Your engineer sees it straight away. He will schedule the work, mark it as already '
                   'handled, or explain why nothing is needed. What you report also appears in the service '
                   'report, so the client knows what you found.', st_body))
T.append(Spacer(1, 3))
T.append(callout('Do not wait to be asked',
                 'A weeping seal or a noisy bearing you report today is a small job. The same part left '
                 'alone is a breakdown next month. Reporting it takes twenty seconds and it is on record '
                 'that you found it.'))

T += section('5. The service report', 'Your work, signed by three people.')
T.append(Paragraph('At the end of a visit, the tool puts together a report of everything you did at that '
                   'plant that day — the jobs, your notes, your photos, and the problems you reported. '
                   'Three people sign it, in this order:', st_body))
T.append(Spacer(1, 3))
T.append(table(['Who signs', 'How'],
    [['1. You', 'Go to <b>My Work → Reports</b>, find the day, press <b>Create &amp; sign</b>. '
                'Pressing it signs the report as you and sends it to your engineer.'],
     ['2. Your engineer', 'He checks it and signs. If something is missing he sends it back — the line '
                          'turns <b>Needs changes</b> with his note. Fix it and submit again.'],
     ['3. The client', 'When the line says <b>Ready for client signature</b>, press '
                       '<b>Client sign-off</b> and hand your phone to the client. They sign on the '
                       'screen with a finger and type their name and job title.']],
    [30 * mm, None]))
T.append(Spacer(1, 4))
T.append(callout('Sometimes your engineer makes the report for you',
                 'If he approves your last job of the day, he can prepare and sign the report himself. '
                 'Then your Reports tab shows <b>"Report prepared by your engineer"</b> and only one thing '
                 'is left: press <b>Client sign-off</b> and hand the client your phone.'))
T.append(Spacer(1, 3))
T.append(Paragraph('The line <b>"Waiting on review"</b> means a job from that day is still with your '
                   'engineer — the report can only be made once every job is approved.', st_body))
T.append(Spacer(1, 3))
T.append(Paragraph('After the client signs, the report is <b>locked</b>. Nobody can change it — not you, '
                   'not your engineer. That is what makes it proof of the work.', st_body))
T.append(Spacer(1, 3))
T.append(callout('Client not there?',
                 'Leave it. The line stays at <b>Ready for client signature</b> and you can collect it on '
                 'your next visit. Your engineer has already signed, so the work is recorded either way.'))

T.append(PageBreak())
T += section('6. Quick reference', 'Keep this page on your phone.')
T.append(Paragraph('I want to...', st_h2))
T.append(table(['I want to', 'Where'],
    [['See my jobs', '<b>My Work</b> → Open'],
     ['Start a job', '<b>Start Work</b> on the job'],
     ['Finish a small job in one step', '<b>Complete now</b>'],
     ['Close a job I started', '<b>Mark Complete</b>'],
     ['Add photos', '<b>Add photos</b> in the closing form'],
     ['Report a bad part', '<b>Report issue</b> on the machine, or in the closing form'],
     ['Find a machine fast', 'Scan its <b>QR sticker</b> with your phone camera'],
     ['Fix a job sent back to me', '<b>Fix &amp; resubmit</b> on the red Returned job'],
     ['Make the service report', '<b>My Work</b> → Reports → <b>Create &amp; sign</b>'],
     ['Get the client to sign', '<b>Client sign-off</b> — hand them the phone'],
     ['See a machine\'s past work', 'Tap the machine name anywhere']],
    [58 * mm, None]))
T.append(Paragraph('Questions', st_h2))
for q, a in [
    ('I cannot close the job — it asks for photos.',
     'That job needs at least one photo. Press Add photos and use your camera. Breakdowns always need photos.'),
    ('The job is not in my list.',
     'It has not been given to you yet. Call your engineer — he assigns the work.'),
    ('My job says "Check back" with a date.',
     'Your engineer put it on hold — usually a part is on order. It comes back on that date; nothing for '
     'you to do until then.'),
    ('There is no signal at the plant.',
     'You can still open the app and read everything. Saving needs signal. Do the work, then close the '
     'job when you have signal again — you can change the completion date to the day you actually did it.'),
    ('The client signed but the report looks wrong.',
     'A signed report cannot be changed. Tell your engineer — he will make a correction report.'),
    ('Can I put a machine into maintenance myself?',
     'No. Engineers create the jobs; you do them and close them. If a machine needs work, use Report issue.'),
]:
    T.append(KeepTogether([Paragraph(q, st_h3), Paragraph(a, st_body)]))
T.append(Spacer(1, 6))
T.append(callout('Need help?', 'Call your service engineer. For sign-in problems, contact your '
                 'administrator. The tool is improved often — small differences from this guide are normal.'))

build('DigitalPaani-Maintenance-Ops-Technician-Guide.pdf', 'Technician Guide', T)


# ======================================================================
# ENGINEER GUIDE
# ======================================================================
E = []
E += cover('Service Engineer Guide',
           'Your sites, your team, your sign-off',
           'You own your plants in it: the equipment register, the work orders you assign to '
           'technicians, the review of what they did, the issues they report, and the service reports '
           'you and the client co-sign.',
           [['Getting set up', 'Signing in, the app on your phone, what you own.'],
            ['Running the work', 'Creating work orders, assigning technicians, photos.'],
            ['The review loop', 'Approving, sending back, reassigning, closing as-is.'],
            ['Issues and holds', 'Triaging what technicians find; pausing blocked jobs honestly.'],
            ['Service reports', 'Co-signing, or preparing the report yourself.'],
            ['Quick reference', 'A cheat sheet and answers to common questions.']])

E += section('1. Getting set up', 'Five minutes, once.')
E.append(Paragraph('Signing in', st_h2))
E.append(steps([
    'You will receive an <b>email invitation</b>. Open it and choose your own password.',
    'After that, sign in at <b>' + SITE + '</b> with your email and password.',
    'Forgot the password? Type your email on the sign-in screen and press <b>Forgot password?</b>.',
]))
E.append(Paragraph('Install it on your phone', st_h2))
E.append(PHONE_INSTALL)
E.append(Spacer(1, 4))
E.append(OFFLINE)
E.append(Paragraph('What you own', st_h2))
E.append(Paragraph('You see the plants assigned to you, across four tabs: <b>Equipment</b>, '
                   '<b>Maintenance Log</b>, <b>Engineering Corner</b> and <b>Team</b>. At your plants you '
                   'can <b>add and edit equipment</b> (press <b>Add Equipment</b> — the machine\'s name is '
                   'written for you from Make + Model). On Team you see the technicians and can '
                   '<b>Invite Technician</b> when you take on new field staff.', st_body))
E.append(Spacer(1, 3))
E.append(WO_NUMBER)

E += section('2. Running the work', 'You create the jobs; technicians execute them.')
E.append(Paragraph('Creating and assigning a work order', st_h2))
E.append(steps([
    'Find the machine and press <b>Put in Maintenance</b> (or start from the schedule in Engineering '
    'Corner — PPM jobs create themselves).',
    'Pick the technician in <b>Assign to</b> — the list shows each one\'s current open jobs, so you '
    'don\'t overload someone blind. The job lands in their <b>My Work</b> the moment you save.',
    'Tick <b>Require photos on completion</b> if you want evidence before you approve. '
    '<b>Breakdowns require photos regardless.</b>',
    'No account for the person doing the work? Type any name — the job follows the old flow and '
    'closes without review.',
]))
E.append(Spacer(1, 3))
E.append(callout('A note, not a job?',
                 'If a machine needs attention <b>later</b> but keeps running, do not put it in '
                 'maintenance — use <b>Report issue</b> on the machine instead. Put in Maintenance takes '
                 'it out of service and starts the overdue clock; Report issue just gets it on your list.'))
E.append(Paragraph('Doing a job yourself', st_h2))
E.append(Paragraph('Work you complete yourself closes directly — the review ceremony exists for '
                   'delegation, not for its own sake. Your Visit Reports tab still builds your own '
                   'sign-off PDFs as before.', st_body))

E += section('3. The review loop', 'A technician\'s completed job lands with you before it counts.')
E.append(Paragraph('When a technician completes a job it becomes <b>Awaiting review</b> in the '
                   '<b>To review</b> tab of Engineering Corner. The machine is already back in service — '
                   'your review is about the record, never about holding equipment hostage.', st_body))
E.append(Spacer(1, 3))
E.append(table(['You press', 'What happens'],
    [['Approve', 'The job closes for good.'],
     ['Send back', 'You write what is missing ("add a photo of the replaced seal"). The technician sees '
                   'your note at the top of My Work, fixes the record, and resubmits to you.'],
     ['Reassign', 'Hands an open or stuck job to a different technician — with their open-job counts '
                  'shown. History stays intact.'],
     ['Close as-is', 'On a returned job the technician never resubmitted: accept the record as it stands '
                     'instead of waiting forever.']],
    [26 * mm, None]))
E.append(Spacer(1, 4))
E.append(Paragraph('Each card shows the completion notes and the photos. Look at the photos — they are '
                   'what the client will see in the report.', st_body))

E += section('4. Issues and holds', 'What was found, and what is honestly blocked.')
E.append(Paragraph('Issues: triaging what technicians report', st_h2))
E.append(Paragraph('When anyone reports a part needing service, repair or replacement, it appears in '
                   'your <b>To review</b> tab under <b>Reported issues</b>, and as an amber strip on the '
                   'machine\'s page. Three verdicts:', st_body))
E.append(bullets([
    '<b>Schedule work</b> — opens the work-order form prefilled from the issue and links the job back '
    'to it.',
    '<b>Handled</b> — it was already dealt with; no follow-up needed.',
    '<b>Dismiss</b> — nothing will be done, and you must say why. That reason is the record the next '
    'person reads.',
]))
E.append(Paragraph('Holds: when a job is genuinely blocked', st_h2))
E.append(Paragraph('A job waiting on a vendor, a shutdown window or an approval should not read as '
                   'neglect. On the machine\'s page press <b>Put on hold</b>:', st_body))
E.append(bullets([
    'Say <b>what it is waiting on</b> (vendor / shutdown window / site access / approval) and the details.',
    'Set the <b>Check back on</b> date. This is <b>not</b> a promise the work will be done — you do not '
    'need to know when the vendor delivers, only when you will chase them. Presets: 3 days, a week, '
    '2 weeks, a month.',
    'The job\'s overdue clock pauses until that date. When it passes, the job counts as overdue again '
    'and appears on the admin\'s Oversight page as a passed check-back — so extend it '
    '(<b>Extend hold</b>) or release it (<b>Release hold</b>) before then.',
]))
E.append(Spacer(1, 3))
E.append(callout('Extensions are counted',
                 'A hold extended again and again is visible to your admin as a pattern — that is '
                 'deliberate. A part that has been "on order" five times is an escalation, not a '
                 'maintenance task.'))

E += section('5. Service reports', 'Three signatures make the work official.')
E.append(Paragraph('One report covers everything a technician finished at one plant on one day — jobs, '
                   'notes, photos, and the issues they raised. The signature order is fixed: '
                   '<b>technician → you → the client</b>.', st_body))
E.append(Paragraph('The two ways a report gets made', st_h2))
E.append(table(['Path', 'How it goes'],
    [['Technician raises it', 'They press Create &amp; sign in My Work → Reports. It lands in your '
                              '<b>To review</b> tab under <b>Service reports</b>: press <b>View</b> to '
                              'read it, then <b>Approve &amp; sign</b> — or <b>Request changes</b> with a '
                              'note, and they fix and resubmit.'],
     ['You prepare it', 'When you approve the last job of a visit, the tool offers the report '
                        'immediately — <b>Create &amp; sign report</b>. One press compiles and signs it. '
                        'Any fully-approved visit without a report also waits in <b>Visits ready for a '
                        'report</b>, so nothing is lost if you dismiss the prompt.']],
    [30 * mm, None]))
E.append(Spacer(1, 4))
E.append(Paragraph('Either way, the last step is the client signing <b>on the technician\'s phone</b> at '
                   'the plant. Once they sign, the report locks: no edits, ever — corrections are new '
                   'reports. Every signature is stamped over a fingerprint (hash) of the content, which '
                   'is what makes the PDF proof.', st_body))

E.append(PageBreak())
E += section('6. Quick reference', 'The short version.')
E.append(Paragraph('I want to...', st_h2))
E.append(table(['Task', 'Where'],
    [['Create a job for a technician', 'The machine → <b>Put in Maintenance</b> → pick them in <b>Assign to</b>'],
     ['Demand photo evidence', 'Tick <b>Require photos on completion</b> when creating the job'],
     ['Review completed work', 'Engineering Corner → <b>To review</b>'],
     ['Send work back for fixes', '<b>Send back</b> on the card, with a note'],
     ['Hand a job to someone else', '<b>Reassign</b> — on the machine\'s page or the review tab'],
     ['Pause a blocked job honestly', 'The machine → <b>Put on hold</b>, with a check-back date'],
     ['Note a problem for later', 'The machine → <b>Report issue</b> (machine keeps running)'],
     ['Deal with a reported issue', 'To review → <b>Schedule work / Handled / Dismiss</b>'],
     ['Sign a technician\'s report', 'To review → Service reports → <b>Approve &amp; sign</b>'],
     ['Prepare the report yourself', '<b>Create &amp; sign report</b> after approving the last job'],
     ['Add a machine at your plant', 'Equipment → <b>Add Equipment</b>'],
     ['Bring in a new technician', 'Team → <b>Invite Technician</b>']],
    [62 * mm, None]))
E.append(Paragraph('Common questions', st_h2))
for q, a in [
    ('The technician completed the job — why is the machine already "Operational"?',
     'By design. The work is physically done at completion; your review is about the record. A machine '
     'never waits on paperwork.'),
    ('I sent a job back and nothing has happened for days.',
     'It is waiting on the technician. You can Reassign it, or accept the record with Close as-is. Your '
     'admin sees the wait on Oversight either way.'),
    ('A job is blocked on a part with no delivery date.',
     'Put it on hold with a check-back date. You are not promising the part arrives — only that you will '
     'chase it on that date.'),
    ('Can I make the service report without waiting for the technician?',
     'Yes — once every job of the visit is approved. The tool offers it at the moment of the last '
     'approval, and lists it under Visits ready for a report afterwards.'),
    ('Why can\'t I edit a signed report?',
     'The client\'s signature locks it — that is what makes it proof. Corrections are new reports.'),
    ('Who sees the ageing clocks?',
     'Your admin, on the Oversight page: unreviewed work, jobs sent back, untriaged issues, outstanding '
     'signatures, and passed check-backs — each with how long it has waited.'),
]:
    E.append(KeepTogether([Paragraph(q, st_h3), Paragraph(a, st_body)]))
E.append(Spacer(1, 6))
E.append(callout('Need help?', 'Contact your administrator for access and plants. The tool improves '
                 'regularly; small on-screen differences from this guide are normal.'))

build('DigitalPaani-Maintenance-Ops-Engineer-Guide.pdf', 'Engineer Guide', E)


# ======================================================================
# ADMIN GUIDE
# ======================================================================
A = []
A += cover('Administrator Guide',
           'Running the operation: sites, people, accountability',
           'It keeps track of every machine across your plants, drives the work your engineers and '
           'technicians do, records everything with photos and co-signed reports, and shows you who is '
           'holding what up.',
           [['Getting started', 'Access, the three roles, notifications and the daily email.'],
            ['Your daily overview', 'The Dashboard, and the Oversight page that answers "who is late?".'],
            ['How work flows', 'Work orders, review, issues, holds, and signed reports — in one page.'],
            ['Setting things up', 'Plants, equipment, imports, QR stickers.'],
            ['Your team', 'Inviting people, technician accounts, schedules, deactivation.'],
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
A.append(OFFLINE)
A.append(Paragraph('The three roles', st_h2))
A.append(table(['Role', 'What they do'],
    [['Technician', 'Logs in to <b>My Work</b>: executes the jobs assigned to them, closes them with '
                    'photos, reports bad parts, and collects the client\'s signature on reports. Can look '
                    'up any plant; can only act on their own assignments. Cannot create work orders.'],
     ['Engineer', 'Owns their assigned plants: creates and assigns work orders, adds equipment, reviews '
                  'technician work, triages issues, places holds, co-signs service reports, invites '
                  'technicians.'],
     ['Admin', 'Everything, everywhere: all plants, the Dashboard and Oversight pages, imports, the '
               'team, and the same review powers engineers have. Only the Superadmin grants Admin.']],
    [24 * mm, None]))
A.append(Paragraph('How the tool keeps you informed', st_h2))
A.append(bullets([
    '<b>The bell</b> — overdue work, jobs due today, work awaiting review, reported issues, and reports '
    'awaiting signatures. Every notification is a link.',
    '<b>The daily email summary</b> — one email around 7:00 with what is overdue, due and scheduled, '
    'plus a <b>"Waiting on someone"</b> section: the same stuck items Oversight shows, using <b>your</b> '
    'clocks. Days with nothing outstanding send nothing.',
    '<b>Breakdown alerts</b> — emailed the moment a machine is reported broken down.',
]))
A.append(Spacer(1, 3))
A.append(Paragraph('Email on/off is per person: <b>Team → Edit</b>. A person\'s emails only cover plants '
                   'they can see.', st_small))

A += section('2. Your daily overview', 'Two pages answer two questions.')
A.append(Paragraph('Dashboard — "is anything broken?"', st_h2))
A.append(Paragraph('The four cards count the fleet: total, operational, in maintenance, broken down. Tap '
                   'a card to open that list. Below them, everything currently out of service with who is '
                   'on it and whether it is late.', st_body))
A.append(Paragraph('Oversight — "who is holding what up?"', st_h2))
A.append(Paragraph('The accountability page. Top: four counters for things that have waited too long — '
                   'unreviewed work, jobs sent back and untouched, untriaged issues, outstanding client '
                   'signatures, passed check-backs. Middle: the <b>specific stuck items</b>, oldest '
                   'first, each with a link. Bottom: per-engineer and per-technician load, including what '
                   'each technician closed in the last 30 days.', st_body))
A.append(Spacer(1, 3))
A.append(bullets([
    '<b>Adjust the clocks</b> sets how many days each thing may wait before it is flagged — for this '
    'page <b>and for your daily email</b>. They are your clocks; another admin can set different ones.',
    'Jobs <b>on hold</b> are shown separately and do not count as overdue: a hold means an engineer has '
    'named what the job is waiting on and when they will chase it. A hold extended three or more times '
    'is flagged — that is a vendor problem, not a maintenance problem.',
]))

A += section('3. How work flows', 'The whole machine on one page.')
A.append(steps([
    '<b>A job is created</b> — by an engineer, or automatically from the PPM schedule — and assigned to '
    'a technician. It carries a number (WO-2026-0147) and can require photos; breakdowns always do.',
    '<b>The technician does the work</b> and completes it with notes and photos. The machine returns to '
    'service immediately; the record becomes <b>Awaiting review</b>.',
    '<b>The engineer reviews</b> — approves, or sends it back with a note; the technician fixes and '
    'resubmits. Stuck jobs can be reassigned or closed as-is.',
    '<b>Issues</b> found along the way (a part needing service, repair or replacement) go to the '
    'engineer to schedule, mark handled, or dismiss with a reason. Open issues stay pinned to the '
    'machine.',
    '<b>The service report</b> — one per technician per plant per day — is signed in order: technician, '
    'engineer, then the client, drawing on the technician\'s phone. Every signature stamps a fingerprint '
    'of the content, and the client\'s signature <b>locks the report forever</b>. Corrections are new '
    'reports. Engineers can also prepare and sign the report themselves at the moment they approve the '
    'last job of a visit.',
]))
A.append(Spacer(1, 3))
A.append(callout('Why a running machine can be "overdue"',
                 'Overdue clocks measure the record, not the machine. And a job honestly blocked on the '
                 'world — a vendor, a shutdown window — should be <b>on hold</b> with a check-back date, '
                 'which pauses its clock and shows on Oversight as "waiting on vendor" instead of '
                 'looking like neglect.'))

A += section('4. Setting things up', 'Plants first, then equipment — or both at once with an import.')
A.append(bullets([
    '<b>Plants → Add Plant</b> — create a site; <b>Import PPM</b> — load a whole site\'s equipment and '
    'schedule from a spreadsheet, with a preview and duplicate warning.',
    '<b>Plants → QR Codes</b> — printable stickers for every machine; technicians scan them to open the '
    'right machine instantly.',
    '<b>Plants → PPM Checklists</b> — the service-guide steps people see when closing a job.',
    '<b>Equipment → Add Equipment</b> — single machines; the name writes itself from Make + Model. '
    'Engineers can do this too, at their own plants.',
]))

A += section('5. Your team', 'People, access, accountability.')
A.append(bullets([
    '<b>Invite User</b> — you can invite Engineers and Technicians; only the Superadmin grants Admin. '
    'Engineers can invite Technicians themselves.',
    '<b>Assign plants</b> — engineers see only their plants. <b>Technicians need no plants</b> — they '
    'roam; their access comes from the jobs assigned to them.',
    '<b>Edit</b> — name, phone (with country code), and email notification settings per person.',
    '<b>Generate Schedule</b> — a PDF of someone\'s upcoming and outstanding work for any period.',
    '<b>Deactivate</b> — reversible; their records stay. Enforced in the database, not just the screen.',
]))
A.append(Spacer(1, 3))
A.append(Paragraph('Below the users sits the <b>Technicians</b> registry — every field name ever used on '
                   'a job. Inviting a technician whose name is already there links their history to the '
                   'new login automatically.', st_body))

A.append(PageBreak())
A += section('6. Quick reference', 'The short version — worth printing.')
A.append(Paragraph('I want to...', st_h2))
A.append(table(['Task', 'Where'],
    [['See fleet status', '<b>Dashboard</b> — tap a card to open that list'],
     ['See who is holding what up', '<b>Oversight</b>'],
     ['Change what counts as "too long"', 'Oversight → <b>Adjust the clocks</b>'],
     ['Review completed work myself', 'Engineering Corner → <b>To review</b>'],
     ['Load a whole plant at once', 'Plants → <b>Import PPM</b>'],
     ['Print QR stickers', 'Plants → <b>QR Codes</b>'],
     ['Invite an engineer or technician', 'Team → <b>Invite User</b>'],
     ['Give an engineer their sites', 'Team → <b>Assign plants</b>'],
     ['Turn someone\'s emails on or off', 'Team → <b>Edit</b> on that person'],
     ['Remove someone\'s access', 'Team → <b>Deactivate</b>'],
     ['Export records or reports', 'Maintenance Log → <b>Export</b> or <b>Report</b>']],
    [62 * mm, None]))
A.append(Paragraph('Common questions', st_h2))
for q, a in [
    ('An engineer says they cannot see their plant.',
     'Team → Assign plants on their row. (Technicians are different: they see everything and need no '
     'assignment.)'),
    ('Why did no summary email arrive this morning?',
     'Nothing was outstanding — silence means all clear. Emails also use your own Oversight clocks, so '
     'loosening them quiets the "Waiting on someone" section.'),
    ('Oversight says a job has waited 12 days but a part is on order.',
     'The engineer should put it on hold with a check-back date — then it shows as "waiting on vendor" '
     'instead of ageing. If they keep extending the hold, that pattern is flagged too.'),
    ('Can a signed service report be edited or deleted?',
     'No — by anyone, ever. That is what makes it proof. Corrections are issued as new reports.'),
    ('A technician left. What happens to their open jobs?',
     'Reassign them (on the job or in the review tab). Deactivating the account keeps all their history.'),
    ('Does anything get sent to the customer automatically?',
     'No. Reports are generated and signed in the tool; sharing them is your choice. (A push to the '
     'Customer Hub is planned but not built.)'),
    ('I have heard about health scores and parts lists. Where are they?',
     'They exist, switched off for a simpler tool. Everything recorded today feeds them — if they are '
     'switched on later, your history counts from day one.'),
]:
    A.append(KeepTogether([Paragraph(q, st_h3), Paragraph(a, st_body)]))
A.append(Spacer(1, 6))
A.append(callout('Need help?', 'Contact Mihir Sethi for accounts, email notifications or the tool itself. '
                 'The tool improves regularly; small on-screen differences from this guide are normal.'))

build('DigitalPaani-Maintenance-Ops-Admin-Guide.pdf', 'Administrator Guide', A)
