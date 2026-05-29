package com.viepos.backend.repositories;

import com.viepos.backend.models.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findByCategoryCode(String categoryCode);
    Optional<Category> findByNameIgnoreCase(String name);
    List<Category> findAllByOrderByDisplayOrderAsc();
    List<Category> findByIsActiveTrueOrderByDisplayOrderAsc();
    boolean existsByNameIgnoreCase(String name);
}
