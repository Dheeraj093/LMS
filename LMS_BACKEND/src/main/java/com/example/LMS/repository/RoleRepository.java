package com.example.LMS.repository;

import com.example.LMS.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoleRepository extends JpaRepository<Role,Integer> {
    Role findByNameIgnoreCase(String name);
}
