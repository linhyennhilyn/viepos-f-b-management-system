package com.viepos.backend.config;

import com.viepos.backend.models.Category;
import com.viepos.backend.repositories.CategoryRepository;
import com.viepos.backend.services.ProductPriceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(100)
public class ProductPriceStartupSync implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductPriceStartupSync.class);

    private final CategoryRepository categoryRepository;
    private final ProductPriceService productPriceService;

    public ProductPriceStartupSync(CategoryRepository categoryRepository, ProductPriceService productPriceService) {
        this.categoryRepository = categoryRepository;
        this.productPriceService = productPriceService;
    }

    @Override
    public void run(ApplicationArguments args) {
        int total = 0;
        for (Category category : categoryRepository.findAll()) {
            if (Boolean.TRUE.equals(category.getIsActive())) {
                total += productPriceService.syncNonCustomProductsInCategory(category);
            }
        }
        log.info("Đồng bộ giá SP từ danh mục (Supabase): {} sản phẩm cập nhật", total);
    }
}
