package com.viepos.backend.util;

import java.util.Arrays;
import java.util.stream.Collectors;

public final class CsvExportUtil {

    private CsvExportUtil() {
    }

    public static String row(Object... values) {
        return Arrays.stream(values)
                .map(CsvExportUtil::cell)
                .collect(Collectors.joining(",")) + "\n";
    }

    public static String cell(Object value) {
        String text = value == null ? "" : value.toString();
        boolean neutralized = startsWithFormulaPrefixAfterIgnoredLeadingChars(text);
        if (neutralized) {
            text = "'" + text;
        }
        boolean quote = text.contains(",")
                || text.contains("\"")
                || text.contains("\n")
                || text.contains("\r")
                || neutralized;
        String escaped = text.replace("\"", "\"\"");
        return quote ? "\"" + escaped + "\"" : escaped;
    }

    private static boolean startsWithFormulaPrefixAfterIgnoredLeadingChars(String text) {
        if (text == null || text.isEmpty()) {
            return false;
        }
        int index = 0;
        while (index < text.length()) {
            char current = text.charAt(index);
            if (!Character.isWhitespace(current) && !Character.isISOControl(current)) {
                break;
            }
            index++;
        }
        if (index >= text.length()) {
            return false;
        }
        char first = text.charAt(index);
        return first == '=' || first == '+' || first == '-' || first == '@';
    }
}
