from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from xml.sax.saxutils import escape

import yaml
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "dist"


def slugify_file_name(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    ascii_only = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-")
    return f"{slug}.pdf"


def build_localized_pdf_file_name(name: str, locale: str, default_locale: str) -> str:
    base_file_name = slugify_file_name(name)
    if locale == default_locale:
        return base_file_name

    stem, suffix = base_file_name.rsplit(".", 1)
    return f"{stem}.{locale.replace('_', '-')}.{suffix}"


def get_default_locale(data: dict) -> str:
    return data.get("site", {}).get("default_locale", "en_US")


def get_supported_locales(data: dict) -> list[str]:
    locales = data.get("site", {}).get("supported_locales", [])
    return locales or [get_default_locale(data)]


def resolve_locale_data(data: dict, locale: str) -> dict:
    locale_data = data["locales"][locale]

    return {
        "locale": locale,
        "header": {
            **data["header"],
            **locale_data.get("header", {}),
        },
        "site": {
            **data.get("site", {}),
            **locale_data.get("site", {}),
        },
        "labels": locale_data.get("labels", {}),
        "summary": locale_data.get("summary", ""),
        "experience": locale_data.get("experience", []),
        "education": locale_data.get("education", []),
        "certifications": locale_data.get("certifications", []),
        "skills": locale_data.get("skills", []),
    }


def get_styles():
    base = getSampleStyleSheet()

    return {
        "name": ParagraphStyle(
            "Name",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=20,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#111827"),
            spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=11,
            textColor=colors.HexColor("#374151"),
            spaceAfter=0,
        ),
        "contact_right": ParagraphStyle(
            "ContactRight",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=10.2,
            alignment=TA_RIGHT,
            textColor=colors.HexColor("#374151"),
        ),
        "contact_link_right": ParagraphStyle(
            "ContactLinkRight",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=10.2,
            alignment=TA_RIGHT,
            textColor=colors.HexColor("#1d4ed8"),
        ),
        "contact_link_inline": ParagraphStyle(
            "ContactLinkInline",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=10.2,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1d4ed8"),
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=2,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11,
            textColor=colors.HexColor("#111827"),
            spaceAfter=2,
        ),
        "meta_left": ParagraphStyle(
            "MetaLeft",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#111827"),
        ),
        "meta_right": ParagraphStyle(
            "MetaRight",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            alignment=TA_RIGHT,
            textColor=colors.HexColor("#374151"),
        ),
        "submeta": ParagraphStyle(
            "SubMeta",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.3,
            leading=10,
            textColor=colors.HexColor("#4b5563"),
            spaceAfter=2,
        ),
        "list": ParagraphStyle(
            "List",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=10.4,
            textColor=colors.HexColor("#111827"),
            leftIndent=10,
            bulletIndent=0,
            spaceAfter=1,
        ),
        "small_heading": ParagraphStyle(
            "SmallHeading",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.9,
            leading=10.5,
            textColor=colors.HexColor("#111827"),
            spaceAfter=2,
        ),
    }


def two_column_header(left_top, left_bottom, right_lines):
    left_block = [left_top, left_bottom]
    right_block = right_lines
    table = Table([[left_block, right_block]], colWidths=[112 * mm, 68 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def section_title(text: str, styles):
    return [Spacer(1, 5), Paragraph(escape(text.upper()), styles["section"]), HRFlowable(thickness=0.6, color=colors.HexColor("#cbd5e1"), spaceBefore=0, spaceAfter=5)]


def build_experience(experiences, styles, highlights_label: str):
    flowables = []
    for exp in experiences:
        title = escape(exp["title"].strip())
        company = escape(exp["company"])
        period = escape(exp["period"])
        duration = escape(exp.get("duration", ""))
        description = escape(exp["description"])
        highlights = exp.get("highlights", [])

        header = Table(
            [[
                Paragraph(f"{title} | {company}", styles["meta_left"]),
                Paragraph(period, styles["meta_right"])
            ]],
            colWidths=[118 * mm, 62 * mm],
        )
        header.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        block = [header]
        if duration:
            block.append(Paragraph(duration, styles["submeta"]))
        block.append(Paragraph(description, styles["body"]))

        if highlights:
            bullet_text = " | ".join(escape(item) for item in highlights)
            block.append(Paragraph(f"{escape(highlights_label)}: {bullet_text}", styles["body"]))

        flowables.append(KeepTogether(block))
        flowables.append(Spacer(1, 5))

    return flowables


def build_simple_list(title: str, items: list[str], styles):
    flowables = section_title(title, styles)
    for item in items:
        flowables.append(Paragraph(escape(item), styles["list"], bulletText="-"))
    return flowables


def build_education(title: str, education, styles):
    flowables = section_title(title, styles)
    for item in education:
        flowables.append(Paragraph(escape(item["degree"]), styles["small_heading"]))
        flowables.append(Paragraph(escape(item["institution"]), styles["body"]))
        flowables.append(Paragraph(escape(item["year"]), styles["submeta"]))
        flowables.append(Spacer(1, 3))
    return flowables


def build_link_paragraph(label: str, url: str, styles):
    safe_label = escape(label)
    safe_url = escape(url)
    return Paragraph(f'<link href="{safe_url}">{safe_label}</link>', styles["contact_link_right"])


def build_inline_links(urls: list[tuple[str, str]], styles):
    cells = [
        Paragraph(f'<link href="{escape(url)}">{escape(label)}</link>', styles["contact_link_inline"])
        for label, url in urls
    ]
    table = Table([cells], colWidths=[28 * mm] * len(cells))
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def main() -> None:
    data = yaml.safe_load((ROOT / "datasource.yaml").read_text(encoding="utf-8"))
    DIST_DIR.mkdir(exist_ok=True)

    default_locale = get_default_locale(data)

    for locale in get_supported_locales(data):
        resolved = resolve_locale_data(data, locale)
        labels = resolved["labels"]
        pdf_file_name = build_localized_pdf_file_name(resolved["header"]["name"], locale, default_locale)
        output_path = DIST_DIR / pdf_file_name
        styles = get_styles()
        email = f"{resolved['header']['email_parts'][0]}@{resolved['header']['email_parts'][1]}"
        github_url = f"https://github.com/{resolved['header']['github']}"
        portfolio_url = resolved["header"].get("portfolio", "")

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            leftMargin=13 * mm,
            rightMargin=13 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
            title=f"{resolved['header']['name']} {labels.get('resume_title', 'Resume')}",
            author=resolved["header"]["name"],
        )

        story = []
        story.append(
            two_column_header(
                Paragraph(escape(resolved["header"]["name"]), styles["name"]),
                [
                    Paragraph(escape(resolved["header"]["title"]), styles["title"]),
                    build_inline_links(
                        [
                            ("GitHub", github_url),
                            (labels.get("portfolio_link", "Portfolio"), portfolio_url),
                        ] if portfolio_url else [("GitHub", github_url)],
                        styles,
                    ),
                ],
                [
                    Paragraph(escape(resolved["header"]["location"]), styles["contact_right"]),
                    Paragraph(escape(email), styles["contact_right"]),
                    Paragraph(f"WhatsApp: +{escape(resolved['header']['whatsapp'])}", styles["contact_right"]),
                ],
            )
        )
        story.append(Spacer(1, 6))
        story.append(HRFlowable(thickness=0.8, color=colors.HexColor("#94a3b8"), spaceBefore=0, spaceAfter=6))
        story.extend(section_title(labels.get("about", "Summary"), styles))
        story.append(Paragraph(escape(resolved["summary"]), styles["body"]))
        story.extend(section_title(labels.get("experience", "Experience"), styles))
        story.extend(build_experience(resolved["experience"], styles, labels.get("highlights", "Highlights")))

        lower_table = Table(
            [[
                build_education(labels.get("education", "Education"), resolved["education"], styles),
                build_simple_list(labels.get("skills", "Skills"), resolved["skills"], styles),
            ]],
            colWidths=[88 * mm, 92 * mm],
        )
        lower_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        story.append(lower_table)
        story.extend(build_simple_list(labels.get("certifications", "Certifications"), resolved["certifications"], styles))

        doc.build(story)
        print(f"✅ PDF generated: {pdf_file_name}")


if __name__ == "__main__":
    main()
