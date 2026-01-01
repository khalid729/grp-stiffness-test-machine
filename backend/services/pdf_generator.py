from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.graphics.shapes import Drawing, Line
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker
from io import BytesIO
from datetime import datetime
from typing import List, Optional
import logging

from db.models import Test, TestDataPoint

logger = logging.getLogger(__name__)


class PDFGenerator:
    """Generate PDF reports for test results"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='Title_Custom',
            parent=self.styles['Title'],
            fontSize=18,
            spaceAfter=12,
            textColor=colors.HexColor('#1a365d')
        ))
        self.styles.add(ParagraphStyle(
            name='Heading_Custom',
            parent=self.styles['Heading2'],
            fontSize=12,
            spaceBefore=12,
            spaceAfter=6,
            textColor=colors.HexColor('#2c5282')
        ))
        self.styles.add(ParagraphStyle(
            name='Normal_Custom',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=4
        ))
        self.styles.add(ParagraphStyle(
            name='Result_Pass',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#22543d'),
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='Result_Fail',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#742a2a'),
            fontName='Helvetica-Bold'
        ))

    def generate_test_report(self, test: Test) -> bytes:
        """Generate PDF report for a single test"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )

        story = []

        # Header
        story.append(Paragraph("GRP Ring Stiffness Test Report", self.styles['Title_Custom']))
        story.append(Paragraph("ISO 9969 Compliant", self.styles['Normal_Custom']))
        story.append(Spacer(1, 12))

        # Test Information Table
        story.append(Paragraph("Test Information", self.styles['Heading_Custom']))
        test_info = [
            ['Test ID:', str(test.id), 'Date:', test.test_date.strftime('%Y-%m-%d %H:%M') if test.test_date else 'N/A'],
            ['Sample ID:', test.sample_id or 'N/A', 'Operator:', test.operator or 'N/A'],
        ]
        info_table = Table(test_info, colWidths=[3*cm, 5*cm, 3*cm, 5*cm])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 12))

        # Test Parameters Table
        story.append(Paragraph("Test Parameters", self.styles['Heading_Custom']))
        params_data = [
            ['Parameter', 'Value', 'Unit'],
            ['Pipe Diameter', f"{test.pipe_diameter:.1f}", 'mm'],
            ['Sample Length', f"{test.pipe_length:.1f}", 'mm'],
            ['Deflection Target', f"{test.deflection_percent:.1f}", '%'],
            ['Test Speed', f"{test.test_speed:.1f}" if test.test_speed else 'N/A', 'mm/min'],
        ]
        params_table = Table(params_data, colWidths=[6*cm, 4*cm, 3*cm])
        params_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(params_table)
        story.append(Spacer(1, 12))

        # Test Results Table
        story.append(Paragraph("Test Results", self.styles['Heading_Custom']))
        sn_class_str = f"SN {test.sn_class}" if test.sn_class else 'N/A'
        results_data = [
            ['Parameter', 'Value', 'Unit'],
            ['Force at Target', f"{test.force_at_target:.2f}" if test.force_at_target else 'N/A', 'kN'],
            ['Maximum Force', f"{test.max_force:.2f}" if test.max_force else 'N/A', 'kN'],
            ['Ring Stiffness', f"{test.ring_stiffness:.0f}" if test.ring_stiffness else 'N/A', 'kN/m²'],
            ['SN Classification', sn_class_str, ''],
        ]
        results_table = Table(results_data, colWidths=[6*cm, 4*cm, 3*cm])
        results_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(results_table)
        story.append(Spacer(1, 20))

        # Pass/Fail Result
        result_style = self.styles['Result_Pass'] if test.passed else self.styles['Result_Fail']
        result_text = "PASS - Sample meets SN requirements" if test.passed else "FAIL - Sample does not meet SN requirements"
        result_bg = colors.HexColor('#c6f6d5') if test.passed else colors.HexColor('#fed7d7')

        result_table = Table([[Paragraph(result_text, result_style)]], colWidths=[16*cm])
        result_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), result_bg),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#22543d') if test.passed else colors.HexColor('#742a2a')),
        ]))
        story.append(result_table)
        story.append(Spacer(1, 20))

        # Force-Deflection Chart (if data points available)
        if test.data_points and len(test.data_points) > 1:
            story.append(Paragraph("Force-Deflection Curve", self.styles['Heading_Custom']))
            chart = self._create_chart(test.data_points)
            story.append(chart)
            story.append(Spacer(1, 12))

        # Footer
        story.append(Spacer(1, 20))
        footer_text = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | GRP Ring Stiffness Test System"
        story.append(Paragraph(footer_text, self.styles['Normal_Custom']))

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.read()

    def _create_chart(self, data_points: List[TestDataPoint]) -> Drawing:
        """Create force-deflection chart"""
        drawing = Drawing(450, 250)

        # Prepare data
        data = [(dp.deflection, dp.force) for dp in sorted(data_points, key=lambda x: x.deflection)]

        if not data:
            return drawing

        lp = LinePlot()
        lp.x = 50
        lp.y = 50
        lp.height = 170
        lp.width = 380
        lp.data = [data]

        lp.lines[0].strokeColor = colors.HexColor('#3182ce')
        lp.lines[0].strokeWidth = 2

        # Axis configuration
        lp.xValueAxis.valueMin = 0
        lp.xValueAxis.valueMax = max(d[0] for d in data) * 1.1
        lp.xValueAxis.labelTextFormat = '%.1f'

        lp.yValueAxis.valueMin = 0
        lp.yValueAxis.valueMax = max(d[1] for d in data) * 1.1
        lp.yValueAxis.labelTextFormat = '%.1f'

        drawing.add(lp)

        # Axis labels
        from reportlab.graphics.shapes import String
        drawing.add(String(250, 20, 'Deflection (mm)', fontSize=10, textAnchor='middle'))
        drawing.add(String(15, 150, 'Force (kN)', fontSize=10, textAnchor='middle', angle=90))

        return drawing
