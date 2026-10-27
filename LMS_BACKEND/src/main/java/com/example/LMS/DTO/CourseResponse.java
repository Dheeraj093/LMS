package com.example.LMS.DTO;

import java.util.List;

public record CourseResponse(
        Integer id,
        String title,
        String description,
        String thumbnail,
        Integer category,
        String categoryName,
        List<Integer> moduleIds,
        Boolean published,
        Integer teacherId,
        String teacherName,
        // New: shown on course cards.
        Double avgRating,
        Long reviewCount,
        Long enrollmentCount
) {
}
