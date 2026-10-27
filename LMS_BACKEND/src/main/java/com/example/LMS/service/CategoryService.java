package com.example.LMS.service;

import com.example.LMS.DTO.CategoryRequest;
import com.example.LMS.DTO.CategoryResponse;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.model.Category;
import com.example.LMS.repository.CategoryRepository;
import com.example.LMS.repository.CourseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CourseRepository courseRepository;

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getDescription());
    }

    public CategoryResponse addCategory(CategoryRequest categoryRequest) {
        // Bug fix: this check was "== null", so creating any NEW category failed.
        Category existCategory = categoryRepository.findByNameIgnoreCase(categoryRequest.name().trim());
        if (existCategory != null) {
            throw new ResourceAlreadyExistException("Category with name " + categoryRequest.name() + " already exists");
        }
        Category category = new Category();
        category.setName(categoryRequest.name().trim());
        category.setDescription(categoryRequest.description());
        return toResponse(categoryRepository.save(category));
    }

    public List<CategoryResponse> getAllCategories() {
        List<CategoryResponse> categoriesResponse = new ArrayList<>();
        for (Category category : categoryRepository.findAll()) {
            categoriesResponse.add(toResponse(category));
        }
        return categoriesResponse;
    }

    public CategoryResponse getCategoryById(Integer id) {
        return toResponse(findCategory(id));
    }

    public CategoryResponse updateCategory(Integer id, CategoryRequest categoryRequest) {
        Category category = findCategory(id);
        Category sameName = categoryRepository.findByNameIgnoreCase(categoryRequest.name().trim());
        if (sameName != null && !sameName.getId().equals(id)) {
            throw new ResourceAlreadyExistException("Category with name " + categoryRequest.name() + " already exists");
        }
        category.setName(categoryRequest.name().trim());
        category.setDescription(categoryRequest.description());
        return toResponse(categoryRepository.save(category));
    }

    public boolean deleteCategory(Integer id) {
        Category category = findCategory(id);
        // Before, deleting a category silently deleted all its courses. Now it is blocked.
        if (courseRepository.existsByCategory(category)) {
            throw new ResourceAlreadyExistException("This category still has courses. Move or delete them first");
        }
        categoryRepository.delete(category);
        return true;
    }

    private Category findCategory(Integer id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Category with id " + id + " not found"));
    }
}
