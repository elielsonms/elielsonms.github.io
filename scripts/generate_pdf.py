from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from xml.sax.saxutils import escape

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


def two_column_header(left_top: Paragraph, left_bottom: Paragraph, right_lines: list[Paragraph]):
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


def build_experience(experiences, styles):
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
            block.append(Paragraph(f"Highlights: {bullet_text}", styles["body"]))

        flowables.append(KeepTogether(block))
        flowables.append(Spacer(1, 5))

    return flowables


def build_simple_list(title: str, items: list[str], styles):
    flowables = section_title(title, styles)
    for item in items:
        flowables.append(Paragraph(escape(item), styles["list"], bulletText="-"))
    return flowables


def build_education(education, styles):
    flowables = section_title("Education", styles)
    for item in education:
        flowables.append(Paragraph(escape(item["degree"]), styles["small_heading"]))
        flowables.append(Paragraph(escape(item["institution"]), styles["body"]))
        flowables.append(Paragraph(escape(item["year"]), styles["submeta"]))
        flowables.append(Spacer(1, 3))
    return flowables


def main() -> None:
    data = json.loads((ROOT / "datasource.json").read_text(encoding="utf-8"))
    pdf_file_name = slugify_file_name(data["header"]["name"])
    output_path = DIST_DIR / pdf_file_name
    DIST_DIR.mkdir(exist_ok=True)

    styles = get_styles()
    email = f"{data['header']['email_parts'][0]}@{data['header']['email_parts'][1]}"

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=13 * mm,
        rightMargin=13 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=f"{data['header']['name']} Resume",
        author=data["header"]["name"],
    )

    story = []
    story.append(
        two_column_header(
            Paragraph(escape(data["header"]["name"]), styles["name"]),
            Paragraph(escape(data["header"]["title"]), styles["title"]),
            [
                Paragraph(escape(data["header"]["location"]), styles["contact_right"]),
                Paragraph(escape(email), styles["contact_right"]),
                Paragraph(f"WhatsApp: +{escape(data['header']['whatsapp'])}", styles["contact_right"]),
            ],
        )
    )
    story.append(Spacer(1, 6))
    story.append(HRFlowable(thickness=0.8, color=colors.HexColor("#94a3b8"), spaceBefore=0, spaceAfter=6))
    story.extend(section_title("Summary", styles))
    story.append(Paragraph(escape(data["summary"]), styles["body"]))
    story.extend(section_title("Experience", styles))
    story.extend(build_experience(data["experience"], styles))

    lower_table = Table(
        [[
            build_education(data["education"], styles),
            build_simple_list("Skills", data["skills"], styles),
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
    story.extend(build_simple_list("Certifications", data["certifications"], styles))

    doc.build(story)
    print(f"✅ PDF generated: {pdf_file_name}")


if __name__ == "__main__":
    main()
