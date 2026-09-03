import os
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
            "MeteroLensTitle",
            parent=styles["Title"],
            fontSize=24,
            textColor=colors.HexColor("#2c3e50"),
            spaceAfter=6,
        )
        subtitle_style = ParagraphStyle(
            "MeteroLensSubtitle",
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

        elements.append(Paragraph("MeteroLens", title_style))
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

        scan_table = Table(scan_data, colWidths=[2 * inch, 4.5 * inch])
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

        if checks:
            header_row = ["Rule", "Status", "Severity", "Message"]
            table_data = [header_row]
            for check in checks:
                status_val = check.get("status", "unknown")
                table_data.append([
                    check.get("rule_name", "N/A"),
                    status_val.upper(),
                    check.get("severity", "N/A").upper(),
                    check.get("message", "N/A"),
                ])

            check_table = Table(
                table_data,
                colWidths=[1.5 * inch, 0.8 * inch, 0.8 * inch, 3.4 * inch],
            )
            check_table_style = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bdc3c7")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
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
            f"Generated by MeteroLens on {datetime.now(timezone.utc).strftime('%d %B %Y, %H:%M:%S UTC')}",
            small_style,
        ))

        from reportlab.platypus import PageBreak
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
        
        text3 = f"To ensure non-repudiation and prevent tampering, a cryptographic SHA-256 hash of the original evidence file was generated at the exact time of capture and securely logged in the MeteroLens database."
        
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
        elements.append(Paragraph(f"Signature of {inspector_name}", body_style))
        elements.append(Paragraph(f"Date: {datetime.now(timezone.utc).strftime('%d %B %Y')}", body_style))

        doc.build(elements)
        return report_path

    except Exception as e:
        print(f"Report generation error: {e}")
        return None
