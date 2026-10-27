package com.example.LMS.report;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

// Small helper to build a simple, printable PDF: brand line, title, "label: value" lines, then a table.
public class PdfWriter {

    private static final Color ACCENT = new Color(79, 70, 229);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color HEADER_BG = new Color(238, 240, 255);
    private static final Color LINE = new Color(226, 232, 240);

    private final ByteArrayOutputStream out = new ByteArrayOutputStream();
    private final Document document;

    public PdfWriter(boolean landscape) {
        document = new Document(landscape ? PageSize.A4.rotate() : PageSize.A4, 36, 36, 36, 36);
        com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
        document.open();
        Paragraph brand = new Paragraph("Learnly", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, ACCENT));
        document.add(brand);
    }

    public PdfWriter title(String text) {
        Paragraph p = new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18));
        p.setSpacingBefore(6);
        p.setSpacingAfter(8);
        document.add(p);
        return this;
    }

    public PdfWriter info(String label, Object value) {
        Phrase phrase = new Phrase();
        phrase.add(new Chunk(label + ": ", FontFactory.getFont(FontFactory.HELVETICA, 10, MUTED)));
        phrase.add(new Chunk(value == null ? "-" : String.valueOf(value), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        document.add(new Paragraph(phrase));
        return this;
    }

    public PdfWriter table(List<String> headers, float[] widths, List<List<Object>> rows) {
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);
        table.setSpacingBefore(14);
        table.setHeaderRows(1);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(HEADER_BG);
            cell.setBorderColor(LINE);
            cell.setPadding(6);
            table.addCell(cell);
        }
        for (List<Object> row : rows) {
            for (Object value : row) {
                PdfPCell cell = new PdfPCell(new Phrase(value == null ? "-" : String.valueOf(value), cellFont));
                cell.setBorderColor(LINE);
                cell.setPadding(6);
                table.addCell(cell);
            }
        }
        if (rows.isEmpty()) {
            PdfPCell cell = new PdfPCell(new Phrase("No data yet", cellFont));
            cell.setColspan(headers.size());
            cell.setPadding(8);
            cell.setBorderColor(LINE);
            table.addCell(cell);
        }
        document.add(table);
        return this;
    }

    public PdfWriter note(String text) {
        Paragraph p = new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED));
        p.setSpacingBefore(12);
        document.add(p);
        return this;
    }

    public byte[] toBytes() {
        document.close();
        return out.toByteArray();
    }
}
