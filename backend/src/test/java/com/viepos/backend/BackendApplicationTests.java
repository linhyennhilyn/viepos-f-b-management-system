package com.viepos.backend;

import org.junit.jupiter.api.Test;

import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

class BackendApplicationTests {

	@Test
	void initSetsVietnamTimezone() {
		TimeZone original = TimeZone.getDefault();
		try {
			new BackendApplication().init();
			assertThat(TimeZone.getDefault().getID()).isEqualTo("Asia/Ho_Chi_Minh");
		} finally {
			TimeZone.setDefault(original);
		}
	}

}
