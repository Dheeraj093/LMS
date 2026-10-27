package com.example.LMS.repository;

import com.example.LMS.model.EmailVerificationToken;
import com.example.LMS.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Integer> {

    EmailVerificationToken findByTokenHash(String tokenHash);

    List<EmailVerificationToken> findByUserAndUsedAtIsNull(User user);
}
