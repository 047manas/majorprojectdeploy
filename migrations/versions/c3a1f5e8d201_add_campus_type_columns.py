"""add campus_type columns

Revision ID: c3a1f5e8d201
Revises: 2bd3043d53d6
Create Date: 2026-03-02 14:37:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3a1f5e8d201'
down_revision = 'be7e1e983d10'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('student_activities', sa.Column('campus_type', sa.String(20), nullable=True, server_default='off_campus'))
    op.add_column('student_activities', sa.Column('is_attendance_uploaded', sa.Boolean(), nullable=True, server_default=sa.text('0')))
    op.add_column('student_activities', sa.Column('attendance_uploaded_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))


def downgrade():
    op.drop_column('student_activities', 'attendance_uploaded_by')
    op.drop_column('student_activities', 'is_attendance_uploaded')
    op.drop_column('student_activities', 'campus_type')
