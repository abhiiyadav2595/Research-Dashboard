from flask import request, current_app


def get_pagination_params():
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = int(request.args.get("page_size", current_app.config["DEFAULT_PAGE_SIZE"]))
    except (TypeError, ValueError):
        page_size = current_app.config["DEFAULT_PAGE_SIZE"]
    page_size = max(1, min(page_size, current_app.config["MAX_PAGE_SIZE"]))
    return page, page_size


def paginate(query, schema_fn):
    page, page_size = get_pagination_params()
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [schema_fn(i) for i in items],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if page_size else 0,
    }
