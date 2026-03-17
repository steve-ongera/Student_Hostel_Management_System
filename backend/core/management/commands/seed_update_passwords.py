"""
HMS - Update All Student Passwords
Sets every student user's password to: password123
Also clears the must_change_password flag so they are not forced to change on login.

Usage:
    python manage.py seed_update_passwords
    python manage.py seed_update_passwords --keep-flag   (keeps must_change_password=True)
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Set all student passwords to password123'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-flag',
            action='store_true',
            help='Keep must_change_password=True (students still forced to change on login)',
        )

    def handle(self, *args, **options):
        from core.models import User

        keep_flag  = options['keep_flag']
        NEW_PASSWORD = 'password123'

        students = User.objects.filter(role='student', is_active=True)
        total    = students.count()

        if total == 0:
            self.stdout.write(self.style.WARNING('No student users found.'))
            return

        self.stdout.write(f'\nUpdating passwords for {total} student(s)...\n')

        updated = 0
        with transaction.atomic():
            for user in students:
                user.set_password(NEW_PASSWORD)
                if not keep_flag:
                    user.must_change_password = False
                user.save(update_fields=['password', 'last_login', 'must_change_password'])
                updated += 1
                self.stdout.write(f'  OK  {user.username}')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS(f'  Done. {updated} student passwords updated.'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(f'\n  New password  : password123')
        self.stdout.write(f'  Force change  : {"Yes (kept)" if keep_flag else "No (cleared)"}')
        self.stdout.write('')