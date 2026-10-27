package com.example.LMS.service;

import com.example.LMS.DTO.AnnouncementRequest;
import com.example.LMS.DTO.AnnouncementResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Announcement;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.User;
import com.example.LMS.repository.AnnouncementRepository;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Course announcements: the course teacher (or an admin) writes, enrolled students read.
@Service
public class AnnouncementService {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private AccessService accessService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public AnnouncementResponse create(Integer courseId, AnnouncementRequest request) {
        User user = currentUserService.getCurrentUser();
        Course course = findCourse(courseId);
        accessService.checkCourseOwner(user, course);

        Announcement announcement = new Announcement();
        announcement.setCourse(course);
        announcement.setAuthor(user);
        apply(announcement, request);
        announcement = announcementRepository.save(announcement);

        // Tell every enrolled student; the bell link opens this announcement.
        String message = "New announcement in " + course.getTitle() + ": " + announcement.getTitle();
        for (Enrollment enrollment : enrollmentRepository.findByCourse(course)) {
            notificationService.notify(enrollment.getStudent(), NotificationType.ANNOUNCEMENT, message,
                    "/announcements?id=" + announcement.getId());
        }
        return toResponse(announcement, user);
    }

    // Enrolled students, the course teacher and admins.
    public List<AnnouncementResponse> getByCourse(Integer courseId) {
        User user = currentUserService.getCurrentUser();
        Course course = findCourse(courseId);
        if (!accessService.canViewCourseContent(user, course)) {
            throw new UnauthorizedAccessException("Enroll in this course to see its announcements");
        }
        return announcementRepository.findByCourseOrderByPinnedDescCreatedAtDesc(course).stream()
                .map(a -> toResponse(a, user)).toList();
    }

    // Student: from joined courses. Teacher: from own courses. Admin: all.
    public List<AnnouncementResponse> getMine() {
        User user = currentUserService.getCurrentUser();
        List<Announcement> list;
        if (currentUserService.isAdmin(user)) {
            list = announcementRepository.findAllByOrderByPinnedDescCreatedAtDesc();
        } else {
            List<Course> courses = currentUserService.isTeacher(user)
                    ? courseRepository.findByTeacher(user)
                    : enrollmentRepository.findByStudent(user).stream().map(Enrollment::getCourse).toList();
            list = courses.isEmpty() ? List.of() : announcementRepository.findByCourseInOrderByPinnedDescCreatedAtDesc(courses);
        }
        return list.stream().map(a -> toResponse(a, user)).toList();
    }

    @Transactional
    public AnnouncementResponse update(Integer id, AnnouncementRequest request) {
        User user = currentUserService.getCurrentUser();
        Announcement announcement = findAnnouncement(id);
        accessService.checkCourseOwner(user, announcement.getCourse());
        apply(announcement, request);
        return toResponse(announcementRepository.save(announcement), user);
    }

    public void delete(Integer id) {
        User user = currentUserService.getCurrentUser();
        Announcement announcement = findAnnouncement(id);
        accessService.checkCourseOwner(user, announcement.getCourse());
        announcementRepository.delete(announcement);
    }

    private void apply(Announcement announcement, AnnouncementRequest request) {
        announcement.setTitle(request.title().trim());
        announcement.setBody(request.body().trim());
        announcement.setPinned(Boolean.TRUE.equals(request.pinned()));
    }

    private Course findCourse(Integer courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("course not found with id " + courseId));
    }

    private Announcement findAnnouncement(Integer id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Announcement not found with id " + id));
    }

    private AnnouncementResponse toResponse(Announcement a, User viewer) {
        User author = a.getAuthor();
        return new AnnouncementResponse(a.getId(), a.getCourse().getId(), a.getCourse().getTitle(),
                author != null ? author.getId() : null, author != null ? author.getName() : null,
                author != null ? author.getAvatarUrl() : null,
                a.getTitle(), a.getBody(), Boolean.TRUE.equals(a.getPinned()), a.getCreatedAt(), a.getUpdatedAt(),
                currentUserService.isAdminOrOwner(viewer, a.getCourse().getTeacher()));
    }
}
