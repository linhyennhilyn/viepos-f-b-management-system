package com.viepos.backend.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CsvExportUtilTest {

    @Test
    void csvCellEscapesQuotesCommasAndFormulaPrefixes() {
        assertThat(CsvExportUtil.cell("a,b")).isEqualTo("\"a,b\"");
        assertThat(CsvExportUtil.cell("a\"b")).isEqualTo("\"a\"\"b\"");
        assertThat(CsvExportUtil.cell("=SUM(1,2)")).isEqualTo("\"'=SUM(1,2)\"");
        assertThat(CsvExportUtil.cell("+cmd")).isEqualTo("\"'+cmd\"");
        assertThat(CsvExportUtil.cell("-cmd")).isEqualTo("\"'-cmd\"");
        assertThat(CsvExportUtil.cell("@cmd")).isEqualTo("\"'@cmd\"");
        assertThat(CsvExportUtil.cell(" =cmd")).isEqualTo("\"' =cmd\"");
        assertThat(CsvExportUtil.cell("\t=cmd")).isEqualTo("\"'\t=cmd\"");
    }
}
