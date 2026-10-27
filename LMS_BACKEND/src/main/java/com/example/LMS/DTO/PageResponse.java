package com.example.LMS.DTO;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

// A simple, stable JSON shape for paged lists: { content, page, size, totalElements, totalPages }.
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
