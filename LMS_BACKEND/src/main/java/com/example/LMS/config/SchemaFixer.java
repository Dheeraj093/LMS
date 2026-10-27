package com.example.LMS.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

// Runs once at startup, before DataSeeder.
// Hibernate (ddl-auto=update) creates a CHECK on enum columns that lists the values known at that time,
// and never updates it. So a database made by older code refuses new notification types
// (for example ADDED_TO_GROUP). Java already makes sure only valid values are saved,
// so this check is removed. Same as step 3 of sql/upgrade-round3.sql; safe to run every time.
@Component
@Order(0)
public class SchemaFixer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaFixer.class);

    private final DataSource dataSource;

    public SchemaFixer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection connection = dataSource.getConnection()) {
            if (!"PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName())) {
                return;
            }
        } catch (Exception e) {
            log.warn("Could not check the database type: {}", e.getMessage());
            return;
        }
        try {
            new JdbcTemplate(dataSource).execute(
                    "ALTER TABLE IF EXISTS notification DROP CONSTRAINT IF EXISTS notification_type_check");
        } catch (Exception e) {
            log.warn("Could not remove notification_type_check: {}", e.getMessage());
        }
    }
}
