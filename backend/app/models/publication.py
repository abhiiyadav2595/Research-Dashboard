from app.extensions import db
from app.models.mixins import TimestampMixin
import enum


class PublicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    REVISION_REQUIRED = "revision_required"
    ACCEPTED = "accepted"
    PUBLISHED = "published"
    REJECTED = "rejected"


class PublicationType(str, enum.Enum):
    JOURNAL = "journal"
    CONFERENCE = "conference"
    BOOK_CHAPTER = "book_chapter"
    PREPRINT = "preprint"
    OTHER = "other"


class Publication(db.Model, TimestampMixin):
    __tablename__ = "publications"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)

    title = db.Column(db.String(500), nullable=False)
    pub_type = db.Column(db.Enum(PublicationType), nullable=False, default=PublicationType.JOURNAL)
    venue = db.Column(db.String(255))  # journal or conference name
    status = db.Column(db.Enum(PublicationStatus), nullable=False, default=PublicationStatus.DRAFT, index=True)

    submission_date = db.Column(db.Date, nullable=True)
    acceptance_date = db.Column(db.Date, nullable=True)
    publication_date = db.Column(db.Date, nullable=True)

    doi = db.Column(db.String(120), nullable=True)
    url = db.Column(db.String(500), nullable=True)

    student = db.relationship("Student", back_populates="publications")
    authors = db.relationship(
        "PublicationAuthor", back_populates="publication", cascade="all, delete-orphan",
        order_by="PublicationAuthor.author_order",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "title": self.title,
            "pub_type": self.pub_type.value,
            "venue": self.venue,
            "status": self.status.value,
            "submission_date": self.submission_date.isoformat() if self.submission_date else None,
            "acceptance_date": self.acceptance_date.isoformat() if self.acceptance_date else None,
            "publication_date": self.publication_date.isoformat() if self.publication_date else None,
            "doi": self.doi,
            "url": self.url,
            "authors": [a.author_name for a in self.authors],
        }


class PublicationAuthor(db.Model):
    __tablename__ = "publication_authors"

    id = db.Column(db.Integer, primary_key=True)
    publication_id = db.Column(db.Integer, db.ForeignKey("publications.id"), nullable=False, index=True)
    author_name = db.Column(db.String(255), nullable=False)
    author_order = db.Column(db.Integer, nullable=False, default=1)
    is_corresponding = db.Column(db.Boolean, default=False)

    publication = db.relationship("Publication", back_populates="authors")
