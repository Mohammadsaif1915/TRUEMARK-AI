import os
import io
import hashlib
import tempfile
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    Image,
    PageBreak,
)

STATUS_COLORS = {
    "pass": colors.HexColor("#27ae60"),
    "fail": colors.HexColor("#e74c3c"),
    "warning": colors.HexColor("#f39c12"),
}

OVERALL_STATUS_COLORS = {
    "compliant": colors.HexColor("#27ae60"),
    "non_compliant": colors.HexColor("#e74c3c"),
    "partially_compliant": colors.HexColor("#f39c12"),
}

SEVERITY_COLORS = {
    "critical": colors.HexColor("#e74c3c"),
    "warning": colors.HexColor("#f39c12"),
    "info": colors.HexColor("#3498db"),
}


ZONE_LABELS_PDF = {
    "mrp_zone": "MRP Zone",
    "manufacturer_zone": "Manufacturer Zone",
    "consumer_care_zone": "Consumer Care Zone",
    "net_qty_zone": "Net Quantity Zone",
    "bottom_panel": "Bottom Panel",
    "unknown": "Text Region",
}


def _get_zone_for_check(check):
    """Map a compliance check's rule_name to its OCR zone key."""
    name = (check.get("rule_name") or "").lower()
    if "mrp" in name or "price" in name:
        return "mrp_zone"
    if "quantity" in name or "weight" in name or "net" in name:
        return "net_qty_zone"
    if "manufacturer" in name or "address" in name:
        return "manufacturer_zone"
    if "care" in name or "helpline" in name or "contact" in name:
        return "consumer_care_zone"
    return None


def _annotate_zone_image(image_source, ocr_regions, zone_key, max_width=480):
    """
    Opens the product image and draws red bounding boxes for the given zone.
    Returns a BytesIO PNG buffer ready for reportlab Image(), or None on failure.
    """
    try:
        from PIL import Image as PILImage, ImageDraw

        # --- Load image ---
        pil_img = None
        if isinstance(image_source, str):
            if image_source.startswith("http://") or image_source.startswith("https://"):
                import urllib.request
                with urllib.request.urlopen(image_source, timeout=8) as resp:
                    pil_img = PILImage.open(io.BytesIO(resp.read())).convert("RGBA")
            elif os.path.exists(image_source):
                pil_img = PILImage.open(image_source).convert("RGBA")

        if pil_img is None:
            return None

        # --- Filter OCR regions for this zone ---
        zone_items = [
            r for r in (ocr_regions or [])
            if r.get("zone") == zone_key and r.get("bbox") and len(r["bbox"]) >= 4
        ]
        if not zone_items:
            return None

        # --- Draw semi-transparent red rects on a separate layer ---
        overlay = PILImage.new("RGBA", pil_img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        for item in zone_items:
            pts = item["bbox"]
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
            # Filled translucent rectangle
            draw.rectangle([x0, y0, x1, y1], fill=(239, 68, 68, 70))
            # Solid border (draw 4 narrow rectangles for border)
            bw = 3
            draw.rectangle([x0, y0, x1, y0 + bw], fill=(239, 68, 68, 255))
            draw.rectangle([x0, y1 - bw, x1, y1], fill=(239, 68, 68, 255))
            draw.rectangle([x0, y0, x0 + bw, y1], fill=(239, 68, 68, 255))
            draw.rectangle([x1 - bw, y0, x1, y1], fill=(239, 68, 68, 255))

        # Composite overlay onto a slightly dimmed base
        dimmed = PILImage.new("RGBA", pil_img.size, (0, 0, 0, 40))
        result = PILImage.alpha_composite(pil_img, dimmed)
        result = PILImage.alpha_composite(result, overlay)
        result = result.convert("RGB")

        # --- Resize to max_width ---
        W, H = result.size
        if W > max_width:
            result = result.resize((max_width, int(H * max_width / W)), PILImage.LANCZOS)

        buf = io.BytesIO()
        result.save(buf, format="PNG")
        buf.seek(0)
        return buf

    except Exception as err:
        print(f"Zone annotation failed: {err}")
        return None


def generate_pdf_report(scan):
    try:
        from flask import current_app
        try:
            upload_dir = current_app.config["UPLOAD_FOLDER"]
        except Exception:
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            upload_dir = os.path.join(BASE_DIR, "uploads")
            
        report_dir = os.path.join(upload_dir, "reports")
        os.makedirs(report_dir, exist_ok=True)
        report_filename = f"report_scan_{scan.id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.pdf"
        report_path = os.path.join(report_dir, report_filename)

        doc = SimpleDocTemplate(
            report_path,
            pagesize=A4,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        styles = getSampleStyleSheet()
        elements = []

        title_style = ParagraphStyle(
            "TrueMarkTitle",
            parent=styles["Title"],
            fontSize=24,
            textColor=colors.HexColor("#2c3e50"),
            spaceAfter=6,
        )
        subtitle_style = ParagraphStyle(
            "TrueMarkSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            textColor=colors.HexColor("#7f8c8d"),
            spaceAfter=12,
        )
        heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=14,
            textColor=colors.HexColor("#2c3e50"),
            spaceBefore=16,
            spaceAfter=8,
        )
        body_style = ParagraphStyle(
            "BodyText",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#333333"),
            spaceAfter=6,
            leading=14,
        )
        small_style = ParagraphStyle(
            "SmallText",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#95a5a6"),
            spaceAfter=4,
        )

        elements.append(Paragraph("TrueMark", title_style))
        elements.append(Paragraph("Legal Metrology Compliance Report", subtitle_style))
        elements.append(HRFlowable(
            width="100%", thickness=2,
            color=colors.HexColor("#3498db"),
            spaceAfter=12,
        ))

        elements.append(Paragraph("Scan Details", heading_style))

        scan_data = [
            ["Scan ID", str(scan.id)],
            ["Product Name", str(scan.product_name or "N/A")],
            ["Manufacturer", str(scan.manufacturer or "N/A")],
            ["City", str(getattr(scan, "city", None) or "N/A")],
            ["State / UT", str(scan.state or "N/A")],
            ["Latitude", str(scan.latitude if scan.latitude is not None else "N/A")],
            ["Longitude", str(scan.longitude if scan.longitude is not None else "N/A")],
        ]
        
        if scan.extracted_fields:
            if scan.extracted_fields.get("address"):
                scan_data.append(["Address", str(scan.extracted_fields.get("address"))])
            if scan.extracted_fields.get("manufacturing_date"):
                scan_data.append(["Mfg Date", str(scan.extracted_fields.get("manufacturing_date"))])
            if scan.extracted_fields.get("batch_number"):
                scan_data.append(["Batch No", str(scan.extracted_fields.get("batch_number"))])
            if scan.extracted_fields.get("unit_sale_price"):
                scan_data.append(["Unit Price", str(scan.extracted_fields.get("unit_sale_price"))])
            if scan.extracted_fields.get("net_quantity"):
                scan_data.append(["Net Qty", str(scan.extracted_fields.get("net_quantity"))])
            if scan.extracted_fields.get("mrp"):
                scan_data.append(["MRP", str(scan.extracted_fields.get("mrp"))])

        scan_data.extend([
            ["Overall Status", str(scan.overall_status or "N/A").upper()],
            ["Date Scanned", scan.created_at.strftime("%d %B %Y, %H:%M:%S UTC") if scan.created_at else "N/A"],
            ["Image Path", str(scan.image_path or "N/A")],
        ])

        scan_table_data = [[Paragraph(str(cell).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), body_style) for cell in row] for row in scan_data]
        scan_table = Table(scan_table_data, colWidths=[1.55 * inch, 4.95 * inch], repeatRows=0)
        scan_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#ecf0f1")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#2c3e50")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bdc3c7")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(scan_table)

        if scan.overall_status:
            overall_color = OVERALL_STATUS_COLORS.get(scan.overall_status, colors.grey)
            status_style = ParagraphStyle(
                "OverallStatus",
                parent=styles["Normal"],
                fontSize=16,
                textColor=overall_color,
                spaceBefore=12,
                spaceAfter=12,
                fontName="Helvetica-Bold",
            )
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                f"Overall Status: {scan.overall_status.upper().replace('_', ' ')}",
                status_style,
            ))

        elements.append(Paragraph("Compliance Checks", heading_style))

        compliance_result = scan.compliance_result or {}
        checks = compliance_result.get("checks", [])

        confidence = compliance_result.get("confidence_assessment") or {}
        if confidence:
            elements.append(Paragraph("AI Analysis Confidence", heading_style))
            confidence_text = (
                f"Level: {confidence.get('level', 'N/A')} | "
                f"System estimated score: {confidence.get('score', 'N/A')}% | "
                f"{confidence.get('recommendation', '')}"
            )
            elements.append(Paragraph(confidence_text, body_style))

        if checks:
            header_row = ["Rule", "Status", "Severity", "Message"]
            table_data = [header_row]
            for check in checks:
                status_val = check.get("status", "unknown")
                table_data.append([
                    Paragraph(str(check.get("rule_name", "N/A")).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), small_style),
                    Paragraph(str(status_val).upper().replace("_"," "), small_style),
                    Paragraph(str(check.get("severity", "N/A")).upper().replace("_"," "), small_style),
                    Paragraph(str(check.get("message", "N/A")).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), small_style),
                ])

            check_table = Table(
                table_data,
                colWidths=[1.65 * inch, 1.05 * inch, 0.85 * inch, 3.0 * inch],
                repeatRows=1,
            )
            check_table_style = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bdc3c7")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ]

            for i, check in enumerate(checks, start=1):
                status_val = check.get("status", "unknown")
                row_bg = colors.HexColor("#f9f9f9") if i % 2 == 0 else colors.white
                check_table_style.append(("BACKGROUND", (0, i), (-1, i), row_bg))

                status_color = STATUS_COLORS.get(status_val, colors.grey)
                check_table_style.append(("TEXTCOLOR", (1, i), (1, i), status_color))
                check_table_style.append(("FONTNAME", (1, i), (1, i), "Helvetica-Bold"))

                severity_val = check.get("severity", "info")
                sev_color = SEVERITY_COLORS.get(severity_val, colors.grey)
                check_table_style.append(("TEXTCOLOR", (2, i), (2, i), sev_color))

            check_table.setStyle(TableStyle(check_table_style))
            elements.append(check_table)
        else:
            elements.append(Paragraph("No compliance checks available.", body_style))

        elements.append(Spacer(1, 20))

        ocr_heading = ParagraphStyle(
            "OCRHeading",
            parent=styles["Heading3"],
            fontSize=12,
            textColor=colors.HexColor("#2c3e50"),
            spaceBefore=12,
            spaceAfter=6,
        )
        elements.append(Paragraph("Extracted OCR Text", ocr_heading))

        ocr_text = scan.ocr_text or "No text extracted."
        escaped_ocr = ocr_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        escaped_ocr = escaped_ocr.replace("\n", "<br/>")
        ocr_style = ParagraphStyle(
            "OCRText",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#555555"),
            backColor=colors.HexColor("#f8f9fa"),
            borderPadding=8,
            spaceAfter=12,
            leading=13,
        )
        elements.append(Paragraph(escaped_ocr, ocr_style))

        elements.append(HRFlowable(
            width="100%", thickness=1,
            color=colors.HexColor("#bdc3c7"),
            spaceBefore=16, spaceAfter=8,
        ))
        elements.append(Paragraph(
            f"Generated by TrueMark on {datetime.now(timezone.utc).strftime('%d %B %Y, %H:%M:%S UTC')}",
            small_style,
        ))

        # ── Manual Inspection Records section ──────────────────────────────
        manual_inspections = list(getattr(scan, 'manual_inspections', None) or [])
        if manual_inspections:
            elements.append(PageBreak())
            elements.append(Paragraph("Manual Inspection Records", heading_style))
            elements.append(Paragraph(
                "The following checks were verified in-person by an authorised inspector "
                "after the AI extraction phase.",
                body_style,
            ))
            elements.append(Spacer(1, 8))

            OUTCOME_COLORS = {
                "pass": colors.HexColor("#27ae60"),
                "fail": colors.HexColor("#e74c3c"),
                "complete": colors.HexColor("#2980b9"),
            }

            for mi_idx, mi in enumerate(manual_inspections):
                outcome = (mi.outcome or "unknown").upper()
                out_color = OUTCOME_COLORS.get(mi.outcome or "", colors.grey)

                # Section header for each inspection record
                mi_header_style = ParagraphStyle(
                    f"MIHeader_{mi_idx}",
                    parent=styles["Normal"],
                    fontSize=11,
                    textColor=out_color,
                    fontName="Helvetica-Bold",
                    spaceBefore=10,
                    spaceAfter=4,
                )
                rule_label = (mi.rule_name or "Unknown Rule").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                elements.append(Paragraph(
                    f"[{outcome}] {rule_label}",
                    mi_header_style,
                ))

                # Detail table
                inspector_display = "Unknown"
                if mi.inspector:
                    inspector_display = mi.inspector.full_name or mi.inspector.username or "Unknown"
                insp_date = mi.created_at.strftime("%d %b %Y, %H:%M UTC") if mi.created_at else "N/A"
                citation_display = (mi.citation or "N/A").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                field_val_display = (mi.field_value or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                notes_display = (mi.notes or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

                mi_table_data = [
                    [Paragraph("Citation", small_style), Paragraph(citation_display, body_style)],
                    [Paragraph("Inspector", small_style), Paragraph(inspector_display, body_style)],
                    [Paragraph("Date", small_style), Paragraph(insp_date, body_style)],
                    [Paragraph("Observed Value", small_style), Paragraph(field_val_display, body_style)],
                    [Paragraph("Notes", small_style), Paragraph(notes_display, body_style)],
                ]
                mi_table = Table(mi_table_data, colWidths=[1.4 * inch, 5.1 * inch])
                mi_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#ecf0f1")),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#bdc3c7")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f9f9f9")]),
                ]))
                elements.append(mi_table)

                # Evidence images
                evidence_paths = mi.evidence_paths or []
                if evidence_paths:
                    elements.append(Spacer(1, 6))
                    elements.append(Paragraph(
                        f"Evidence ({len(evidence_paths)} file{'s' if len(evidence_paths) != 1 else ''})",
                        small_style,
                    ))
                    for ev_path in evidence_paths:
                        img_data = None
                        try:
                            if ev_path.startswith("http://") or ev_path.startswith("https://"):
                                import urllib.request
                                with urllib.request.urlopen(ev_path, timeout=8) as r:
                                    img_data = io.BytesIO(r.read())
                            elif os.path.exists(ev_path):
                                img_data = ev_path
                        except Exception as img_err:
                            print(f"Evidence load error: {img_err}")

                        if img_data:
                            try:
                                img = Image(img_data, width=4.5 * inch, height=3.0 * inch)
                                img.hAlign = "LEFT"
                                elements.append(img)
                                elements.append(Spacer(1, 4))
                            except Exception as draw_err:
                                print(f"Evidence embed error: {draw_err}")
                                elements.append(Paragraph(
                                    f"[Evidence file could not be embedded: {ev_path}]",
                                    small_style,
                                ))
                        else:
                            elements.append(Paragraph(
                                f"[Evidence unavailable: {ev_path}]",
                                small_style,
                            ))

                elements.append(Spacer(1, 6))

        elements.append(PageBreak())

        
        cert_title = ParagraphStyle(
            "CertTitle",
            parent=styles["Heading2"],
            fontSize=16,
            textColor=colors.HexColor("#2c3e50"),
            spaceBefore=12,
            spaceAfter=12,
            alignment=1
        )
        
        cert_subtitle = ParagraphStyle(
            "CertSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            textColor=colors.HexColor("#7f8c8d"),
            spaceAfter=12,
            alignment=1
        )

        elements.append(Paragraph("Certificate under Section 65B(4) of the Indian Evidence Act", cert_title))
        elements.append(Paragraph("(Read with Section 63 of the Bharatiya Sakshya Adhiniyam, 2023)", cert_subtitle))
        
        elements.append(Spacer(1, 10))
        
        cert_body = ParagraphStyle(
            "CertBody",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#333333"),
            spaceAfter=10,
            leading=16,
        )
        
        inspector_name = "Authorized Inspector"
        badge = "N/A"
        if hasattr(scan, "user") and scan.user:
            inspector_name = scan.user.full_name or scan.user.username or "Authorized Inspector"
            badge = scan.user.badge_number or "N/A"
            
        date_str = scan.created_at.strftime("%d %B %Y at %H:%M:%S UTC") if scan.created_at else "N/A"
        img_hash = getattr(scan, "image_hash", None) or "Hash not available (Legacy Scan)"
        
        text1 = f"I, <b>{inspector_name}</b> (Badge No: {badge}), do hereby certify that the electronic record contained in this report was produced by a computer/mobile device during the ordinary course of lawful activities."
        
        text2 = f"The accompanying photographic evidence was captured on <b>{date_str}</b>. At the time of capture, the device was operating properly, and there was no operational issue that could affect the accuracy of the electronic record."
        
        text3 = f"To ensure non-repudiation and prevent tampering, a cryptographic SHA-256 hash of the original evidence file was generated at the exact time of capture and securely logged in the TrueMark database."
        
        text4 = f"<b>Cryptographic SHA-256 Hash of Evidence:</b><br/>{img_hash}"
        
        elements.append(Paragraph(text1, cert_body))
        elements.append(Paragraph(text2, cert_body))
        elements.append(Paragraph(text3, cert_body))
        elements.append(Spacer(1, 10))
        
        hash_style = ParagraphStyle(
            "HashText",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#e74c3c"),
            backColor=colors.HexColor("#f8f9fa"),
            borderPadding=8,
            spaceAfter=12,
            fontName="Courier",
        )
        elements.append(Paragraph(text4, hash_style))
        
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("___________________________", body_style))
        signature_variant = int(hashlib.sha256(inspector_name.encode("utf-8")).hexdigest()[:2], 16) % 3
        signature_marks = ["/", "~", "-"]
        signature_mark = signature_marks[signature_variant] * (2 + signature_variant)
        elements.append(Paragraph(f"<i>{signature_mark} {inspector_name}</i>", body_style))
        elements.append(Paragraph(f"Signature of {inspector_name}", body_style))
        elements.append(Paragraph(f"Date: {datetime.now(timezone.utc).strftime('%d %B %Y')}", body_style))

        doc.build(elements)
        return report_path

    except Exception as e:
        print(f"Report generation error: {e}")
        return None



