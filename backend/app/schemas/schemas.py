from marshmallow import Schema, fields, validate


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))


class PublicationSchema(Schema):
    student_id = fields.Integer(required=True)
    title = fields.String(required=True, validate=validate.Length(min=3, max=500))
    pub_type = fields.String(
        required=True,
        validate=validate.OneOf(["journal", "conference", "book_chapter", "preprint", "other"]),
    )
    venue = fields.String(allow_none=True)
    status = fields.String(
        required=True,
        validate=validate.OneOf([
            "draft", "submitted", "under_review", "revision_required",
            "accepted", "published", "rejected",
        ]),
    )
    submission_date = fields.Date(allow_none=True)
    acceptance_date = fields.Date(allow_none=True)
    publication_date = fields.Date(allow_none=True)
    doi = fields.String(allow_none=True)
    url = fields.String(allow_none=True)
    authors = fields.List(fields.String(), required=False)


class SubmissionSchema(Schema):
    student_id = fields.Integer(required=True)
    name = fields.String(required=True, validate=validate.Length(min=3, max=255))
    category = fields.String(required=True)
    deadline = fields.Date(required=True)
    submitted_date = fields.Date(allow_none=True)
    status = fields.String(
        required=True,
        validate=validate.OneOf(["pending", "submitted", "under_review", "approved", "rejected", "overdue"]),
    )
    document_link = fields.String(allow_none=True)
    reviewer_id = fields.Integer(allow_none=True)


class ProgressWeightSchema(Schema):
    name = fields.String(required=True)
    academic_weight = fields.Float(required=True, validate=validate.Range(min=0, max=100))
    research_weight = fields.Float(required=True, validate=validate.Range(min=0, max=100))
    milestone_weight = fields.Float(required=True, validate=validate.Range(min=0, max=100))
    publication_weight = fields.Float(required=True, validate=validate.Range(min=0, max=100))
    submission_weight = fields.Float(required=True, validate=validate.Range(min=0, max=100))
