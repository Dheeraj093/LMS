package com.example.LMS.service;

import com.example.LMS.exception.BadRequestException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// A database "find by ids" returns rows in any order. This puts them back in the order
// the teacher chose, and complains about ids that do not exist or belong to someone else.
final class OrderUtil {

    private OrderUtil() {
    }

    static <T> List<T> inRequestOrder(List<T> found, List<Integer> ids, Function<T, Integer> idOf, String what) {
        Map<Integer, T> byId = found.stream().collect(Collectors.toMap(idOf, t -> t, (a, b) -> a));
        List<T> ordered = new ArrayList<>();
        for (Integer id : new LinkedHashSet<>(ids)) {
            T item = byId.get(id);
            if (item == null) {
                throw new BadRequestException(what + " " + id + " does not exist or is not yours");
            }
            ordered.add(item);
        }
        return ordered;
    }
}
