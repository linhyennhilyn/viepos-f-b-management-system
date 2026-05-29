package com.viepos.backend.services;

import com.viepos.backend.models.Category;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.enums.ServiceType;
import com.viepos.backend.repositories.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
@Service
public class ProductPriceService {

    private final ProductRepository productRepository;

    public ProductPriceService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /** Gán 3 giá SP từ danh mục khi is_custom_price = false. */
    public void applyCategoryPrices(Product product, Category category) {
        if (product == null || category == null || Boolean.TRUE.equals(product.getIsCustomPrice())) {
            return;
        }
        product.setPriceTakeaway(safe(category.getDefaultPriceTakeaway()));
        product.setPricePackage4h(safe(category.getDefaultPricePackage4h()));
        product.setPricePackageFullday(safe(category.getDefaultPricePackageFullday()));
    }

    /** Cập nhật DB: mọi SP thuộc danh mục có is_custom_price = false. */
    @Transactional
    public int syncNonCustomProductsInCategory(Category category) {
        if (category == null || category.getId() == null) {
            return 0;
        }
        List<Product> products = productRepository.findByCategory_Id(category.getId());
        int updated = 0;
        for (Product product : products) {
            if (!Boolean.TRUE.equals(product.getIsCustomPrice())) {
                applyCategoryPrices(product, category);
                productRepository.save(product);
                updated++;
            }
        }
        return updated;
    }

    /** Giá hiển thị API: theo danh mục nếu không tự chỉnh giá. */
    public Map<String, Object> effectivePrices(Product product) {
        Map<String, Object> prices = new LinkedHashMap<>();
        Category cat = product.getCategory();
        boolean custom = Boolean.TRUE.equals(product.getIsCustomPrice());
        if (cat != null && !custom) {
            prices.put("priceTakeaway", safe(cat.getDefaultPriceTakeaway()));
            prices.put("pricePackage4h", safe(cat.getDefaultPricePackage4h()));
            prices.put("pricePackageFullday", safe(cat.getDefaultPricePackageFullday()));
        } else {
            prices.put("priceTakeaway", safe(product.getPriceTakeaway()));
            prices.put("pricePackage4h", safe(product.getPricePackage4h()));
            prices.put("pricePackageFullday", safe(product.getPricePackageFullday()));
        }
        return prices;
    }

    public BigDecimal priceFor(Product product, ServiceType serviceType) {
        Map<String, Object> prices = effectivePrices(product);
        ServiceType normalized = serviceType != null ? serviceType : ServiceType.TAKEAWAY;
        return switch (normalized) {
            case PACKAGE_4H, FOUR_HOURS -> safe((BigDecimal) prices.get("pricePackage4h"));
            case FULLTIME, FULL_DAY -> safe((BigDecimal) prices.get("pricePackageFullday"));
            case TAKEAWAY -> safe((BigDecimal) prices.get("priceTakeaway"));
        };
    }

    private static BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
