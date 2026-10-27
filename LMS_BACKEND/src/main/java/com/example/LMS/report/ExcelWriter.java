package com.example.LMS.report;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

// Small helper to build a one-sheet Excel file: a title, a few "label: value" lines, then a table.
public class ExcelWriter {

    private final Workbook workbook = new XSSFWorkbook();
    private final Sheet sheet;
    private final CellStyle titleStyle;
    private final CellStyle labelStyle;
    private final CellStyle headerStyle;
    private int rowIndex = 0;
    private int columns = 1;

    public ExcelWriter(String sheetName) {
        sheet = workbook.createSheet(sheetName);

        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 14);
        titleStyle = workbook.createCellStyle();
        titleStyle.setFont(titleFont);

        Font bold = workbook.createFont();
        bold.setBold(true);
        labelStyle = workbook.createCellStyle();
        labelStyle.setFont(bold);

        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    }

    public ExcelWriter title(String text) {
        Cell cell = sheet.createRow(rowIndex++).createCell(0);
        cell.setCellValue(text);
        cell.setCellStyle(titleStyle);
        return this;
    }

    public ExcelWriter info(String label, Object value) {
        Row row = sheet.createRow(rowIndex++);
        Cell l = row.createCell(0);
        l.setCellValue(label);
        l.setCellStyle(labelStyle);
        setValue(row.createCell(1), value);
        return this;
    }

    public ExcelWriter blank() {
        rowIndex++;
        return this;
    }

    public ExcelWriter table(List<String> headers, List<List<Object>> rows) {
        columns = Math.max(columns, headers.size());
        Row head = sheet.createRow(rowIndex++);
        for (int i = 0; i < headers.size(); i++) {
            Cell c = head.createCell(i);
            c.setCellValue(headers.get(i));
            c.setCellStyle(headerStyle);
        }
        // Keep the header visible while scrolling.
        sheet.createFreezePane(0, rowIndex);
        for (List<Object> values : rows) {
            Row row = sheet.createRow(rowIndex++);
            for (int i = 0; i < values.size(); i++) {
                setValue(row.createCell(i), values.get(i));
            }
        }
        return this;
    }

    private void setValue(Cell cell, Object value) {
        if (value == null) {
            cell.setBlank();
        } else if (value instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else {
            cell.setCellValue(String.valueOf(value));
        }
    }

    public byte[] toBytes() {
        for (int i = 0; i < columns; i++) {
            sheet.autoSizeColumn(i);
            sheet.setColumnWidth(i, Math.min(sheet.getColumnWidth(i) + 512, 60 * 256));
        }
        try (workbook; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
