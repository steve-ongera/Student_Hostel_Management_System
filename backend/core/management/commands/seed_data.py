"""
HMS - Hostel Management System
Comprehensive Seed Data Command
Academic Year: 2024-2025

Seeds ALL models:
  User, AcademicYear, Department, Course, Warden, Student,
  Enrollment, Hostel, Room, Bed, BookingApplication,
  MpesaPayment, OccupancyHistory, Notification

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear     (wipes existing data first)
"""

import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction


class Command(BaseCommand):
    help = 'Seed all HMS models with realistic Kenyan data for 2024-2025'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Clear all existing data before seeding'
        )

    def handle(self, *args, **options):
        from core.models import (
            User, AcademicYear, Department, Course, Warden, Student,
            Enrollment, Hostel, Room, Bed, BookingApplication,
            MpesaPayment, OccupancyHistory, Notification
        )

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            Notification.objects.all().delete()
            OccupancyHistory.objects.all().delete()
            MpesaPayment.objects.all().delete()
            BookingApplication.objects.all().delete()
            Bed.objects.all().delete()
            Room.objects.all().delete()
            Hostel.objects.all().delete()
            Enrollment.objects.all().delete()
            Student.objects.all().delete()
            Warden.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            Course.objects.all().delete()
            Department.objects.all().delete()
            AcademicYear.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared.\n'))

        with transaction.atomic():
            ay             = self._seed_academic_years()
            dept_map, course_map = self._seed_departments_courses()
            wardens        = self._seed_wardens()
            hostels        = self._seed_hostels(wardens)
            self._seed_rooms_and_beds(hostels)
            students       = self._seed_students(course_map, ay)
            enrollments    = self._seed_enrollments(students, ay)
            bookings       = self._seed_bookings(students, ay, enrollments)
            self._seed_payments(bookings)
            self._seed_occupancy_history(bookings, ay)
            self._seed_notifications(students, wardens, bookings)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 65))
        self.stdout.write(self.style.SUCCESS('  SEEDING COMPLETE  —  HMS 2024-2025'))
        self.stdout.write(self.style.SUCCESS('=' * 65))
        self._print_summary(students, wardens)

    # ──────────────────────────────────────────────────────────────
    # 1. ACADEMIC YEARS
    # ──────────────────────────────────────────────────────────────
    def _seed_academic_years(self):
        from core.models import AcademicYear
        self.stdout.write('\n[1/9] Academic Years')

        years_data = [
            {
                'name': '2022-2023',
                'start_date': date(2022, 9, 5),
                'end_date': date(2023, 6, 30),
                'is_current': False,
                'application_open': False,
                'application_start': date(2022, 8, 1),
                'application_end': date(2022, 8, 31),
            },
            {
                'name': '2023-2024',
                'start_date': date(2023, 9, 4),
                'end_date': date(2024, 6, 28),
                'is_current': False,
                'application_open': False,
                'application_start': date(2023, 8, 1),
                'application_end': date(2023, 8, 31),
            },
            {
                'name': '2024-2025',
                'start_date': date(2024, 9, 2),
                'end_date': date(2025, 6, 27),
                'is_current': True,
                'application_open': True,
                'application_start': date(2024, 8, 1),
                'application_end': date(2024, 8, 31),
            },
        ]

        current_ay = None
        for yd in years_data:
            ay, created = AcademicYear.objects.get_or_create(
                name=yd['name'], defaults=yd
            )
            flag = ' <- CURRENT' if yd['is_current'] else ''
            self.stdout.write(f'  {"+" if created else "."} {ay.name}{flag}')
            if yd['is_current']:
                current_ay = ay

        return current_ay

    # ──────────────────────────────────────────────────────────────
    # 2. DEPARTMENTS & COURSES
    # ──────────────────────────────────────────────────────────────
    def _seed_departments_courses(self):
        from core.models import Department, Course
        self.stdout.write('\n[2/9] Departments & Courses')

        dept_data = [
            {'name': 'School of Computing and Informatics',  'code': 'SCI'},
            {'name': 'School of Business and Economics',     'code': 'SBE'},
            {'name': 'School of Engineering',                'code': 'SOE'},
            {'name': 'School of Pure and Applied Sciences',  'code': 'SPAS'},
            {'name': 'School of Education',                  'code': 'SEDU'},
            {'name': 'School of Health Sciences',            'code': 'SHS'},
        ]

        course_data = [
            {'code': 'SC211', 'name': 'Bachelor of Science in Computer Science',         'dept': 'SCI',  'years': 4},
            {'code': 'SC212', 'name': 'Bachelor of Science in Information Technology',   'dept': 'SCI',  'years': 4},
            {'code': 'SC213', 'name': 'Bachelor of Science in Software Engineering',     'dept': 'SCI',  'years': 4},
            {'code': 'SC214', 'name': 'Bachelor of Science in Data Science & AI',        'dept': 'SCI',  'years': 4},
            {'code': 'SB301', 'name': 'Bachelor of Commerce (Accounting)',               'dept': 'SBE',  'years': 4},
            {'code': 'SB302', 'name': 'Bachelor of Business Administration',             'dept': 'SBE',  'years': 4},
            {'code': 'SB303', 'name': 'Bachelor of Economics',                           'dept': 'SBE',  'years': 4},
            {'code': 'EN401', 'name': 'Bachelor of Science in Civil Engineering',        'dept': 'SOE',  'years': 5},
            {'code': 'EN402', 'name': 'Bachelor of Science in Electrical Engineering',   'dept': 'SOE',  'years': 5},
            {'code': 'EN403', 'name': 'Bachelor of Science in Mechanical Engineering',   'dept': 'SOE',  'years': 5},
            {'code': 'PS501', 'name': 'Bachelor of Science in Mathematics and Statistics','dept': 'SPAS','years': 4},
            {'code': 'PS502', 'name': 'Bachelor of Science in Chemistry',                'dept': 'SPAS', 'years': 4},
            {'code': 'ED601', 'name': 'Bachelor of Education (Arts)',                    'dept': 'SEDU', 'years': 4},
            {'code': 'ED602', 'name': 'Bachelor of Education (Science)',                 'dept': 'SEDU', 'years': 4},
            {'code': 'HS701', 'name': 'Bachelor of Science in Nursing',                  'dept': 'SHS',  'years': 4},
            {'code': 'HS702', 'name': 'Bachelor of Science in Public Health',            'dept': 'SHS',  'years': 4},
        ]

        dept_map = {}
        for dd in dept_data:
            dept, _ = Department.objects.get_or_create(code=dd['code'], defaults={'name': dd['name']})
            dept_map[dd['code']] = dept
            self.stdout.write(f'  + Dept: {dept.name}')

        course_map = {}
        for cd in course_data:
            course, _ = Course.objects.get_or_create(
                code=cd['code'],
                defaults={
                    'name': cd['name'],
                    'department': dept_map[cd['dept']],
                    'duration_years': cd['years'],
                }
            )
            course_map[cd['code']] = course
            self.stdout.write(f'    + [{cd["code"]}] {cd["name"]}')

        return dept_map, course_map

    # ──────────────────────────────────────────────────────────────
    # 3. WARDENS (4 wardens — 2 male, 2 female)
    # ──────────────────────────────────────────────────────────────
    def _seed_wardens(self):
        from core.models import User, Warden
        self.stdout.write('\n[3/9] Wardens')

        warden_data = [
            {'staff_id': 'W001', 'first_name': 'James',   'last_name': 'Kamau',   'phone': '0722100001', 'email': 'j.kamau@hms.ac.ke'},
            {'staff_id': 'W002', 'first_name': 'Grace',   'last_name': 'Wanjiru', 'phone': '0722100002', 'email': 'g.wanjiru@hms.ac.ke'},
            {'staff_id': 'W003', 'first_name': 'Peter',   'last_name': 'Ochieng', 'phone': '0722100003', 'email': 'p.ochieng@hms.ac.ke'},
            {'staff_id': 'W004', 'first_name': 'Eunice',  'last_name': 'Akinyi',  'phone': '0722100004', 'email': 'e.akinyi@hms.ac.ke'},
        ]

        wardens = []
        for wd in warden_data:
            user, u_created = User.objects.get_or_create(
                username=wd['staff_id'],
                defaults={
                    'role': 'warden', 'is_staff': True,
                    'must_change_password': False, 'email': wd['email'],
                }
            )
            if u_created:
                user.set_password('admin123')
                user.save()

            warden, w_created = Warden.objects.get_or_create(
                staff_id=wd['staff_id'],
                defaults={
                    'user': user,
                    'first_name': wd['first_name'],
                    'last_name': wd['last_name'],
                    'phone': wd['phone'],
                    'email': wd['email'],
                }
            )
            wardens.append(warden)
            self.stdout.write(
                f'  {"+" if w_created else "."} {wd["staff_id"]} — '
                f'{wd["first_name"]} {wd["last_name"]}'
            )

        return wardens

    # ──────────────────────────────────────────────────────────────
    # 4. HOSTELS (3 boys, 3 girls)
    # ──────────────────────────────────────────────────────────────
    def _seed_hostels(self, wardens):
        from core.models import Hostel
        self.stdout.write('\n[4/9] Hostels')

        hostel_data = [
            # ── BOYS ──
            {
                'name': 'Kilimanjaro Boys Hostel', 'code': 'KBH', 'gender': 'M',
                'description': 'Modern 3-storey en-suite hostel for male students with fully equipped kitchen on each floor.',
                'total_floors': 3, 'has_kitchen': True, 'has_toilet': True,
                'monthly_fee': 4500, 'warden_idx': 0, 'bed_cap': 4, 'rooms_per_floor': 8,
            },
            {
                'name': 'Nairobi Boys Hostel', 'code': 'NBH', 'gender': 'M',
                'description': '2-storey budget hostel for male students with shared bathroom and shower facilities.',
                'total_floors': 2, 'has_kitchen': False, 'has_toilet': False,
                'monthly_fee': 3200, 'warden_idx': 2, 'bed_cap': 2, 'rooms_per_floor': 10,
            },
            {
                'name': 'Rift Valley Boys Hostel', 'code': 'RVBH', 'gender': 'M',
                'description': 'Affordable 6-bed shared rooms for male students with communal kitchen and lounge.',
                'total_floors': 2, 'has_kitchen': True, 'has_toilet': False,
                'monthly_fee': 2800, 'warden_idx': 0, 'bed_cap': 6, 'rooms_per_floor': 6,
            },
            # ── GIRLS ──
            {
                'name': 'Mombasa Girls Hostel', 'code': 'MGH', 'gender': 'F',
                'description': 'Premium 3-storey girls hostel with en-suite bathrooms, kitchen and 24-hour security.',
                'total_floors': 3, 'has_kitchen': True, 'has_toilet': True,
                'monthly_fee': 4800, 'warden_idx': 1, 'bed_cap': 4, 'rooms_per_floor': 8,
            },
            {
                'name': 'Nakuru Girls Hostel', 'code': 'NGH', 'gender': 'F',
                'description': '2-storey girls hostel with clean shared facilities and a secure compound.',
                'total_floors': 2, 'has_kitchen': False, 'has_toilet': False,
                'monthly_fee': 3000, 'warden_idx': 3, 'bed_cap': 2, 'rooms_per_floor': 10,
            },
            {
                'name': 'Eldoret Girls Hostel', 'code': 'EGH', 'gender': 'F',
                'description': 'Spacious 6-bed rooms for female students with communal kitchen and study lounge.',
                'total_floors': 2, 'has_kitchen': True, 'has_toilet': False,
                'monthly_fee': 2600, 'warden_idx': 1, 'bed_cap': 6, 'rooms_per_floor': 6,
            },
        ]

        hostels = []
        for hd in hostel_data:
            hostel, created = Hostel.objects.get_or_create(
                code=hd['code'],
                defaults={
                    'name': hd['name'], 'gender': hd['gender'],
                    'description': hd['description'],
                    'total_floors': hd['total_floors'],
                    'has_kitchen': hd['has_kitchen'],
                    'has_toilet': hd['has_toilet'],
                    'is_active': True, 'monthly_fee': hd['monthly_fee'],
                    'warden': wardens[hd['warden_idx']].user,
                }
            )
            hostel._bed_cap        = hd['bed_cap']
            hostel._rooms_per_floor = hd['rooms_per_floor']
            hostels.append(hostel)
            self.stdout.write(
                f'  {"+" if created else "."} [{hd["code"]}] {hd["name"]}  '
                f'({hd["bed_cap"]}-bed rooms | {hd["total_floors"]} floors | KES {hd["monthly_fee"]:,}/sem)'
            )

        return hostels

    # ──────────────────────────────────────────────────────────────
    # 5. ROOMS & BEDS
    # ──────────────────────────────────────────────────────────────
    def _seed_rooms_and_beds(self, hostels):
        from core.models import Room, Bed
        self.stdout.write('\n[5/9] Rooms & Beds')

        for hostel in hostels:
            cap  = hostel._bed_cap
            rpf  = hostel._rooms_per_floor
            bed_labels = list('ABCDEF')[:cap]
            has_suite  = hostel.has_toilet

            r_new = 0
            b_new = 0
            for floor in range(1, hostel.total_floors + 1):
                for rn in range(1, rpf + 1):
                    rnum = f'{floor}{rn:02d}'
                    rtype = 'ensuite' if has_suite else ('standard' if cap <= 4 else 'shared')
                    room, rc = Room.objects.get_or_create(
                        hostel=hostel, room_number=rnum,
                        defaults={
                            'floor': floor, 'room_type': rtype, 'capacity': cap,
                            'has_toilet': has_suite, 'has_kitchen': hostel.has_kitchen,
                            'is_active': True, 'notes': f'Floor {floor}, Room {rn}',
                        }
                    )
                    if rc:
                        r_new += 1
                    for bl in bed_labels:
                        _, bc = Bed.objects.get_or_create(
                            room=room, bed_number=bl,
                            defaults={'status': 'available'}
                        )
                        if bc:
                            b_new += 1

            total_rooms = hostel.total_floors * rpf
            total_beds  = total_rooms * cap
            self.stdout.write(
                f'  + {hostel.code}: {total_rooms} rooms, {total_beds} beds'
                f'  ({hostel.total_floors} floors x {rpf} rooms x {cap} beds)'
            )

    # ──────────────────────────────────────────────────────────────
    # 6. STUDENTS  (60 students — ~30 boys, ~30 girls)
    # ──────────────────────────────────────────────────────────────
    def _seed_students(self, course_map, current_ay):
        from core.models import User, Student
        self.stdout.write('\n[6/9] Students')

        # ── Real Kenyan name pools ──────────────────────────────
        male_first = [
            'Brian',    'Kevin',    'Dennis',   'Edwin',    'Felix',
            'George',   'Henry',    'Ian',      'John',     'Kenneth',
            'Laban',    'Martin',   'Nathan',   'Oscar',    'Paul',
            'Raymond',  'Samuel',   'Timothy',  'Victor',   'Walter',
            'Aaron',    'Caleb',    'David',    'Emmanuel', 'Francis',
            'Gilbert',  'Hassan',   'Isaac',    'Joseph',   'Kelvin',
        ]
        female_first = [
            'Alice',    'Betty',    'Carol',    'Diana',    'Esther',
            'Faith',    'Grace',    'Hannah',   'Irene',    'Jackline',
            'Ketty',    'Lilian',   'Mary',     'Nancy',    'Olive',
            'Pauline',  'Queen',    'Rose',     'Sandra',   'Tabitha',
            'Violet',   'Wambui',   'Aisha',    'Brenda',   'Cynthia',
            'Deborah',  'Eunice',   'Florence', 'Gladys',   'Hilda',
        ]
        male_middle = [
            'Mwangi',   'Kamau',    'Ochieng',  'Otieno',   'Kipchoge',
            'Mutua',    'Kimani',   'Waweru',   'Kariuki',  'Njoroge',
            'Omondi',   'Barasa',   'Chesire',  'Kirui',    'Rono',
        ]
        female_middle = [
            'Wanjiru',  'Achieng',  'Akinyi',   'Wambua',   'Muthoni',
            'Wangari',  'Kemunto',  'Adhiambo', 'Anyango',  'Awuor',
            'Bosibori', 'Chebet',   'Jelimo',   'Kerubo',   'Moraa',
        ]
        surnames = [
            'Kamau',    'Wanjiku',  'Ochieng',  'Otieno',   'Kipchoge',
            'Mutua',    'Kimani',   'Waweru',   'Kariuki',  'Njoroge',
            'Omondi',   'Auma',     'Barasa',   'Chesire',  'Kirui',
            'Mwangi',   'Nyambura', 'Adhiambo', 'Rotich',   'Koech',
            'Cheruiyot','Rono',     'Bett',     'Sigei',    'Langat',
            'Njenga',   'Muriithi', 'Gitau',    'Macharia', 'Ngugi',
            'Odinga',   'Owino',    'Okello',   'Ogola',    'Onyango',
            'Aoko',     'Wekesa',   'Masinde',  'Kiptoo',   'Saitoti',
            'Hassan',   'Ali',      'Omar',     'Said',     'Farah',
            'Mwenda',   'Muthama',  'Kyalo',    'Muli',     'Ndeto',
            'Mutiso',   'Musyoki',  'Kavila',   'Nzioki',   'Kioko',
            'Njeru',    'Gicheru',  'Gitonga',  'Mureithi', 'Kabiru',
        ]

        # (course_code, prefix, n_male, n_female)
        distribution = [
            ('SC211', 'SC', 8, 7),    # Computer Science
            ('SC212', 'SC', 3, 4),    # IT
            ('SC213', 'SC', 2, 2),    # Software Eng
            ('SB301', 'SB', 3, 4),    # BCom
            ('SB302', 'SB', 2, 2),    # BBA
            ('EN401', 'EN', 4, 1),    # Civil Eng
            ('EN402', 'EN', 2, 1),    # Electrical Eng
            ('PS501', 'PS', 2, 2),    # Maths
            ('ED601', 'ED', 1, 3),    # Edu Arts
            ('HS701', 'HS', 1, 4),    # Nursing
            ('HS702', 'HS', 1, 3),    # Public Health
        ]   # ~29 M / 33 F

        student_specs = []
        reg_serial = 500
        random.seed(42)

        for course_code, prefix, n_male, n_female in distribution:
            course = course_map.get(course_code)
            pools = [
                ('M', n_male,   list(male_first),   list(male_middle)),
                ('F', n_female, list(female_first),  list(female_middle)),
            ]
            for gender, count, fn_pool, mn_pool in pools:
                random.shuffle(fn_pool)
                random.shuffle(mn_pool)
                sur_copy = list(surnames)
                random.shuffle(sur_copy)

                for i in range(count):
                    yr  = random.randint(1995, 2004)
                    mo  = random.randint(1, 12)
                    dy  = random.randint(1, 28)
                    dob = date(yr, mo, dy)

                    reg_serial += 1
                    reg = f'{prefix}211/{reg_serial:04d}/2024'

                    # 80% active Y1S1, 12% deferred, 8% Y2S1 (ineligible for hostel)
                    roll = random.random()
                    if roll < 0.80:
                        status, cy, cs = 'active', 1, 1
                    elif roll < 0.92:
                        status, cy, cs = 'deferred', 1, 1
                    else:
                        status, cy, cs = 'active', 2, 1

                    first  = fn_pool[i % len(fn_pool)]
                    middle = mn_pool[i % len(mn_pool)]
                    last   = sur_copy[i % len(sur_copy)]

                    student_specs.append({
                        'reg': reg, 'first': first, 'middle': middle, 'last': last,
                        'gender': gender, 'dob': dob, 'course': course,
                        'status': status, 'year': cy, 'sem': cs,
                        'nat_id': str(random.randint(20000000, 39999999)),
                        'phone': f'07{random.randint(10, 79)}{random.randint(100000, 999999)}',
                    })

        students = []
        for sd in student_specs:
            user, u_created = User.objects.get_or_create(
                username=sd['reg'],
                defaults={
                    'role': 'student',
                    'email': f"{sd['first'].lower()}.{sd['last'].lower()}@student.hms.ac.ke",
                    'must_change_password': True,
                }
            )
            if u_created:
                user.set_password(sd['dob'].strftime('%d%m%Y'))
                user.save()

            student, _ = Student.objects.get_or_create(
                reg_number=sd['reg'],
                defaults={
                    'user': user,
                    'first_name': sd['first'],
                    'middle_name': sd['middle'],
                    'last_name': sd['last'],
                    'gender': sd['gender'],
                    'date_of_birth': sd['dob'],
                    'national_id': sd['nat_id'],
                    'phone': sd['phone'],
                    'email': f"{sd['first'].lower()}.{sd['last'].lower()}@student.hms.ac.ke",
                    'course': sd['course'],
                    'current_year': sd['year'],
                    'current_semester': sd['sem'],
                    'status': sd['status'],
                    'admission_date': date(2024, 9, 2),
                    'admission_year': '2024-2025',
                }
            )
            students.append(student)

        males   = sum(1 for s in students if s.gender == 'M')
        females = sum(1 for s in students if s.gender == 'F')
        eligible = sum(
            1 for s in students
            if (s.status == 'active' and s.current_year == 1 and s.current_semester == 1)
            or s.status == 'deferred'
        )
        self.stdout.write(
            f'  + {len(students)} students created  '
            f'({males} male, {females} female, {eligible} eligible for hostel)'
        )
        return students

    # ──────────────────────────────────────────────────────────────
    # 7. ENROLLMENTS
    # ──────────────────────────────────────────────────────────────
    def _seed_enrollments(self, students, current_ay):
        from core.models import Enrollment
        self.stdout.write('\n[7/9] Enrollments')

        enrollments = []
        count = 0
        for student in students:
            enr, created = Enrollment.objects.get_or_create(
                student=student,
                academic_year=current_ay,
                year=student.current_year,
                semester=student.current_semester,
                defaults={
                    'status': 'enrolled' if student.status == 'active' else student.status
                }
            )
            enrollments.append(enr)
            if created:
                count += 1

        self.stdout.write(f'  + {count} enrollments for 2024-2025')
        return enrollments

    # ──────────────────────────────────────────────────────────────
    # 8. BOOKINGS  (~80% of eligible students book)
    # ──────────────────────────────────────────────────────────────
    def _seed_bookings(self, students, current_ay, enrollments):
        from core.models import Bed, BookingApplication
        self.stdout.write('\n[8/9] Booking Applications')

        enrollment_map = {e.student_id: e for e in enrollments}

        boys_beds = list(
            Bed.objects.filter(room__hostel__gender='M', status='available')
               .select_related('room__hostel')
               .order_by('room__hostel', 'room__room_number', 'bed_number')
        )
        girls_beds = list(
            Bed.objects.filter(room__hostel__gender='F', status='available')
               .select_related('room__hostel')
               .order_by('room__hostel', 'room__room_number', 'bed_number')
        )

        eligible = [
            s for s in students
            if (s.status == 'active' and s.current_year == 1 and s.current_semester == 1)
            or s.status == 'deferred'
        ]

        random.seed(99)

        # Weighted status pool
        status_pool = (
            ['confirmed'] * 68 +
            ['payment_initiated'] * 12 +
            ['pending'] * 10 +
            ['cancelled'] * 10
        )

        bookings   = []
        used_beds  = set()
        boys_ptr   = 0
        girls_ptr  = 0

        for student in eligible:
            if random.random() > 0.82:
                continue

            if student.gender == 'M':
                if boys_ptr >= len(boys_beds):
                    continue
                bed = boys_beds[boys_ptr]
                boys_ptr += 1
            else:
                if girls_ptr >= len(girls_beds):
                    continue
                bed = girls_beds[girls_ptr]
                girls_ptr += 1

            used_beds.add(bed.id)
            bstatus  = random.choice(status_pool)
            fee      = bed.room.hostel.monthly_fee
            enr      = enrollment_map.get(student.id)

            days_off   = random.randint(0, 45)
            applied_dt = timezone.make_aware(
                timezone.datetime(2024, 8, 1) + timedelta(days=days_off)
            )

            booking, created = BookingApplication.objects.get_or_create(
                student=student,
                academic_year=current_ay,
                defaults={
                    'bed': bed,
                    'enrollment': enr,
                    'status': bstatus,
                    'amount': fee,
                    'check_in_date': date(2024, 9, 2) if bstatus == 'confirmed' else None,
                    'check_out_date': None,
                    'notes': '',
                }
            )

            if created and bstatus == 'confirmed':
                bed.status = 'occupied'
                bed.save()
                booking.confirmed_at = applied_dt + timedelta(hours=random.randint(1, 48))
                booking.save()

            bookings.append(booking)

        confirmed   = sum(1 for b in bookings if b.status == 'confirmed')
        initiated   = sum(1 for b in bookings if b.status == 'payment_initiated')
        pending     = sum(1 for b in bookings if b.status == 'pending')
        cancelled   = sum(1 for b in bookings if b.status == 'cancelled')
        self.stdout.write(
            f'  + {len(bookings)} bookings — '
            f'{confirmed} confirmed, {initiated} payment_initiated, '
            f'{pending} pending, {cancelled} cancelled'
        )
        return bookings

    # ──────────────────────────────────────────────────────────────
    # 9a. MPESA PAYMENTS
    # ──────────────────────────────────────────────────────────────
    def _seed_payments(self, bookings):
        from core.models import MpesaPayment
        self.stdout.write('\n[9a] M-Pesa Payments')

        serial = 100000
        count  = 0

        for booking in bookings:
            if booking.status == 'pending':
                continue
            try:
                booking.payment
                continue
            except Exception:
                pass

            phone = booking.student.phone
            if phone.startswith('0'):
                phone = '254' + phone[1:]

            serial += 1

            if booking.status == 'confirmed':
                pay_status  = 'success'
                result_code = '0'
                result_desc = 'The service request is processed successfully.'
                receipt     = f'QKA{serial:07d}'
                txn_date    = booking.confirmed_at or timezone.now()
            elif booking.status == 'payment_initiated':
                pay_status  = 'initiated'
                result_code = ''
                result_desc = ''
                receipt     = ''
                txn_date    = None
            else:  # cancelled
                pay_status  = 'failed'
                result_code = '1032'
                result_desc = 'Request cancelled by user.'
                receipt     = ''
                txn_date    = None

            MpesaPayment.objects.get_or_create(
                booking=booking,
                defaults={
                    'phone_number': phone,
                    'amount': booking.amount,
                    'checkout_request_id': f'ws_CO_HMS_{serial}_2024',
                    'merchant_request_id': f'29115-34620321-{serial}',
                    'mpesa_receipt_number': receipt,
                    'transaction_date': txn_date,
                    'status': pay_status,
                    'result_code': result_code,
                    'result_description': result_desc,
                    'is_dev_bypass': True,
                    'raw_response': {
                        'CheckoutRequestID': f'ws_CO_HMS_{serial}_2024',
                        'ResultCode': result_code or '0',
                        'ResultDesc': result_desc or 'Success',
                    }
                }
            )
            count += 1

        self.stdout.write(f'  + {count} payment records')

    # ──────────────────────────────────────────────────────────────
    # 9b. OCCUPANCY HISTORY
    # ──────────────────────────────────────────────────────────────
    def _seed_occupancy_history(self, bookings, current_ay):
        from core.models import OccupancyHistory
        self.stdout.write('\n[9b] Occupancy History')

        count = 0
        for booking in bookings:
            if booking.status != 'confirmed':
                continue
            bed  = booking.bed
            room = bed.room
            OccupancyHistory.objects.get_or_create(
                student=booking.student,
                bed=bed,
                academic_year=current_ay,
                defaults={
                    'hostel': room.hostel,
                    'room': room,
                    'booking': booking,
                    'check_in': booking.check_in_date or date(2024, 9, 2),
                    'check_out': None,
                }
            )
            count += 1

        self.stdout.write(f'  + {count} occupancy history records for 2024-2025')

    # ──────────────────────────────────────────────────────────────
    # 9c. NOTIFICATIONS
    # ──────────────────────────────────────────────────────────────
    def _seed_notifications(self, students, wardens, bookings):
        from core.models import Notification
        self.stdout.write('\n[9c] Notifications')

        count = 0
        random.seed(7)

        confirmed_b  = [b for b in bookings if b.status == 'confirmed']
        failed_b     = [b for b in bookings if b.status == 'cancelled']
        initiated_b  = [b for b in bookings if b.status == 'payment_initiated']

        # Booking confirmed
        for booking in confirmed_b:
            bed = booking.bed
            Notification.objects.get_or_create(
                user=booking.student.user,
                title='Hostel Booking Confirmed',
                defaults={
                    'message': (
                        f'Your hostel booking for 2024-2025 has been confirmed. '
                        f'Hostel: {bed.room.hostel.name}, Room {bed.room.room_number}, '
                        f'Bed {bed.bed_number}. Check-in: 2nd September 2024. '
                        f'Amount paid: KES {int(booking.amount):,} via M-Pesa.'
                    ),
                    'notification_type': 'success',
                    'is_read': random.choice([True, True, False]),
                }
            )
            count += 1

        # Payment failed
        for booking in failed_b[:12]:
            Notification.objects.get_or_create(
                user=booking.student.user,
                title='Payment Failed — Please Retry',
                defaults={
                    'message': (
                        'Your M-Pesa payment was not completed. The transaction was '
                        'either cancelled or timed out. Please log back in and rebook '
                        'your preferred bed before the application window closes. '
                        'Contact support if the issue persists.'
                    ),
                    'notification_type': 'error',
                    'is_read': False,
                }
            )
            count += 1

        # Payment pending
        for booking in initiated_b[:8]:
            Notification.objects.get_or_create(
                user=booking.student.user,
                title='Complete Your Hostel Payment',
                defaults={
                    'message': (
                        f'You have a pending M-Pesa payment of KES {int(booking.amount):,} '
                        f'for your hostel booking. Please enter your M-Pesa PIN to confirm. '
                        f'Your bed reservation will be released if payment is not received within 3 minutes.'
                    ),
                    'notification_type': 'warning',
                    'is_read': False,
                }
            )
            count += 1

        # Applications open — all students
        for student in students:
            Notification.objects.get_or_create(
                user=student.user,
                title='Hostel Applications Open for 2024-2025',
                defaults={
                    'message': (
                        'Hostel applications for the 2024-2025 academic year are now open. '
                        'Log in and select your preferred hostel, room and bed. '
                        'Applications are processed on a first-come, first-served basis. '
                        'Application window: 1st August – 31st August 2024.'
                    ),
                    'notification_type': 'info',
                    'is_read': random.choice([True, True, False]),
                }
            )
            count += 1

        # Welcome + password change
        for student in students:
            Notification.objects.get_or_create(
                user=student.user,
                title='Welcome to HMS — Change Your Password',
                defaults={
                    'message': (
                        f'Welcome, {student.first_name}! Your HMS account has been created. '
                        f'Your default password is your date of birth (DDMMYYYY). '
                        f'Please change it immediately under Account > Change Password '
                        f'to secure your account.'
                    ),
                    'notification_type': 'warning',
                    'is_read': random.choice([True, False, False]),
                }
            )
            count += 1

        # Warden: new applications summary
        for warden in wardens:
            Notification.objects.get_or_create(
                user=warden.user,
                title='New Hostel Booking Applications',
                defaults={
                    'message': (
                        f'There are new hostel booking applications for 2024-2025 awaiting review. '
                        f'Please log into the Warden Dashboard to view the full occupancy map '
                        f'and manage allocations.'
                    ),
                    'notification_type': 'info',
                    'is_read': False,
                }
            )
            count += 1

        # Warden: bed maintenance reminder
        for warden in wardens[:2]:
            Notification.objects.get_or_create(
                user=warden.user,
                title='Routine Bed Maintenance Reminder',
                defaults={
                    'message': (
                        'Reminder: Annual bed and room maintenance inspection is scheduled for '
                        '30th August 2024. Please ensure all maintenance beds are marked '
                        'appropriately in the system before check-in day.'
                    ),
                    'notification_type': 'warning',
                    'is_read': False,
                }
            )
            count += 1

        self.stdout.write(f'  + {count} notifications created')

    # ──────────────────────────────────────────────────────────────
    # Summary
    # ──────────────────────────────────────────────────────────────
    def _print_summary(self, students, wardens):
        from core.models import BookingApplication, AcademicYear, Bed, OccupancyHistory, MpesaPayment

        ay = AcademicYear.objects.filter(is_current=True).first()

        confirmed   = BookingApplication.objects.filter(academic_year=ay, status='confirmed').count()
        total_beds  = Bed.objects.count()
        occupied    = Bed.objects.filter(status='occupied').count()
        available   = Bed.objects.filter(status='available').count()
        history     = OccupancyHistory.objects.filter(academic_year=ay).count()
        payments_ok = MpesaPayment.objects.filter(status='success').count()

        self.stdout.write('')
        self.stdout.write('  DATABASE SUMMARY')
        self.stdout.write('  ' + '-' * 45)
        self.stdout.write(f'  Students           : {len(students)}')
        self.stdout.write(f'  Wardens            : {len(wardens)}')
        self.stdout.write(f'  Total beds         : {total_beds}')
        self.stdout.write(f'  Occupied beds      : {occupied}')
        self.stdout.write(f'  Available beds     : {available}')
        self.stdout.write(f'  Confirmed bookings : {confirmed}')
        self.stdout.write(f'  Occupancy records  : {history}')
        self.stdout.write(f'  M-Pesa successes   : {payments_ok}')

        self.stdout.write('')
        self.stdout.write('  WARDEN LOGINS  (all use password: Warden@2024)')
        self.stdout.write('  ' + '-' * 45)
        for w in wardens:
            self.stdout.write(f'  {w.staff_id:<8}  {w.full_name}')

        self.stdout.write('')
        self.stdout.write('  STUDENT LOGINS  (password = DDMMYYYY)')
        self.stdout.write('  ' + '-' * 90)
        self.stdout.write(
            f'  {"Reg Number":<24} {"Full Name":<30} {"G"} '
            f'{"DOB":<12} {"Status":<10} {"Password"}'
        )
        self.stdout.write('  ' + '-' * 90)

        for s in students[:20]:
            pw = s.date_of_birth.strftime('%d%m%Y')
            booking = s.bookings.filter(academic_year=ay).first()
            binfo = ''
            if booking:
                binfo = (
                    f'{booking.status:<20}'
                    f'  {booking.bed.room.hostel.code} '
                    f'Rm{booking.bed.room.room_number} '
                    f'Bed-{booking.bed.bed_number}'
                )
            self.stdout.write(
                f'  {s.reg_number:<24} {s.full_name:<30} {s.gender} '
                f'{s.date_of_birth.strftime("%d/%m/%Y"):<12} {s.status:<10} {pw:<12}  {binfo}'
            )

        if len(students) > 20:
            self.stdout.write(f'  ... and {len(students) - 20} more students (see Django Admin)')

        self.stdout.write('')
        self.stdout.write('  Django Admin → http://localhost:8000/admin/')
        self.stdout.write('  Frontend     → http://localhost:3000/')
        self.stdout.write('')