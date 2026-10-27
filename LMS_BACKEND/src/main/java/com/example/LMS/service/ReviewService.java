package com.example.LMS.service;

import com.example.LMS.DTO.ReviewRequest;
import com.example.LMS.DTO.ReviewResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Course;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.Review;
import com.example.LMS.model.User;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private AccessService accessService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CurrentUserService currentUserService;

    // Only enrolled students can review. Writing again updates the student's earlier review.
    public ReviewResponse addOrUpdate(Integer courseId, ReviewRequest request) {
        User student = currentUserService.getCurrentUser();
        Course course = findCourse(courseId);
        if (!accessService.isEnrolled(student, course)) {
            throw new UnauthorizedAccessException("Enroll in this course before reviewing it");
        }
        Review review = reviewRepository.findByStudentAndCourse(student, course);
        boolean isNew = review == null;
        if (isNew) {
            review = new Review();
            review.setStudent(student);
            review.setCourse(course);
        }
        review.setRating(request.rating());
        review.setComment(request.comment() == null ? null : request.comment().trim());
        Review saved = reviewRepository.save(review);
        if (isNew) {
            notificationService.notify(course.getTeacher(), NotificationType.NEW_REVIEW,
                    student.getName() + " rated " + course.getTitle() + " " + request.rating() + "/5", "/courses/" + course.getId());
        }
        return toResponse(saved);
    }

    public List<ReviewResponse> getReviews(Integer courseId) {
        Course course = findCourse(courseId);
        return reviewRepository.findByCourseOrderByCreatedAtDesc(course).stream().map(this::toResponse).toList();
    }

    private ReviewResponse toResponse(Review r) {
        return new ReviewResponse(r.getId(), r.getCourse().getId(), r.getStudent().getId(), r.getStudent().getName(),
                r.getRating(), r.getComment(), r.getCreatedAt());
    }

    private Course findCourse(Integer courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course not found with id " + courseId));
    }
}
