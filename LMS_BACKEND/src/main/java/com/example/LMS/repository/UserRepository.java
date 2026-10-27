package com.example.LMS.repository;

import com.example.LMS.model.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    User findByName(String name);

    User findByEmail(String email);

    // Login should not fail because of capital letters in the email.
    User findByEmailIgnoreCase(String email);

    // Admin user list with optional filters. A null filter means "any".
    @Query("""
            select u from User u
            where (:roleName is null or upper(u.role.name) = :roleName)
              and (:status is null or u.status = :status)
              and (:search is null or lower(u.name) like :search or lower(u.email) like :search)
            """)
    Page<User> search(@Param("roleName") String roleName, @Param("status") UserStatus status,
                      @Param("search") String search, Pageable pageable);

    @Query("select upper(u.role.name), count(u) from User u group by upper(u.role.name)")
    List<Object[]> countByRole();
}
